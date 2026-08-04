"""
llm.py
------------------------------------------------------------------------
Swappable LLM provider factory. `LLM_PROVIDER` selects which LangChain chat
model backs the whole app - every LangGraph node calls get_chat_model()
rather than importing a specific provider directly, so switching providers
is a one-line env change.
"""
from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel

from .config import settings


@lru_cache(maxsize=1)
def get_chat_model() -> BaseChatModel:
    provider = settings.llm_provider.lower()

    if provider == "groq":
        from langchain_groq import ChatGroq

        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not set but LLM_PROVIDER=groq")
        return ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key, temperature=0.2, streaming=True)

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set but LLM_PROVIDER=gemini")
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model, google_api_key=settings.gemini_api_key, temperature=0.2
        )

    if provider == "openrouter":
        from langchain_openai import ChatOpenAI

        if not settings.openrouter_api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not set but LLM_PROVIDER=openrouter")
        return ChatOpenAI(
            model=settings.openrouter_model,
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            temperature=0.2,
            streaming=True,
        )

    raise ValueError(f"Unknown LLM_PROVIDER: {provider!r} (expected groq | gemini | openrouter)")
