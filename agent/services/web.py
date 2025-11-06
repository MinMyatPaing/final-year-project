from __future__ import annotations

from typing import Optional

from duckduckgo_search import DDGS


def web_guess_category(merchant: str) -> Optional[str]:
    """Very small heuristic: search for the merchant and infer a category
    from the snippet/domain. Returns a category string or None.
    """
    query = f"{merchant} what is uk"
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                snippet = (r.get("body") or "") + " " + (r.get("title") or "")
                s = snippet.lower()
                if any(k in s for k in ["supermarket", "grocery", "groceries"]):
                    return "Groceries"
                if any(
                    k in s for k in ["restaurant", "cafe", "coffee", "eat", "diner"]
                ):
                    return "Eating Out"
                if any(
                    k in s
                    for k in [
                        "train",
                        "bus",
                        "tfl",
                        "tube",
                        "uber",
                        "taxi",
                        "transport",
                    ]
                ):
                    return "Transport"
                if any(
                    k in s
                    for k in ["retail", "shop", "shopping", "fashion", "clothing"]
                ):
                    return "Shopping"
                if any(
                    k in s
                    for k in [
                        "broadband",
                        "mobile",
                        "utilities",
                        "water",
                        "gas",
                        "electricity",
                    ]
                ):
                    return "Bills"
                if any(
                    k in s
                    for k in ["music", "streaming", "game", "cinema", "entertainment"]
                ):
                    return "Entertainment"
        return None
    except Exception:
        return None
