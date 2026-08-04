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


def retrieve(question: str, k: Optional[int] = None):
    store = _get_store()
    if store is None:
        return []
    return store.similarity_search(question, k=k or settings.retrieval_top_k)


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
