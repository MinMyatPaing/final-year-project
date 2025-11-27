"""
FastAPI server for bank statement processing and transaction categorization
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import tempfile
import os
from pathlib import Path

from main import process_bank_statement
from categorize_agent import categorize_transactions

app = FastAPI(title="Bank Statement Agent API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Response models
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


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Bank Statement Agent API is running"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/extract", response_model=ExtractResponse)
async def extract_transactions(file: UploadFile = File(...)):
    """
    Extract transactions from a bank statement PDF
    
    Receives a PDF file, processes it using the NuExtract agent,
    and returns a list of transactions.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Save uploaded file to temporary location
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, f"statement_{os.urandom(8).hex()}.pdf")
    
    try:
        # Save uploaded file
        with open(temp_file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Process the PDF
        transactions = process_bank_statement(temp_file_path)
        
        # Convert to response format
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
            message=f"Successfully extracted {len(transaction_list)} transactions"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing PDF: {str(e)}"
        )
    
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.post("/categorize", response_model=CategorizeResponse)
async def categorize_transactions_endpoint(request: CategorizeRequest):
    """
    Categorize a list of transactions
    
    Receives a list of transactions and returns them categorized
    into groups like transportation, eat out, etc.
    """
    try:
        # Categorize transactions
        categorized = categorize_transactions(request.transactions)
        
        # Convert to response format
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
            message=f"Successfully categorized {len(transaction_list)} transactions"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error categorizing transactions: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

