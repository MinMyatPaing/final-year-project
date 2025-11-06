from __future__ import annotations

import re
from typing import Dict, List, Tuple


# Basic, extendable keyword rules mapping a merchant/description to a category
# Keys are category names, values are lists of keyword patterns (case-insensitive)
CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "Groceries": [
        r"\btesco\b",
        r"\bsainsbury'?s\b",
        r"\basda\b",
        r"\bmorrisons\b",
        r"\bwaitrose\b",
        r"\baldi\b",
        r"\blidl\b",
        r"\bco-?op\b",
        r"\biceland\b",
    ],
    "Eating Out": [
        r"\bnando'?s\b",
        r"\bmc ?donald'?s\b",
        r"\bstarbucks\b",
        r"\bcosta\b",
        r"\bkfc\b",
        r"\bpret\b",
        r"\bwagamama\b",
        r"\bsubway\b",
        r"\bpizza\b",
        r"\brestaurant\b",
        r"\bcafe\b",
    ],
    "Transport": [
        r"\btfl\b",
        r"\btransport for london\b",
        r"\bnational rail\b",
        r"\btrainline\b",
        r"\buber\b",
        r"\bbolt\b",
        r"\bstagecoach\b",
        r"\bfirst bus\b",
        r"\broyal mail\b",
        r"\bparking\b",
    ],
    "Shopping": [
        r"\bamazon\b",
        r"\bargos\b",
        r"\bprimark\b",
        r"\bh&?m\b",
        r"\bboots\b",
        r"\buniqlo\b",
        r"\bdecathlon\b",
        r"\bapple\b",
        r"\bgoogle\b",
    ],
    "Bills": [
        r"\bou\b",
        r"\bbritish gas\b",
        r"\boctopus\b",
        r"\bthames water\b",
        r"\bvodafone\b",
        r"\bthree( uk)?\b",
        r"\bo2\b",
        r"\bvirgin media\b",
        r"\bsky\b",
        r"\bbt\b",
        r"\btv licence\b",
    ],
    "Entertainment": [
        r"\bnetflix\b",
        r"\bspotify\b",
        r"\bdisney\+?\b",
        r"\bplaystation\b",
        r"\bsteam\b",
        r"\bxbox\b",
        r"\bnintendo\b",
    ],
}


def categorize_merchant(description: str) -> Tuple[str, str]:
    """Return (category, matched_keyword) for a merchant/description.

    Falls back to "Other" when no rule matches.
    """
    text = description.lower()
    for category, patterns in CATEGORY_KEYWORDS.items():
        for pattern in patterns:
            if re.search(pattern, text, flags=re.IGNORECASE):
                return category, pattern
    return "Other", ""
