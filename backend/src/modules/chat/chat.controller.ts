/**
 * modules/chat/chat.controller.ts
 * --------------------------------------------------------------------------
 * `ask` streams the response as newline-delimited JSON (NDJSON):
 *   {"type":"chunk","content":"..."}\n
 *   ...
 *   {"type":"done","sources":[...],"suggestedQuestions":[...]}\n
 * or, on failure:
 *   {"type":"error","message":"..."}\n
 *
 * Plain `fetch()` + `response.body.getReader()` on the frontend reads this -
 * intentionally not EventSource/SSE, since EventSource can't send the POST
 * body this endpoint needs (sessionId + question).
 */
import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRepository } from './chat.repository';
import { DocumentsRepository } from '../documents/documents.repository';

const chatService = new ChatService(new ChatRepository(), new DocumentsRepository());

export const chatController = {
  async ask(req: Request, res: Response) {
    const { sessionId, question } = req.body;

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    const writeEvent = (event: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`${JSON.stringify(event)}\n`);
      }
    };

    try {
      const result = await chatService.ask(
        sessionId,
        question,
        (chunk) => writeEvent({ type: 'chunk', content: chunk }),
        abortController.signal,
      );
      writeEvent({ type: 'done', sources: result.sources, suggestedQuestions: result.suggestedQuestions });
    } catch (err) {
      writeEvent({ type: 'error', message: err instanceof Error ? err.message : 'Something went wrong' });
    } finally {
      res.end();
    }
  },

  async history(req: Request, res: Response) {
    const messages = await chatService.history(req.params.sessionId);
    res.status(200).json({ success: true, data: messages });
  },
};
