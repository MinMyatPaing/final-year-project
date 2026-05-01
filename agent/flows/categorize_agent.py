"""
Categorization Flow — LangGraph Workflow
Uses Claude Haiku 4.5 to batch-categorize transactions into spending groups.
"""

import json
import re
import os
from typing import TypedDict, List, Dict, Any

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END

load_dotenv()

# ─── Constants ────────────────────────────────────────────────────────────────

BATCH_SIZE = 10

SYSTEM_PROMPT = """You are a financial transaction categorizer for a UK student budgeting app.
Categorize each transaction into EXACTLY one of these ten categories (use the exact label):

- Groceries (supermarkets, grocery stores, food markets — e.g. Tesco, Sainsbury's, Lidl, Aldi, Waitrose, M&S Food)
- Eating Out (restaurants, cafes, fast food, takeaways, food delivery — e.g. McDonald's, Costa Coffee, Deliveroo, Uber Eats, Pret, Greggs)
- Transport (trains, buses, Uber, taxis, petrol, parking, car services — e.g. TfL, National Rail, Uber)
- Entertainment (streaming services, cinema, concerts, games, events — e.g. Netflix, Spotify, Amazon Prime, Vue)
- Shopping (retail stores, online shopping, clothing, electronics — e.g. Amazon, ASOS, Primark, H&M, Apple, Argos)
- Education (tuition fees, textbooks, stationery, online courses — e.g. university fees, Audible, Coursera)
- Bills & Utilities (rent, electricity, gas, water, broadband, phone, TV licence, council tax, insurance)
- Healthcare (pharmacy, GP, dentist, hospital, optician, gym membership — e.g. Boots, Lloyds Pharmacy)
- Personal Care (haircuts, beauty salon, spa, toiletries — e.g. barber, Superdrug)
- Other (transfers, ATM cash withdrawals, or anything that does not fit the categories above)

For each transaction return a JSON object with:
- All original fields (date, description, amount, balance)
- category: the category label (must be one of the ten listed above, spelled exactly)
- merchant: the merchant name extracted from the description (short, human-readable)

Return a JSON array of categorized transactions. No other text."""

# ─── LLM (module-level singleton) ────────────────────────────────────────────

llm = ChatAnthropic(
    model="claude-haiku-4-5-20251001",
    anthropic_api_key=os.getenv("CLAUDE_API_KEY"),
    temperature=0.1,
    max_tokens=4096,
)

# ─── State ────────────────────────────────────────────────────────────────────

class CategorizationState(TypedDict):
    transactions: List[Dict[str, Any]]
    categorized_transactions: List[Dict[str, Any]]
    error: str


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _fallback_batch(batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Return transactions with 'Other' category when LLM parsing fails."""
    return [
        {**t, "category": "Other", "merchant": t.get("description", "Unknown")[:50]}
        for t in batch
    ]


def _parse_llm_json(response_text: str, batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract a JSON array from the LLM response, with fallback."""
    # Try to find a JSON array in the response
    json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
    if json_match:
        try:
            result = json.loads(json_match.group())
            return result if isinstance(result, list) else [result]
        except json.JSONDecodeError:
            pass

    # Try parsing the whole response as JSON
    try:
        result = json.loads(response_text)
        return result if isinstance(result, list) else [result]
    except json.JSONDecodeError:
        return _fallback_batch(batch)


# ─── Node ─────────────────────────────────────────────────────────────────────

def categorize_transaction(state: CategorizationState) -> CategorizationState:
    """Batch-categorize all transactions using Claude 3.5 Haiku."""
    if state.get("error"):
        return state

    try:
        transactions = state["transactions"]
        categorized = []

        for i in range(0, len(transactions), BATCH_SIZE):
            batch = transactions[i : i + BATCH_SIZE]

            transactions_text = "\n".join(
                f"- {t.get('description', 'N/A')} | Amount: {t.get('amount', 0)} | Date: {t.get('date', 'N/A')}"
                for t in batch
            )

            user_prompt = (
                f"Categorize these transactions:\n{transactions_text}\n\n"
                "Return only a valid JSON array, no other text."
            )

            response = llm.invoke([
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ])

            batch_categorized = _parse_llm_json(response.content, batch)
            categorized.extend(batch_categorized)

        # Deduplicate by (description, date) and fill in any missing transactions
        final = []
        seen: set = set()

        for t in categorized:
            key = (t.get("description", ""), t.get("date", ""))
            if key not in seen:
                seen.add(key)
                final.append(t)

        for t in transactions:
            key = (t.get("description", ""), t.get("date", ""))
            if key not in seen:
                seen.add(key)
                final.append({**t, "category": "Other", "merchant": t.get("description", "Unknown")[:50]})

        state["categorized_transactions"] = final

    except Exception as e:
        state["error"] = f"Error categorizing transactions: {str(e)}"
        import traceback
        traceback.print_exc()

    return state


# ─── Graph ────────────────────────────────────────────────────────────────────

def create_categorization_workflow():
    """Build and compile the categorization LangGraph workflow."""
    workflow = StateGraph(CategorizationState)
    workflow.add_node("categorize", categorize_transaction)
    workflow.set_entry_point("categorize")
    workflow.add_edge("categorize", END)
    return workflow.compile()


# ─── Public API ───────────────────────────────────────────────────────────────

def categorize_transactions(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Run the categorization workflow and return the categorized transactions.

    Args:
        transactions: List of transaction dicts (date, description, amount, balance).

    Returns:
        Same list with 'category' and 'merchant' fields added to each entry.

    Raises:
        Exception: If the LangGraph workflow encounters an unrecoverable error.
    """
    app = create_categorization_workflow()

    final_state = app.invoke({
        "transactions": transactions,
        "categorized_transactions": [],
        "error": "",
    })

    if final_state.get("error"):
        raise Exception(final_state["error"])

    return final_state["categorized_transactions"]
