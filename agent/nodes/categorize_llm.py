from __future__ import annotations

from typing import Any, Dict, List

from ..config import SETTINGS
from ..services.llm import categorize_with_llm


VALID_CATEGORIES = {
    "Groceries",
    "Eating Out",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Other",
}


def categorize_llm(state: Dict[str, Any]) -> Dict[str, Any]:
    if not SETTINGS.openai_api_key:
        # No LLM available; skip
        state["llm_used"] = False
        return state

    newly_categorized: List[Dict[str, Any]] = []
    still_pending: List[Dict[str, Any]] = []
    for t in state.get("pending", []):
        guess = categorize_with_llm(t.get("description", ""), t.get("description", ""))
        if guess and guess in VALID_CATEGORIES and guess != "Other":
            newly_categorized.append({**t, "category": guess, "rule": "llm"})
        else:
            still_pending.append(t)

    state["categorized"].extend(newly_categorized)
    state["pending"] = still_pending
    state["llm_used"] = True
    return state
