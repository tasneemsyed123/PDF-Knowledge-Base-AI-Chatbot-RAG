"""
config.py
------------------------------------------------------------------------
Single source of truth for environment configuration (pydantic-settings).
Model names are env-configurable rather than hardcoded, since LLM provider
lineups change faster than this codebase will.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    redis_url: str = "redis://localhost:6380"

    # The backend always sends the absolute file path directly in the
    # document:process:request message (see shared/redis-contract.md), so
    # this is NOT used to compute paths - it's used to CONTAIN them. Every
    # incoming file_path is checked to actually resolve inside this
    # directory before it's opened, so a forged/malformed Redis message
    # can't be used to read arbitrary files off this host (Redis has no
    # per-message auth - see README's Security section). Must match the
    # backend's UPLOAD_DIR.
    upload_dir: str = "../storage/uploads"

    # FAISS (not ChromaDB - chroma-hnswlib ships no prebuilt Windows wheel and
    # needs a C++ compiler to build from source; faiss-cpu does ship one, and
    # the assignment lists FAISS as an equally acceptable free vector DB).
    faiss_persist_dir: str = "./faiss_index"

    # Free, local, no API key - keeps the vector DB fully offline/free.
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    chunk_size: int = 1000
    chunk_overlap: int = 150
    retrieval_top_k: int = 8

    llm_provider: str = "groq"  # groq | gemini | openrouter

    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.1-8b-instruct:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Soft cap surfaced on the admin dashboard so usage against the
    # provider's free-tier request quota can be monitored. Not enforced
    # here - crossing it doesn't block requests, it just turns the
    # dashboard's usage panel amber/red.
    llm_daily_call_limit: int = 500


settings = Settings()
