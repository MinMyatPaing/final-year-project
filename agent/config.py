from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # LLM provider (currently OpenAI via openai-python)
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Web search toggle
    enable_web: bool = os.getenv("ENABLE_WEB", "1") not in ("0", "false", "False")


SETTINGS = Settings()
