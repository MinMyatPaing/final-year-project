import os
import tempfile

from fastapi import APIRouter, File, UploadFile, HTTPException

from models import Transaction, ExtractResponse
from flows import process_bank_statement

router = APIRouter(tags=["Extract"])


@router.post("/extract", response_model=ExtractResponse)
async def extract_transactions(file: UploadFile = File(...)):
    """Extract transactions from a bank statement PDF."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    temp_file_path = os.path.join(
        tempfile.gettempdir(), f"statement_{os.urandom(8).hex()}.pdf"
    )

    try:
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())

        transactions = process_bank_statement(temp_file_path)

        transaction_list = [
            Transaction(
                date=t.get("date", ""),
                description=t.get("description", ""),
                amount=t.get("amount", 0.0),
                balance=t.get("balance"),
            )
            for t in transactions
        ]

        return ExtractResponse(
            transactions=transaction_list,
            success=True,
            message=f"Successfully extracted {len(transaction_list)} transactions",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
