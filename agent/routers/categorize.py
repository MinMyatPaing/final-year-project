from fastapi import APIRouter, HTTPException

from models import Transaction, CategorizeRequest, CategorizeResponse
from flows import categorize_transactions

router = APIRouter(tags=["Categorize"])


@router.post("/categorize", response_model=CategorizeResponse)
async def categorize_transactions_endpoint(request: CategorizeRequest):
    """Categorize a list of transactions using GPT-4o-mini."""
    try:
        categorized = categorize_transactions(request.transactions)

        transaction_list = [
            Transaction(
                date=t.get("date", ""),
                description=t.get("description", ""),
                amount=t.get("amount", 0.0),
                balance=t.get("balance"),
                category=t.get("category", "Other"),
                merchant=t.get("merchant"),
            )
            for t in categorized
        ]

        return CategorizeResponse(
            transactions=transaction_list,
            success=True,
            message=f"Successfully categorized {len(transaction_list)} transactions",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error categorizing transactions: {str(e)}"
        )
