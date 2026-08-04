/**
 * modules/monitoring/monitoring.service.ts
 * --------------------------------------------------------------------------
 * Reads infra-level introspection python-ai writes into Redis - the same
 * shared infra used for Pub/Sub, so this needs no new coupling between the
 * two services. Deliberately separate from dashboard.service.ts (knowledge
 * base content stats) since this is about the AI service's own operation
 * (LLM call volume, vector index size), not the knowledge base itself.
 *
 *  - LLM usage keys are written by python-ai/app/usage.py on every real
 *    call to the LLM provider (Groq/Gemini/OpenRouter).
 *  - Vector DB keys are written by python-ai/app/vector_store.py whenever
 *    the FAISS index changes (upload, delete, reprocess) and once at
 *    startup.
 */
import { redisPublisher } from '../../config/redis';

const LLM_CALLS_TOTAL_KEY = 'llm:calls:total';
const LLM_CALLS_BY_PROVIDER_KEY = 'llm:calls:by_provider';
const LLM_CALLS_BY_DAY_KEY = 'llm:calls:by_day';
const LLM_DAILY_LIMIT_KEY = 'llm:config:daily_limit';
const VECTOR_DB_STATS_KEY = 'vectordb:stats';

export interface LlmUsageStats {
  totalCalls: number;
  callsToday: number;
  dailyLimit: number | null;
  byProvider: Record<string, number>;
}

export interface VectorDbStats {
  totalVectors: number;
  indexedDocuments: number;
  embeddingModel: string | null;
}

export class MonitoringService {
  async stats(): Promise<{ llmUsage: LlmUsageStats; vectorDb: VectorDbStats }> {
    const [llmUsage, vectorDb] = await Promise.all([this.llmUsage(), this.vectorDb()]);
    return { llmUsage, vectorDb };
  }

  private async llmUsage(): Promise<LlmUsageStats> {
    const today = new Date().toISOString().slice(0, 10);
    const [total, byProvider, callsToday, dailyLimit] = await Promise.all([
      redisPublisher.get(LLM_CALLS_TOTAL_KEY),
      redisPublisher.hGetAll(LLM_CALLS_BY_PROVIDER_KEY),
      redisPublisher.hGet(LLM_CALLS_BY_DAY_KEY, today),
      redisPublisher.get(LLM_DAILY_LIMIT_KEY),
    ]);

    return {
      totalCalls: Number(total) || 0,
      callsToday: Number(callsToday) || 0,
      dailyLimit: dailyLimit ? Number(dailyLimit) : null,
      byProvider: Object.fromEntries(Object.entries(byProvider).map(([provider, count]) => [provider, Number(count) || 0])),
    };
  }

  private async vectorDb(): Promise<VectorDbStats> {
    const stats = await redisPublisher.hGetAll(VECTOR_DB_STATS_KEY);
    return {
      totalVectors: Number(stats.totalVectors) || 0,
      indexedDocuments: Number(stats.indexedDocuments) || 0,
      embeddingModel: stats.embeddingModel || null,
    };
  }
}
