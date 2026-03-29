from langchain_google_genai import ChatGoogleGenerativeAI
from core.config import get_settings
from functools import lru_cache


@lru_cache
def get_llm(temperature: float = 0.3) -> ChatGoogleGenerativeAI:
    s = get_settings()
    return ChatGoogleGenerativeAI(
        model=s.gemini_model,
        google_api_key=s.gemini_api_key,
        temperature=temperature,
    )
