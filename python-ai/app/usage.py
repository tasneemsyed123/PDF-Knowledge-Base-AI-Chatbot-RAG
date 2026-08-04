"""
usage.py
------------------------------------------------------------------------
Tracks how many real LLM API calls this service makes (to Groq/Gemini/
OpenRouter), broken down by provider and by day, in Redis - infra already
shared with the Node backend, which reads these same keys to power the
admin dashboard's "AI API usage" panel. An in-process counter would reset
every time uvicorn --reload restarts, so Redis is the only place these
survive.
"""
import datetime

from .config import settings
from .redis_bus import get_redis

TOTAL_KEY = "llm:calls:total"
BY_PROVIDER_KEY = "llm:calls:by_provider"
BY_DAY_KEY = "llm:calls:by_day"
DAILY_LIMIT_KEY = "llm:config:daily_limit"


async def record_llm_call() -> None:
    """Called immediately before every real network call to the LLM provider."""
    client = get_redis()
    provider = settings.llm_provider.lower()
    # UTC, not local date - must match the Node backend's `toISOString().slice(0, 10)`
    # when it reads this same key, or "today" silently drifts near midnight.
    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    async with client.pipeline() as pipe:
        pipe.incr(TOTAL_KEY)
        pipe.hincrby(BY_PROVIDER_KEY, provider, 1)
        pipe.hincrby(BY_DAY_KEY, today, 1)
        await pipe.execute()


async def publish_daily_limit() -> None:
    """
    Run once at startup so the Node backend can read the configured cap
    without needing its own copy of this env var - python-ai owns the
    provider/plan knowledge, the dashboard just displays it.
    """
    client = get_redis()
    await client.set(DAILY_LIMIT_KEY, settings.llm_daily_call_limit)
