/**
 * queue/staleDocumentReaper.ts
 * --------------------------------------------------------------------------
 * Redis Pub/Sub has no acknowledgement/redelivery concept - if python-ai is
 * down or crashes while handling a document:process:request, the response
 * is simply never published and the Document sits in "processing" forever.
 * This reaper (same pattern as AItask_assignment's staleTaskReaper.ts) runs
 * on an interval and marks any Document that has been "processing" longer
 * than STALE_DOCUMENT_TIMEOUT_MINUTES as "failed", so the admin UI never
 * hangs indefinitely.
 */
import { DocumentModel } from '../models/Document.model';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const CHECK_INTERVAL_MS = 60 * 1000;

export function startStaleDocumentReaper(): NodeJS.Timeout {
  return setInterval(() => {
    void reapOnce().catch((err) => {
      // A transient DB hiccup here must never become an unhandled rejection
      // that escapes the interval callback - just log and try again next tick.
      logger.error('Stale document reaper tick failed', {
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }, CHECK_INTERVAL_MS);
}

async function reapOnce(): Promise<void> {
  const cutoff = new Date(Date.now() - env.staleDocumentTimeoutMinutes * 60 * 1000);
  const staleDocuments = await DocumentModel.find({ status: 'processing', updatedAt: { $lte: cutoff } });

  for (const document of staleDocuments) {
    document.status = 'failed';
    document.errorMessage = 'AI service timeout: processing did not complete in time';
    await document.save();
    logger.warn('Reaped stale document', { documentId: document._id.toString() });
  }
}
