"""
Vector Store — Pinecone + OpenAI text-embedding-3-small (1536 dims).

Each user's data is stored in their own Pinecone namespace so queries
are automatically scoped to that user with zero metadata filtering.

Vector ID scheme:
  Transactions  →  {user_id}_{transaction_id}
  User profile  →  {user_id}_profile

Text format embedded per transaction:
  "£12.99 debit at Netflix on 01 Apr 2026. Category: Entertainment. Balance: £543.21."

Text format embedded per user profile:
  "Student profile for Alice, studying at University of Huddersfield (3rd Year).
   Monthly income: £900. Monthly spending budget goal: £600."
"""

import os
import logging
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone

load_dotenv()

logger = logging.getLogger(__name__)

EMBED_MODEL = "text-embedding-3-small"
EMBED_DIM   = 1536
BATCH_SIZE  = 100

# ─── Lazy-loaded clients ──────────────────────────────────────────────────────

_oai_client = None
_pc_index   = None


def _oai() -> OpenAI:
    global _oai_client
    if _oai_client is None:
        _oai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _oai_client


def _index():
    global _pc_index
    if _pc_index is None:
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        _pc_index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "student-budgeting-final-year"))
    return _pc_index


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _fmt_date(raw: Any) -> str:
    if raw is None:
        return "unknown date"
    if hasattr(raw, "strftime"):
        return raw.strftime("%d %b %Y")
    s = str(raw)
    return s[:10] if len(s) >= 10 else s


def _transaction_to_text(t: dict) -> str:
    """Build a rich natural-language sentence for a transaction."""
    amount    = float(t.get("amount", 0))
    direction = "credit" if amount >= 0 else "debit"
    abs_amt   = abs(amount)
    date      = _fmt_date(t.get("date"))
    merchant  = (t.get("merchant") or t.get("description") or "Unknown")[:80]
    category  = t.get("category") or "Other"
    balance   = t.get("balance")
    desc      = (t.get("description") or "")[:120]

    text = f"£{abs_amt:.2f} {direction} at {merchant} on {date}. Category: {category}."
    if balance is not None:
        text += f" Balance after: £{float(balance):.2f}."
    if desc and desc.strip().lower() != merchant.strip().lower():
        text += f" Description: {desc}."
    return text


def _user_profile_to_text(user: dict) -> str:
    """Build a natural-language sentence describing a student's profile."""
    name       = user.get("name", "User")
    university = (user.get("university") or "").strip()
    year       = (user.get("yearOfStudy") or "").strip()
    income     = float(user.get("monthlyIncome", 0) or 0)
    goal       = float(user.get("monthlySpendingGoal", 0) or 0)

    text = f"Student profile for {name}"
    if university:
        text += f", studying at {university}"
    if year:
        text += f" ({year})"
    text += "."
    if income > 0:
        text += f" Monthly income: £{income:.0f}."
    if goal > 0:
        text += f" Monthly spending budget goal: £{goal:.0f}."
    return text


def _embed_batch(texts: list[str]) -> list[list[float]]:
    resp = _oai().embeddings.create(input=texts, model=EMBED_MODEL)
    return [item.embedding for item in resp.data]


# ─── Public API ───────────────────────────────────────────────────────────────

def upsert_transactions(transactions: list[dict], user_id: str) -> int:
    """
    Embed and upsert transactions into Pinecone under the user's namespace.

    Args:
        transactions: List of transaction dicts.
        user_id:      MongoDB ObjectId string — used as namespace.

    Returns:
        Number of vectors upserted.
    """
    if not transactions:
        return 0

    texts      = [_transaction_to_text(t) for t in transactions]
    embeddings = _embed_batch(texts)

    vectors = []
    for t, emb in zip(transactions, embeddings):
        tid = str(t.get("_id") or t.get("id") or "")
        if not tid:
            continue

        metadata: dict[str, Any] = {
            "user_id":        user_id,
            "transaction_id": tid,
            "type":           "transaction",
            "date":           _fmt_date(t.get("date")),
            "merchant":       (t.get("merchant") or t.get("description") or "")[:100],
            "description":    (t.get("description") or "")[:200],
            "amount":         float(t.get("amount", 0)),
            "category":       t.get("category") or "Other",
            "balance":        float(t.get("balance") or 0),
        }
        vectors.append({"id": f"{user_id}_{tid}", "values": emb, "metadata": metadata})

    for i in range(0, len(vectors), BATCH_SIZE):
        _index().upsert(vectors=vectors[i : i + BATCH_SIZE], namespace=user_id)

    logger.info("Upserted %d transaction vectors for user %s", len(vectors), user_id)
    return len(vectors)


