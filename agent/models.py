"""
Pydantic request and response models for the StudyBudget Agent API.
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class Transaction(BaseModel):
    date: str
    description: str
    amount: float
    balance: float | None = None
    category: str | None = None
    merchant: str | None = None


class ExtractResponse(BaseModel):
    transactions: List[Transaction]
    success: bool
    message: str | None = None


# ─── Two-step upload flow ─────────────────────────────────────────────────────


class ExtractPreviewResponse(BaseModel):
    """
    Returned by POST /extract — transactions for the user to review BEFORE
    they are stored.  The frontend shows this list for confirmation.
    """

    transactions: List[Transaction]
    bank_name: str
    success: bool
    message: str | None = None
    disclaimer: str = (
        "Your bank statement has been processed by AI to extract transaction data only. "
        "The original document is not stored and will not be used for any other purpose. "
        "Please review the transactions below before confirming."
    )


class CategorizeRequest(BaseModel):
    transactions: List[Dict[str, Any]]


class CategorizeResponse(BaseModel):
    transactions: List[Transaction]
    success: bool
    message: str | None = None


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    response: str
    success: bool
