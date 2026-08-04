# API Reference

Base URL: `http://localhost:4000/api`. All responses use the envelope `{ "success": true, "data": ... }` or `{ "success": false, "error": { "code", "message" } }`.

## Admin — Auth

### `POST /admin/auth/login`
Public (rate-limited: 10/15min). No self-registration — the admin account is created via `npm run seed-admin` from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

Request:
```json
{ "email": "admin@example.com", "password": "..." }
```
Response `data`:
```json
{ "accessToken": "jwt", "admin": { "id": "...", "name": "Admin", "email": "admin@example.com" } }
```
Send the token as `Authorization: Bearer <accessToken>` on every admin route below.

## Admin — Documents (all require `Authorization: Bearer <token>`)

### `POST /admin/documents`
`multipart/form-data`, field name `file`, PDF only, 20MB max. Creates a `Document` (status `processing`) and publishes `document:process:request`.

### `GET /admin/documents?search=&page=1&limit=20`
Response `data`: `{ items: DocumentRecord[], total, page, limit }`.

### `DELETE /admin/documents/:id`
Purges vectors (fire-and-forget), deletes the Mongo record and the file on disk.

### `POST /admin/documents/:id/reprocess`
Re-runs extract/chunk/embed for an existing file (safe to call repeatedly — python-ai purges old chunks for that document first).

## Admin — Dashboard

### `GET /admin/dashboard/stats`
Response `data`:
```json
{
  "totalDocuments": 3,
  "totalChatSessions": 12,
  "totalQuestionsAsked": 41,
  "recentDocuments": [ { "...": "DocumentRecord" } ]
}
```

## Admin — Monitoring

### `GET /admin/monitoring/stats`
Reads Redis keys python-ai writes on every LLM call and every FAISS index change (see `shared/redis-contract.md`) - no data of its own. Response `data`:
```json
{
  "llmUsage": { "totalCalls": 97, "callsToday": 12, "dailyLimit": 500, "byProvider": { "groq": 97 } },
  "vectorDb": { "totalVectors": 79, "indexedDocuments": 2, "embeddingModel": "sentence-transformers/all-MiniLM-L6-v2" }
}
```

## Admin — Reset

### `POST /admin/reset/all`
**Destructive, irreversible.** Deletes every document (Mongo record, file on disk, and FAISS vectors — via the same cascade as `DELETE /admin/documents/:id`, run once per document), all chat sessions/messages, and the LLM usage counters. Response `data`:
```json
{ "documentsDeleted": 3 }
```

## Public Chat (no auth)

### `POST /chat/ask`
Rate-limited: 10/min per client. Streams the response as newline-delimited JSON (`Content-Type: application/x-ndjson`) — read with `fetch()` + `response.body.getReader()`, **not** `EventSource` (which can't send a POST body).

Request:
```json
{ "sessionId": "client-generated-uuid", "question": "What is the refund policy?" }
```
Response body (one JSON object per line):
```
{"type":"chunk","content":"The refund"}
{"type":"chunk","content":" policy allows..."}
{"type":"done","sources":[{"documentName":"policy.pdf","page":3}],"suggestedQuestions":["...","..."]}
```
or, on failure: `{"type":"error","message":"..."}`.

### `GET /chat/history/:sessionId`
Response `data`: `ChatMessage[]`, oldest first.

## Errors
Common `error.code` values: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `UPSTREAM_TIMEOUT` (504 — python-ai didn't respond within `CHAT_REQUEST_TIMEOUT_MS`), `UPLOAD_ERROR` (400), `INTERNAL_ERROR` (500).
