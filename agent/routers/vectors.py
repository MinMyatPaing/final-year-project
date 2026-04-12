"""
Vectors Router — upsert and delete transaction vectors in Pinecone.

Called fire-and-forget by the Node.js backend after every MongoDB write.
"""

import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from flows.vector_store import (
    upsert_transactions as _upsert,
    delete_transaction  as _delete,
)

router = APIRouter(prefix="/vectors", tags=["vectors"])
logger = logging.getLogger(__name__)


# ─── Request models ───────────────────────────────────────────────────────────

class UpsertRequest(BaseModel):
    transactions: list[dict[str, Any]]
    user_id: str


class DeleteRequest(BaseModel):
    transaction_id: str
    user_id: str


# ─── Background helpers ───────────────────────────────────────────────────────

def _bg_upsert(transactions: list[dict], user_id: str) -> None:
    try:
        count = _upsert(transactions, user_id)
        logger.info("[vectors] upserted %d for user %s", count, user_id)
    except Exception as exc:
        logger.warning("[vectors] upsert failed: %s", exc)


def _bg_delete(transaction_id: str, user_id: str) -> None:
    try:
        _delete(transaction_id, user_id)
        logger.info("[vectors] deleted %s for user %s", transaction_id, user_id)
    except Exception as exc:
        logger.warning("[vectors] delete failed: %s", exc)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/upsert")
async def upsert(req: UpsertRequest, background_tasks: BackgroundTasks):
    """
    Embed and upsert a list of transactions for a user.
    Processing happens in a background task so the response is immediate.
    """
    if not req.transactions:
        return {"success": True, "queued": 0}

    background_tasks.add_task(_bg_upsert, req.transactions, req.user_id)
    return {"success": True, "queued": len(req.transactions)}


@router.post("/delete")
async def delete(req: DeleteRequest, background_tasks: BackgroundTasks):
    """
    Delete a single transaction vector.
    Processing happens in a background task so the response is immediate.
    """
    background_tasks.add_task(_bg_delete, req.transaction_id, req.user_id)
    return {"success": True}
