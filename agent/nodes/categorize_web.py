from __future__ import annotations

from typing import Any, Dict, List

from ..config import SETTINGS
from ..services.web import web_guess_category


def categorize_web(state: Dict[str, Any]) -> Dict[str, Any]:
    if not SETTINGS.enable_web:
        return state

    newly_categorized: List[Dict[str, Any]] = []
    still_pending: List[Dict[str, Any]] = []
    for t in state.get("pending", []):
        guess = web_guess_category(t.get("description", ""))
        if guess and guess != "Other":
            newly_categorized.append({**t, "category": guess, "rule": "web"})
        else:
            still_pending.append(t)

    state["categorized"].extend(newly_categorized)
    state["pending"] = still_pending
    return state
