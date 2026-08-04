# Redis Pub/Sub Contract

The Node backend and the Python AI service **never call each other directly** — every AI operation crosses Redis Pub/Sub. This document is the source of truth for that contract; both `backend/src/queue/redisPubSub.ts` and `python-ai/app/redis_bus.py` implement it.

Two correlation patterns are used, depending on whether an HTTP caller is actively waiting for the result:

## 1. Chat (synchronous from the user's perspective — streaming)

A live streaming HTTP connection is open on the backend, so it **subscribes to the per-request response channel before publishing the request** — Redis Pub/Sub delivers only to subscribers connected at publish time, so subscribing first avoids a race where an early chunk gets dropped.

**Request** — backend publishes once to `chat:request`:
```json
{
  "requestId": "uuid",
  "sessionId": "client-generated-uuid",
  "question": "What is the refund policy?",
  "chatHistory": [
    { "question": "...", "answer": "..." }
  ]
}
```

**Response** — python-ai publishes *multiple* messages to `chat:response:{requestId}`, one per generated token/chunk, then a final message:
```json
{ "chunk": "The refund", "done": false }
{ "chunk": " policy allows...", "done": false }
{ "done": true, "sources": [{ "documentName": "policy.pdf", "page": 3 }], "suggestedQuestions": ["...", "..."] }
```
On failure: `{ "done": true, "error": "message" }`.

The backend re-streams these chunks to the frontend as a chunked `application/x-ndjson` HTTP response (not SSE/EventSource — the endpoint needs a POST body, which EventSource can't send). The subscription is torn down on `done`, on a timeout (`CHAT_REQUEST_TIMEOUT_MS`, default 60s), or immediately if the client disconnects (`req.on('close')`).

## 2. Document processing (fire-and-forget — no caller waiting)

The backend registers **one persistent `PSUBSCRIBE document:process:response:*`** at boot (not a per-request subscription) and updates MongoDB whenever a message arrives.

**Process request** — `document:process:request`:
```json
{ "documentId": "mongo-id", "filePath": "/absolute/path/to/file.pdf", "originalName": "Employee Handbook.pdf" }
```
Used for both the initial upload AND "Reprocess PDF" — python-ai purges any existing chunks for that `documentId` before re-embedding, so it's safe to call repeatedly.

**Process response** — `document:process:response:{documentId}`:
```json
{ "status": "completed", "pageCount": 12, "chunkCount": 47 }
```
or `{ "status": "failed", "error": "message" }`.

**Delete request** — `document:delete:request` (fire-and-forget; the backend deletes the Mongo record and disk file immediately without waiting for a response):
```json
{ "documentId": "mongo-id" }
```

## Known trade-off

Redis Pub/Sub (mandated by the assignment over Streams/queues) delivers only to currently-connected subscribers — if python-ai is momentarily down when a request is published, that request is silently lost. This is mitigated, not eliminated:
- **Chat**: the backend's request times out and returns a user-facing error to retry.
- **Documents**: a `staleDocumentReaper` (backend, runs every 60s) flips any `Document` stuck in `processing` past `STALE_DOCUMENT_TIMEOUT_MINUTES` to `failed`, so the admin UI never hangs indefinitely.

## Shared filesystem path

Uploaded PDF bytes are never sent over Redis — only the absolute file path (backend's `UPLOAD_DIR`). python-ai must run where that path is readable (the same machine as the backend, in local dev), and has its own `UPLOAD_DIR` setting used **only to validate containment**: every incoming `file_path` must resolve inside it, or the request is rejected. This matters because Redis channels have no per-message authentication — see the Security section in the root README for the threat this closes.
