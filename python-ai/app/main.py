"""
main.py
------------------------------------------------------------------------
FastAPI app whose real job is running three background Redis Pub/Sub
subscribers (chat, document processing, document deletion) - the HTTP
surface is just /health for liveness. The Node backend never calls this
service over HTTP; all AI work is driven by Pub/Sub messages, per the
assignment's mandatory architecture.
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .graph import run_chat
from .pdf_processor import process_document
from .redis_bus import listen_channel, publish
from .vector_store import delete_document_vectors

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("main")

_background_tasks: list[asyncio.Task] = []


async def handle_chat_request(payload: dict) -> None:
    request_id = payload["requestId"]
    response_channel = f"chat:response:{request_id}"

    async def on_chunk(piece: str) -> None:
        await publish(response_channel, {"chunk": piece, "done": False})

    try:
        result = await run_chat(
            question=payload["question"],
            session_id=payload["sessionId"],
            chat_history=payload.get("chatHistory", []),
            on_chunk=on_chunk,
        )
        await publish(
            response_channel,
            {"done": True, "sources": result["sources"], "suggestedQuestions": result["suggestedQuestions"]},
        )
    except Exception as exc:
        logger.exception("Chat request %s failed", request_id)
        await publish(response_channel, {"done": True, "error": str(exc)})


async def handle_document_process_request(payload: dict) -> None:
    document_id = payload["documentId"]
    file_path = payload["filePath"]
    original_name = payload.get("originalName") or file_path

    try:
        result = await process_document(document_id, file_path, original_name)
    except Exception as exc:
        # process_document() already catches its own extraction/embedding
        # errors and returns {"status": "failed", ...} - this branch only
        # catches something failing OUTSIDE that (e.g. the pre-flight vector
        # purge). Without this, the document would sit in "processing" for
        # the full staleDocumentReaper timeout instead of failing instantly.
        logger.exception("Document process request %s failed unexpectedly", document_id)
        result = {"status": "failed", "error": str(exc)}

    await publish(f"document:process:response:{document_id}", result)


async def handle_document_delete_request(payload: dict) -> None:
    document_id = payload["documentId"]
    try:
        delete_document_vectors(document_id)
        logger.info("Purged vectors for deleted document %s", document_id)
    except Exception:
        # Fire-and-forget from the backend's perspective (it already deleted
        # the Mongo record and file), so there's no response channel to
        # report failure on - just log it. Worst case is an orphaned vector
        # left in the FAISS index, a data-hygiene issue, not a hung state.
        logger.exception("Failed to purge vectors for deleted document %s", document_id)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _background_tasks.append(asyncio.create_task(listen_channel("chat:request", handle_chat_request)))
    _background_tasks.append(
        asyncio.create_task(listen_channel("document:process:request", handle_document_process_request))
    )
    _background_tasks.append(
        asyncio.create_task(listen_channel("document:delete:request", handle_document_delete_request))
    )
    logger.info("python-ai Redis Pub/Sub subscribers started")

    yield

    for task in _background_tasks:
        task.cancel()


app = FastAPI(title="PDF RAG Chatbot - AI Service", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"success": True, "data": {"status": "ok"}}
