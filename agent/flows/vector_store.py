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
from datetime import datetime
from typing import Any, Optional

from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone

load_dotenv()

logger = logging.getLogger(__name__)

EMBED_MODEL = "text-embedding-3-small"
EMBED_DIM = 1536
BATCH_SIZE = 100

# ─── Lazy-loaded clients ──────────────────────────────────────────────────────

_oai_client = None
_pc_index = None


def _oai() -> OpenAI:
    global _oai_client
    if _oai_client is None:
        _oai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _oai_client


def _index():
    global _pc_index
    if _pc_index is None:
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        _pc_index = pc.Index(
            os.getenv("PINECONE_INDEX_NAME", "student-budgeting-final-year")
        )
    return _pc_index


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _fmt_date(raw: Any) -> str:
    if raw is None:
        return "unknown date"
    if hasattr(raw, "strftime"):
        return raw.strftime("%d %b %Y")
    s = str(raw)
    return s[:10] if len(s) >= 10 else s


def _parse_metadata_date(date_str: str) -> Optional[datetime]:
    """
    Parse a date string stored in Pinecone metadata into a datetime object.
    Handles ISO format ("2026-03-15" or full ISO timestamp) and display
    format ("15 Mar 2026" / "15 March 2026").
    Returns None if the string cannot be parsed.
    """
    if not date_str or date_str in ("unknown date", "N/A", ""):
        return None
    s = date_str.strip()
    # ISO format — may be full ISO timestamp; first 10 chars give YYYY-MM-DD
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d")
    except ValueError:
        pass
    # Display formats set by _fmt_date
    for fmt in ("%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _transaction_to_text(t: dict) -> str:
    """Build a rich natural-language sentence for a transaction."""
    amount = float(t.get("amount", 0))
    direction = "credit" if amount >= 0 else "debit"
    abs_amt = abs(amount)
    date = _fmt_date(t.get("date"))
    merchant = (t.get("merchant") or t.get("description") or "Unknown")[:80]
    category = t.get("category") or "Other"
    balance = t.get("balance")
    desc = (t.get("description") or "")[:120]

    text = f"£{abs_amt:.2f} {direction} at {merchant} on {date}. Category: {category}."
    if balance is not None:
        text += f" Balance after: £{float(balance):.2f}."
    if desc and desc.strip().lower() != merchant.strip().lower():
        text += f" Description: {desc}."
    return text


def _user_profile_to_text(user: dict) -> str:
    """Build a natural-language sentence describing a student's profile."""
    name = user.get("name", "User")
    university = (user.get("university") or "").strip()
    year = (user.get("yearOfStudy") or "").strip()
    income = float(user.get("monthlyIncome", 0) or 0)
    goal = float(user.get("monthlySpendingGoal", 0) or 0)

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

    texts = [_transaction_to_text(t) for t in transactions]
    embeddings = _embed_batch(texts)

    vectors = []
    for t, emb in zip(transactions, embeddings):
        tid = str(t.get("_id") or t.get("id") or "")
        if not tid:
            continue

        metadata: dict[str, Any] = {
            "user_id": user_id,
            "transaction_id": tid,
            "type": "transaction",
            "date": _fmt_date(t.get("date")),
            "merchant": (t.get("merchant") or t.get("description") or "")[:100],
            "description": (t.get("description") or "")[:200],
            "amount": float(t.get("amount", 0)),
            "category": t.get("category") or "Other",
            "balance": float(t.get("balance") or 0),
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
    text = _user_profile_to_text(user)
    [emb] = _embed_batch([text])

    vector = {
        "id": f"{user_id}_profile",
        "values": emb,
        "metadata": {
            "type": "user_profile",
            "user_id": user_id,
            "name": user.get("name", ""),
            "university": user.get("university", ""),
            "year_of_study": user.get("yearOfStudy", ""),
            "monthly_income": float(user.get("monthlyIncome", 0) or 0),
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


def get_all_transactions_summary(
    user_id: str,
    year: int = 0,
    month: int = 0,
    top_k: int = 200,
) -> str:
    """
    Retrieve up to `top_k` transactions for a user using a broad generic embedding
    that covers all financial transaction types — including transfers, bank payments,
    and any other category.  Optionally filter results to a specific year/month
    (applied in Python after Pinecone retrieval, so large top_k values are used
    to maximise recall before filtering).

    Args:
        user_id: Pinecone namespace (MongoDB ObjectId string).
        year:    4-digit calendar year to filter by (e.g. 2026). 0 = all years.
        month:   Month number 1-12 to filter by (e.g. 3 = March). 0 = all months.
        top_k:   Maximum vectors to retrieve from Pinecone (default 200).

    Returns:
        A formatted string with totals, category breakdown and individual rows.
    """
    # Deliberately broad query to maximise recall across all transaction types.
    generic_query = (
        "financial transaction debit credit payment transfer spending income "
        "bank statement purchase subscription"
    )
    query_emb = _embed_batch([generic_query])[0]

    results = _index().query(
        vector=query_emb,
        top_k=top_k,
        namespace=user_id,
        include_metadata=True,
    )

    if not results.matches:
        return "No transactions found in your history."

    # Human-readable period label used in the output header
    if year and month:
        from calendar import month_name as _month_name
        period_label = f" for {_month_name[month]} {year}"
    elif year:
        period_label = f" for {year}"
    else:
        period_label = ""

    total_debit = 0.0
    total_credit = 0.0
    categories: dict[str, float] = {}
    tx_lines: list[str] = []

    for match in results.matches:
        m = match.metadata or {}
        if m.get("type") != "transaction":
            continue

        # ── Date filter (post-retrieval, in Python) ────────────────────────
        if year or month:
            dt = _parse_metadata_date(m.get("date", ""))
            if dt is None:
                continue  # unparseable date — skip to be safe
            if year and dt.year != year:
                continue
            if month and dt.month != month:
                continue

        amount = float(m.get("amount", 0))
        abs_amt = abs(amount)
        flow = "received" if amount >= 0 else "spent"
        cat = m.get("category") or "Other"

        if amount < 0:
            total_debit += abs_amt
            categories[cat] = categories.get(cat, 0) + abs_amt
        else:
            total_credit += abs_amt

        tx_lines.append(
            f"• {m.get('date', 'N/A')}: £{abs_amt:.2f} {flow} at "
            f"{m.get('merchant') or m.get('description', 'Unknown')} "
            f"(Category: {cat})"
        )

    if not tx_lines:
        return f"No transactions found{period_label}."

    lines: list[str] = [
        f"Transaction history{period_label} ({len(tx_lines)} transactions):",
        f"  Total spent  (outflows): £{total_debit:.2f}",
        f"  Total received (inflows): £{total_credit:.2f}",
        "",
        "Spending breakdown by category:",
    ]
    for cat, amt in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        lines.append(f"  • {cat}: £{amt:.2f}")
    lines.append("")
    lines.append("Individual transactions:")
    lines.extend(tx_lines)

    return "\n".join(lines)


def fetch_user_profile(user_id: str) -> str:
    """
    Directly fetch the user's profile vector from Pinecone using its known ID
    (`{user_id}_profile`).  Unlike `search_transactions`, this is a deterministic
    lookup — it never misses the profile due to a low semantic similarity score.

    Args:
        user_id: MongoDB ObjectId string — namespace and vector ID prefix.

    Returns:
        A formatted profile string, or an empty string if not found.
    """
    try:
        result = _index().fetch(ids=[f"{user_id}_profile"], namespace=user_id)
        if not result.vectors:
            return ""
        v = result.vectors.get(f"{user_id}_profile")
        if not v or not v.metadata:
            return ""
        m = v.metadata
        lines = ["Your profile:"]
        if m.get("name"):
            lines.append(f"  • Name: {m['name']}")
        if m.get("university"):
            lines.append(f"  • University: {m['university']}")
        if m.get("year_of_study"):
            lines.append(f"  • Year of Study: {m['year_of_study']}")
        inc = float(m.get("monthly_income", 0) or 0)
        if inc:
            lines.append(f"  • Monthly Income: £{inc:.0f}")
        goal = float(m.get("monthly_spending_goal", 0) or 0)
        if goal:
            lines.append(f"  • Monthly Spending Goal: £{goal:.0f}")
        return "\n".join(lines)
    except Exception as exc:
        logger.warning("fetch_user_profile failed for %s: %s", user_id, exc)
        return ""


def search_transactions(query: str, user_id: str, top_k: int = 20) -> str:
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

    tx_lines = []
    profile_lines = []

    for match in results.matches:
        m = match.metadata or {}

        if m.get("type") == "user_profile":
            profile_lines.append(
                f"• [Your Profile] "
                f"Name: {m.get('name') or 'N/A'}, "
                f"University: {m.get('university') or 'N/A'}, "
                f"Year: {m.get('year_of_study') or 'N/A'}, "
                f"Monthly income: £{m.get('monthly_income', 0):.0f}, "
                f"Spending goal: £{m.get('monthly_spending_goal', 0):.0f}"
            )
        else:
            amount = float(m.get("amount", 0))
            abs_amt = abs(amount)
            flow = "received" if amount >= 0 else "spent"
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
        lines.append(
            f"Found {len(tx_lines)} relevant transaction(s) from your history:"
        )
        lines.extend(tx_lines)
    elif not profile_lines:
        return "No matching transactions found in your history."

    return "\n".join(lines)


def delete_user_vectors(user_id: str) -> None:
    """
    Delete ALL vectors for a user from their Pinecone namespace.
    Called when a user deletes their account.
    """
    try:
        idx = _index()
        # Pinecone namespaces isolate each user's data.
        # Deleting all vectors in the namespace removes everything for that user.
        idx.delete(delete_all=True, namespace=user_id)
        logger.info("[vector_store] deleted all vectors for user %s", user_id)
    except Exception as exc:
        logger.warning(
            "[vector_store] delete_user_vectors failed for %s: %s", user_id, exc
        )
        raise
