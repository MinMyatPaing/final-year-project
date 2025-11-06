from __future__ import annotations

from typing import Any, Dict


def aggregate(state: Dict[str, Any]) -> Dict[str, Any]:
    breakdown: Dict[str, Dict[str, Any]] = {}
    total_spent = 0.0
    for t in state.get("categorized", []):
        cat = t["category"]
        spent = float(t["spent"]) if "spent" in t else abs(float(t["amount"]))
        total_spent += spent
        if cat not in breakdown:
            breakdown[cat] = {"total": 0.0, "count": 0}
        breakdown[cat]["total"] += spent
        breakdown[cat]["count"] += 1

    for v in breakdown.values():
        v["total"] = round(v["total"], 2)
        v["percentage"] = round(
            (v["total"] / total_spent * 100) if total_spent else 0.0, 1
        )

    state["breakdown"] = dict(
        sorted(breakdown.items(), key=lambda kv: kv[1]["total"], reverse=True)
    )
    state["total_spent"] = round(total_spent, 2)
    state["uncategorized_count"] = len(state.get("pending", []))
    return state
