"""
Vector Store — Pinecone + OpenAI text-embedding-3-small (1536 dims).

Each user's transactions are stored in their own Pinecone namespace so
queries are automatically scoped to that user with zero metadata filtering.

Vector ID scheme: ``{user_id}_{transaction_id}``

Text format embedded per transaction:
  "£12.99 debit at Netflix on 01 Apr 2026. Category: Entertainment. Balance: £543.21."
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
BATCH_SIZE  = 100   # Pinecone upsert batch limit

# ─── Lazy-loaded clients (created on first use so env vars are always current) ─

_oai_client: OpenAI | None = None
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
        _pc_index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "student-budgeting-final-year"))
    return _pc_index


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _fmt_date(raw: Any) -> str:
    """Return a human-readable date string from whatever date format arrives."""
    if raw is None:
        return "unknown date"
    if hasattr(raw, "strftime"):
        return raw.strftime("%d %b %Y")
    s = str(raw)
    # ISO datetime → keep only the date part
    return s[:10] if len(s) >= 10 else s


def _transaction_to_text(t: dict) -> str:
    """
    Build a rich natural-language sentence for a transaction so it embeds
    well against queries like "food spending" or "how much at Tesco".
    """
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


def _embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a list of strings and return their vectors."""
    resp = _oai().embeddings.create(input=texts, model=EMBED_MODEL)
    return [item.embedding for item in resp.data]


# ─── Public API ───────────────────────────────────────────────────────────────

def upsert_transactions(transactions: list[dict], user_id: str) -> int:
    """
    Embed and upsert *transactions* into Pinecone under the user's namespace.

    Args:
        transactions: List of transaction dicts with at minimum:
                      _id (or id), date, description, amount.
                      Optional: balance, category, merchant.
        user_id:      MongoDB user ObjectId string — used as namespace.

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
            "user_id":        user_id,
            "transaction_id": tid,
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

    logger.info("Upserted %d vectors for user %s", len(vectors), user_id)
    return len(vectors)


def delete_transaction(transaction_id: str, user_id: str) -> None:
    """
    Delete a single transaction vector from Pinecone.

    Args:
        transaction_id: MongoDB ``_id`` string of the transaction.
        user_id:        Namespace (MongoDB user ObjectId string).
    """
    vector_id = f"{user_id}_{transaction_id}"
    _index().delete(ids=[vector_id], namespace=user_id)
    logger.info("Deleted vector %s for user %s", vector_id, user_id)


def search_transactions(query: str, user_id: str, top_k: int = 8) -> str:
    """
    Semantic search over a user's transaction history.

    Args:
        query:   Natural language question / search phrase.
        user_id: Namespace to search within (MongoDB user ObjectId).
        top_k:   Maximum number of results to return.

    Returns:
        A formatted string listing the most relevant transactions,
        or a "no results" message.
    """
    query_emb = _embed_batch([query])[0]

    results = _index().query(
        vector=query_emb,
        top_k=top_k,
        namespace=user_id,
        include_metadata=True,
    )

    if not results.matches:
        return "No matching transactions found in your history."

    lines = [f"Found {len(results.matches)} relevant transaction(s) from your history:\n"]
    for match in results.matches:
        m       = match.metadata or {}
        amount  = float(m.get("amount", 0))
        abs_amt = abs(amount)
        flow    = "received" if amount >= 0 else "spent"
        lines.append(
            f"• {m.get('date', 'N/A')}: £{abs_amt:.2f} {flow} at "
            f"{m.get('merchant') or 'Unknown'} "
            f"(Category: {m.get('category', 'Other')})"
        )

    return "\n".join(lines)
