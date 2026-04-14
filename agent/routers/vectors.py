"""
Vectors Router — upsert and delete transaction/profile vectors in Pinecone.

Called fire-and-forget by the Node.js backend after every MongoDB write.
"""

import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from flows.vector_store import (
    upsert_transactions as _upsert,
    upsert_user_profile as _upsert_profile,
    delete_transaction as _delete,
    delete_user_vectors as _delete_user,
)

router = APIRouter(prefix="/vectors", tags=["vectors"])
logger = logging.getLogger(__name__)


# ─── Request models ───────────────────────────────────────────────────────────


class UpsertRequest(BaseModel):
    transactions: list[dict[str, Any]]
    user_id: str


class UpsertProfileRequest(BaseModel):
    user: dict[str, Any]
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


def _bg_upsert_profile(user: dict, user_id: str) -> None:
    try:
        _upsert_profile(user, user_id)
        logger.info("[vectors] profile upserted for user %s", user_id)
    except Exception as exc:
        logger.warning("[vectors] profile upsert failed: %s", exc)


def _bg_delete(transaction_id: str, user_id: str) -> None:
    try:
        _delete(transaction_id, user_id)
        logger.info("[vectors] deleted %s for user %s", transaction_id, user_id)
    except Exception as exc:
        logger.warning("[vectors] delete failed: %s", exc)


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/upsert")
async def upsert(req: UpsertRequest, background_tasks: BackgroundTasks):
    """Embed and upsert a list of transactions for a user (background)."""
    if not req.transactions:
        return {"success": True, "queued": 0}
    background_tasks.add_task(_bg_upsert, req.transactions, req.user_id)
    return {"success": True, "queued": len(req.transactions)}


@router.post("/upsert-profile")
async def upsert_profile(req: UpsertProfileRequest, background_tasks: BackgroundTasks):
    """
    Embed and upsert a user's profile into their Pinecone namespace (background).
    Called after registration or profile update when AI consent is given.
    """
    background_tasks.add_task(_bg_upsert_profile, req.user, req.user_id)
    return {"success": True}


@router.post("/delete")
async def delete(req: DeleteRequest, background_tasks: BackgroundTasks):
    """Delete a single transaction vector (background)."""
    background_tasks.add_task(_bg_delete, req.transaction_id, req.user_id)
    return {"success": True}


class DeleteUserRequest(BaseModel):
    user_id: str


def _bg_delete_user(user_id: str) -> None:
    try:
        _delete_user(user_id)
        logger.info("[vectors] all vectors deleted for user %s", user_id)
    except Exception as exc:
        logger.warning("[vectors] delete-user failed: %s", exc)


@router.delete("/delete-user")
async def delete_user(req: DeleteUserRequest, background_tasks: BackgroundTasks):
    """Delete ALL vectors for a user (called on account deletion)."""
    background_tasks.add_task(_bg_delete_user, req.user_id)
    return {"success": True}
