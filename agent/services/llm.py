from __future__ import annotations

from typing import Optional

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import SETTINGS


def _client() -> Optional[OpenAI]:
    if not SETTINGS.openai_api_key:
        return None
    return OpenAI(api_key=SETTINGS.openai_api_key)


SYSTEM_PROMPT = (
    "You categorize merchants from UK bank statements into one of these "
    "categories: Groceries, Eating Out, Transport, Shopping, Bills, Entertainment, Other. "
    "Respond with only the category name."
)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.5, max=4))
def categorize_with_llm(merchant: str, description: str) -> Optional[str]:
    client = _client()
    if client is None:
        return None
    msg = f"Merchant: {merchant}\nDescription: {description}\nCategory:"
    try:
        resp = client.chat.completions.create(
            model=SETTINGS.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": msg},
            ],
            temperature=0.0,
            max_tokens=8,
        )
        text = (resp.choices[0].message.content or "").strip()
        if not text:
            return None
        return text.splitlines()[0].strip()
    except Exception:
        return None
