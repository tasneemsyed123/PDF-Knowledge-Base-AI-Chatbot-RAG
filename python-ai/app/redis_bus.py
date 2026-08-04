"""
redis_bus.py
------------------------------------------------------------------------
Thin async Redis Pub/Sub helpers. This is the ONLY module that touches the
`redis` library directly - everything else calls `publish()` /
`listen_channel()`. See shared/redis-contract.md for the full channel and
message contract with the Node backend.
"""
import asyncio
import json
import logging
from typing import Awaitable, Callable

import redis.asyncio as redis

from .config import settings

logger = logging.getLogger("redis_bus")

_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.redis_url, decode_responses=True)
    return _client


async def publish(channel: str, payload: dict) -> None:
    client = get_redis()
    await client.publish(channel, json.dumps(payload))


async def _safe_handle(handler: Callable[[dict], Awaitable[None]], payload: dict) -> None:
    try:
        await handler(payload)
    except Exception:
        logger.exception("Message handler raised an exception")


async def listen_channel(channel: str, handler: Callable[[dict], Awaitable[None]]) -> None:
    """
    Subscribes to a fixed channel forever. Each message is dispatched to
    `handler` as a fire-and-forget task so a slow request (e.g. streaming an
    LLM answer) never blocks the subscribe loop from picking up the next one.
    """
    client = get_redis()
    pubsub = client.pubsub()
    await pubsub.subscribe(channel)
    logger.info("Subscribed to channel %s", channel)

    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            payload = json.loads(message["data"])
        except (TypeError, json.JSONDecodeError):
            logger.warning("Malformed message on %s: %r", channel, message.get("data"))
            continue
        asyncio.create_task(_safe_handle(handler, payload))
