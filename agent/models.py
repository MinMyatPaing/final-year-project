"""
Pydantic request and response models for the StudyBudget Agent API.
"""

from pydantic import BaseModel
from typing import List, Dict, Any


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