def upsert_user_profile(user: dict, user_id: str) -> None:
    """
    Embed and upsert the user's profile as a single vector in Pinecone.

    The profile vector uses ID `{user_id}_profile` and is stored in the same
    namespace as the user's transactions so semantic searches can surface
    personal context (university, year, income, goal) alongside transactions.

    Args:
        user:    Dict with keys: name, university, yearOfStudy,
                 monthlyIncome, monthlySpendingGoal.
        user_id: MongoDB ObjectId string — namespace.
    """
    text  = _user_profile_to_text(user)
    [emb] = _embed_batch([text])

    vector = {
        "id":     f"{user_id}_profile",
        "values": emb,
        "metadata": {
            "type":                  "user_profile",
            "user_id":               user_id,
            "name":                  user.get("name", ""),
            "university":            user.get("university", ""),
            "year_of_study":         user.get("yearOfStudy", ""),
            "monthly_income":        float(user.get("monthlyIncome", 0) or 0),
            "monthly_spending_goal": float(user.get("monthlySpendingGoal", 0) or 0),
        },
    }
    _index().upsert(vectors=[vector], namespace=user_id)
    logger.info("Upserted profile vector for user %s", user_id)


def delete_transaction(transaction_id: str, user_id: str) -> None:
    """Delete a single transaction vector from Pinecone."""
    vector_id = f"{user_id}_{transaction_id}"
    _index().delete(ids=[vector_id], namespace=user_id)
    logger.info("Deleted vector %s for user %s", vector_id, user_id)


def search_transactions(query: str, user_id: str, top_k: int = 8) -> str:
    """
    Semantic search over a user's namespace (transactions + profile).

    Args:
        query:   Natural language question / search phrase.
        user_id: Namespace to search within (MongoDB ObjectId).
        top_k:   Maximum number of results to return.

    Returns:
        A formatted string listing the most relevant results.
    """
    query_emb = _embed_batch([query])[0]

    results = _index().query(
        vector=query_emb,
        top_k=top_k,
        namespace=user_id,
        include_metadata=True,
    )

    if not results.matches:
        return "No matching information found in your history."

    tx_lines      = []
    profile_lines = []

    for match in results.matches:
        m = match.metadata or {}

        if m.get("type") == "user_profile":
            profile_lines.append(
                f"• [Your Profile] "
                f"University: {m.get('university') or 'N/A'}, "
                f"Year: {m.get('year_of_study') or 'N/A'}, "
                f"Monthly income: £{m.get('monthly_income', 0):.0f}, "
                f"Spending goal: £{m.get('monthly_spending_goal', 0):.0f}"
            )
        else:
            amount  = float(m.get("amount", 0))
            abs_amt = abs(amount)
            flow    = "received" if amount >= 0 else "spent"
            tx_lines.append(
                f"• {m.get('date', 'N/A')}: £{abs_amt:.2f} {flow} at "
                f"{m.get('merchant') or 'Unknown'} "
                f"(Category: {m.get('category', 'Other')})"
            )

    lines = []
    if profile_lines:
        lines.append("Your profile context:")
        lines.extend(profile_lines)
        lines.append("")

    if tx_lines:
        lines.append(f"Found {len(tx_lines)} relevant transaction(s) from your history:")
        lines.extend(tx_lines)
    elif not profile_lines:
        return "No matching transactions found in your history."

    return "\n".join(lines)
