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

SYSTEM_PROMPT = """You are a financial transaction categorizer.
Categorize each transaction into one of these categories:
- Transportation (Uber, Lyft, gas stations, public transit, parking, car services)
- Eat Out (restaurants, cafes, fast food, food delivery)
- Groceries (supermarkets, grocery stores, food markets)
- Shopping (retail stores, online shopping, clothing, electronics)
- Entertainment (movies, concerts, streaming services, games)
- Bills & Utilities (electricity, water, internet, phone, rent)
- Healthcare (pharmacy, doctor, hospital, medical services)
- Education (tuition, books, school supplies, courses)
- Personal Care (haircuts, gym, spa, beauty services)
- Other (anything that doesn't fit the above categories)

For each transaction, return a JSON object with:
- All original fields (date, description, amount, balance)
- category: the category name
- merchant: the merchant name extracted from description

Return a JSON array of categorized transactions."""

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
