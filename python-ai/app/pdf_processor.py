"""
pdf_processor.py
------------------------------------------------------------------------
Extract -> chunk -> embed -> store, for one PDF. Each document:process:
request already runs as its own asyncio task (see redis_bus.listen_channel),
so concurrent uploads process in parallel without extra plumbing here.
"""
import logging
import os

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import settings
from .vector_store import add_chunks, delete_document_vectors

logger = logging.getLogger("pdf_processor")


def _is_within_upload_dir(file_path: str) -> bool:
    """
    Redis Pub/Sub messages have no per-message authentication - normally
    only the backend can reach Redis, but if that assumption is ever
    violated (misconfigured network, compromised service), a forged
    document:process:request could otherwise point file_path at ANY file
    this process can read (e.g. a sensitive local .pdf), have it embedded
    into the shared vector index, and exfiltrate its contents through the
    public chat endpoint. Resolving both paths and checking containment
    closes that off regardless of where the message actually came from.
    """
    upload_root = os.path.realpath(settings.upload_dir)
    candidate = os.path.realpath(file_path)
    try:
        return os.path.commonpath([upload_root, candidate]) == upload_root
    except ValueError:
        # Windows raises ValueError instead of just returning "no common
        # path" when the two paths are on different drives (e.g. C:\ vs
        # F:\) - that's exactly a "not contained" case, not an error.
        return False


async def process_document(document_id: str, file_path: str, original_name: str) -> dict:
    """
    Returns a dict matching the document:process:response:{documentId}
    contract: {status, pageCount, chunkCount, error?}.
    """
    if not file_path.lower().endswith('.pdf') or not os.path.isfile(file_path):
        return {"status": "failed", "error": "Uploaded file path is missing or not a .pdf file"}

    if not _is_within_upload_dir(file_path):
        logger.error("Rejected file_path outside upload_dir: %s", file_path)
        return {"status": "failed", "error": "File path is not within the allowed upload directory"}

    # Purge any existing chunks for this documentId first - makes this
    # function safe to call again for "Reprocess PDF" without duplicating
    # vectors.
    delete_document_vectors(document_id)

    try:
        # extraction_mode="layout" (not the pypdf default "plain") preserves
        # the PDF's visual spacing between text runs. Some PDFs (seen on
        # resume templates in particular) position each word as its own
        # glyph run with no explicit space character between them - "plain"
        # mode then glues them into unreadable run-ons like
        # "B.TechElectronics&CommunicationEngineering2019", which both
        # embeds poorly (tanking retrieval ranking) and confuses the LLM
        # even when it IS retrieved. "layout" reconstructs spacing from the
        # glyphs' actual on-page positions instead.
        loader = PyPDFLoader(file_path, extraction_mode="layout")
        pages = loader.load()  # one Document per page, metadata includes 'page' (0-indexed)
        page_count = len(pages)

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )
        chunks = splitter.split_documents(pages)

        for i, chunk in enumerate(chunks):
            page = chunk.metadata.get("page", 0)
            chunk.metadata = {
                "documentId": document_id,
                "fileName": original_name,
                "page": page + 1,  # 1-indexed for display to end users
                "chunkIndex": i,
            }

        add_chunks(document_id, chunks)

        return {"status": "completed", "pageCount": page_count, "chunkCount": len(chunks)}
    except Exception as exc:
        logger.exception("Failed to process document %s", document_id)
        return {"status": "failed", "error": str(exc)}
