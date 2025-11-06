from __future__ import annotations

from typing import Any, Dict, List

from ..merchant_rules import categorize_merchant


def categorize_rules(state: Dict[str, Any]) -> Dict[str, Any]:
    categorized: List[Dict[str, Any]] = []
    pending: List[Dict[str, Any]] = []
    for t in state["spending_rows"]:
        category, matched = categorize_merchant(t["description"])
        row = {**t, "spent": abs(t["amount"])}
        if category == "Other":
            pending.append(row)
        else:
            categorized.append({**row, "category": category, "rule": matched})
    state["categorized"] = categorized
    state["pending"] = pending
    return state
