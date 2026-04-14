"""
Extract router — POST /extract
Receives a PDF upload, runs the Claude Vision extraction pipeline,
and returns a preview of transactions for the user to review.

Two-step flow
─────────────
1. POST /extract        → returns transactions + disclaimer (no DB write yet)
2. Frontend shows list  → user reviews and confirms
3. Backend /api/transactions/bulk → stores confirmed transactions in MongoDB + Pinecone
"""

import os
import tempfile

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

from models import Transaction, ExtractPreviewResponse
from flows import process_bank_statement, categorize_transactions

router = APIRouter(tags=["Extract"])

# Maximum PDF size accepted (10 MB)
_MAX_PDF_BYTES = 10 * 1024 * 1024


@router.post("/extract", response_model=ExtractPreviewResponse)
async def extract_transactions(file: UploadFile = File(...)):
    """
    Step 1 of the upload flow.

    Accepts a bank statement PDF, runs the guard check, extracts transactions
    with Claude Vision, categorises them, and returns the result for user review.

    The document is NOT stored.  Only the extracted JSON is returned.
    The user must confirm via the frontend before anything is written to the DB.
    """
    # ── Basic file validation ──────────────────────────────────────────────────
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF (.pdf)")

    content = await file.read()
    if len(content) > _MAX_PDF_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size is 10 MB.",
        )

    # ── Write to a temp file (FastAPI needs a path for PyMuPDF) ───────────────
    temp_file_path = os.path.join(
        tempfile.gettempdir(), f"statement_{os.urandom(8).hex()}.pdf"
    )

    try:
        with open(temp_file_path, "wb") as f:
            f.write(content)

        # ── Guard + extraction (raises ValueError for non-bank PDFs) ──────────
        try:
            raw_transactions, bank_name = process_bank_statement(temp_file_path)
        except ValueError as guard_err:
            # Guard rejected the file — not a bank statement
            raise HTTPException(status_code=422, detail=str(guard_err))

        if not raw_transactions:
            return ExtractPreviewResponse(
                transactions=[],
                bank_name=bank_name,
                success=False,
                message="No transactions could be extracted from this document. "
                "Please check that it is a valid bank statement.",
            )

        # ── Categorise (Claude Haiku text call — fast) ────────────────────────
        try:
            categorised = categorize_transactions(raw_transactions)
        except Exception:
            # Categorisation is best-effort; fall back to raw if it fails
            categorised = raw_transactions

        transaction_list = [
            Transaction(
                date=t.get("date", ""),
                description=t.get("description", ""),
                amount=t.get("amount", 0.0),
                balance=t.get("balance"),
                category=t.get("category"),
                merchant=t.get("merchant"),
            )
            for t in categorised
        ]

        return ExtractPreviewResponse(
            transactions=transaction_list,
            bank_name=bank_name,
            success=True,
            message=(
                f"Successfully extracted {len(transaction_list)} transactions "
                f"from your {bank_name} statement. "
                "Please review and confirm to save."
            ),
        )

    except HTTPException:
        raise  # re-raise FastAPI exceptions unchanged

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing PDF: {str(e)}",
        )

    finally:
        # Always clean up the temp file — the raw PDF is never persisted
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
