"""
vector_store.py
------------------------------------------------------------------------
FAISS is owned exclusively by python-ai - the Node backend never touches
vectors directly, only document metadata in Mongo. Chosen over ChromaDB
because chroma-hnswlib ships no prebuilt Windows wheel (requires a C++
compiler to build from source) while faiss-cpu does - the assignment lists
both as acceptable free vector DBs.

FAISS's LangChain wrapper has no server-side "where filter" delete like
Chroma, so a small sidecar JSON file tracks {documentId: [chunk ids]} to
support deleting/reprocessing a single document's vectors.
"""
import json
import os
import re
import threading
from typing import Optional

from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

from .config import settings
from .redis_bus import get_redis

_lock = threading.Lock()
_store: Optional[FAISS] = None
_embeddings: Optional[HuggingFaceEmbeddings] = None


def _ids_file() -> str:
    return os.path.join(settings.faiss_persist_dir, "doc_chunk_ids.json")


def get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model)
    return _embeddings


def _load_ids_map() -> dict:
    path = _ids_file()
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_ids_map(ids_map: dict) -> None:
    os.makedirs(settings.faiss_persist_dir, exist_ok=True)
    with open(_ids_file(), "w", encoding="utf-8") as f:
        json.dump(ids_map, f)


def _get_store() -> Optional[FAISS]:
    """Returns the loaded FAISS store, or None if nothing has been indexed yet."""
    global _store
    if _store is not None:
        return _store
    index_file = os.path.join(settings.faiss_persist_dir, "index.faiss")
    if os.path.exists(index_file):
        # allow_dangerous_deserialization is required because FAISS.load_local
        # unpickles the docstore (index.pkl). This is only "dangerous" for
        # files from an untrusted source; ours is written exclusively by this
        # same process (add_chunks below) and never derived from user input,
        # so the trust boundary is "does an attacker already have filesystem
        # write access here" - at that point pickle deserialization isn't the
        # weak link.
        _store = FAISS.load_local(
            settings.faiss_persist_dir, get_embeddings(), allow_dangerous_deserialization=True
        )
    return _store


def add_chunks(document_id: str, chunks: list) -> None:
    """Embeds and persists `chunks` (already tagged with documentId/fileName/page metadata)."""
    if not chunks:
        return
    with _lock:
        ids = [f"{document_id}:{i}" for i in range(len(chunks))]
        store = _get_store()
        if store is None:
            store = FAISS.from_documents(chunks, get_embeddings(), ids=ids)
        else:
            store.add_documents(chunks, ids=ids)

        global _store
        _store = store
        os.makedirs(settings.faiss_persist_dir, exist_ok=True)
        store.save_local(settings.faiss_persist_dir)

        ids_map = _load_ids_map()
        ids_map[document_id] = ids
        _save_ids_map(ids_map)


def delete_document_vectors(document_id: str) -> None:
    """Purges every chunk belonging to a document - used on delete AND before reprocess."""
    with _lock:
        store = _get_store()
        ids_map = _load_ids_map()
        ids = ids_map.pop(document_id, [])
        if store is not None and ids:
            store.delete(ids=ids)
            store.save_local(settings.faiss_persist_dir)
        _save_ids_map(ids_map)


def _significant_words(text: str) -> set[str]:
    """Lowercased alphabetic words of 4+ letters - long enough to be a
    meaningful topic/filename word, short words like "the" or a stray "pdf"
    would match almost anything and defeat the point."""
    return {w.lower() for w in re.findall(r"[a-zA-Z]{4,}", text)}


def _matching_document_names(question: str, document_names: list[str]) -> list[str]:
    """Documents a question appears to name directly, e.g. "the resume" for
    "tasneem_resume1(1).pdf" - matched by shared significant words rather
    than substring, so it's not thrown off by punctuation/casing/numbering
    in the filename."""
    question_words = _significant_words(question)
    if not question_words:
        return []
    matches = []
    for name in document_names:
        base_name = re.sub(r"\.pdf$", "", name, flags=re.IGNORECASE)
        if question_words & _significant_words(base_name):
            matches.append(name)
    return matches


def retrieve(question: str, document_names: Optional[list[str]] = None, k: Optional[int] = None) -> list:
    store = _get_store()
    if store is None:
        return []

    k = k or settings.retrieval_top_k

    # Hybrid, not pure MMR: half the slots are the top chunks by raw
    # relevance, GUARANTEED regardless of diversity - verified empirically
    # that pure MMR can drop a genuinely relevant top-4-by-similarity chunk
    # because it looked "too similar" to another selected chunk, even
    # though both covered different fields on the same form (registration
    # number vs. engine number on an insurance schedule) and were both
    # needed. MMR still fills the remaining slots for diversity, which is
    # what fixes the ORIGINAL problem this replaced plain top-k for: several
    # near-duplicate chunks from the same page crowding out everything else
    # (also verified empirically - a query once returned the same page
    # twice among only 8 plain-top-k results). No single lambda_mult value
    # reliably satisfies both cases at once, so guarantee one and let MMR
    # optimize the other.
    guaranteed_k = max(1, k // 2)
    top_by_relevance = store.similarity_search(question, k=guaranteed_k)
    mmr_results = store.max_marginal_relevance_search(question, k=k, fetch_k=k * 4, lambda_mult=0.5)

    seen = set()
    results = []
    for d in top_by_relevance + mmr_results:
        key = (d.metadata.get("documentId"), d.metadata.get("chunkIndex"))
        if key in seen:
            continue
        seen.add(key)
        results.append(d)
        if len(results) == k:
            break

    # A vague/meta question naming a specific document by (part of) its
    # filename - "tell me about the resume", "more info on the resume
    # document" - should always surface THAT document's own chunks. Plain
    # top-k similarity can fail this badly in an imbalanced corpus: a
    # 74-chunk standard can statistically crowd every slot out of a 5-chunk
    # resume's reach for a query that doesn't share much vocabulary with
    # either document, even though the resume is clearly the intended
    # target. Filename-matched documents get their own scoped search
    # merged in as a guarantee, on top of (not instead of) normal retrieval.
    if document_names:
        present = {d.metadata.get("fileName") for d in results}
        for name in _matching_document_names(question, document_names):
            if name in present:
                continue
            results.extend(store.similarity_search(question, k=3, filter={"fileName": name}))
            present.add(name)

    return results


def get_stats() -> dict:
    store = _get_store()
    ids_map = _load_ids_map()
    return {
        "totalVectors": int(store.index.ntotal) if store is not None else 0,
        "indexedDocuments": len(ids_map),
        "embeddingModel": settings.embedding_model,
    }


async def publish_stats() -> None:
    """
    Refreshes the vector-db snapshot in Redis so the admin dashboard's
    monitoring page can show it without python-ai needing an HTTP surface -
    Redis is already the shared read path (see usage.py for the same
    pattern with LLM call counts). Call after anything that changes the
    index (upload, delete, reprocess) and once at startup.
    """
    stats = get_stats()
    client = get_redis()
    await client.hset(
        "vectordb:stats",
        mapping={
            "totalVectors": stats["totalVectors"],
            "indexedDocuments": stats["indexedDocuments"],
            "embeddingModel": stats["embeddingModel"],
        },
    )
