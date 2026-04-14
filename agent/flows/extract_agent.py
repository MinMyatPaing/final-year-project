"""
Extraction Flow — LangGraph Workflow
Uses Claude claude-haiku-4-5 (Vision) to read PDF bank statements and extract
structured transaction data page by page.

PRIVACY NOTICE
--------------
Uploaded bank statement PDFs are converted to images in memory, sent to the
Anthropic API for extraction, and then immediately discarded.  No raw PDF data
is stored on disk beyond the temporary file that FastAPI creates for the upload.
The extracted JSON (transactions only) is what gets persisted to the database.

──────────────────────────────────────────────────────────────────────────────
NuExtract-2.0-2B (LOCAL MODEL) — KEPT FOR REFERENCE / FUTURE FINE-TUNING
──────────────────────────────────────────────────────────────────────────────
The original NuExtract-based pipeline is preserved below in commented-out
blocks marked with  # [NUEXTRACT].  To switch back to local inference:
  1. Uncomment the [NUEXTRACT] blocks.
  2. Comment out the [CLAUDE] blocks.
  3. See agent/fine_tuning/train_template.py for how to fine-tune NuExtract
     on your own HSBC / Lloyds statements.
──────────────────────────────────────────────────────────────────────────────
"""

import json
import base64
import os
import re
from typing import TypedDict, List, Dict, Optional

import fitz  # PyMuPDF — no poppler needed
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END

# [CLAUDE] ─── Anthropic client ───────────────────────────────────────────────
import anthropic

load_dotenv()

_anthropic_client: Optional[anthropic.Anthropic] = None


def _get_anthropic_client() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        api_key = os.getenv("CLAUDE_API_KEY")
        if not api_key:
            raise RuntimeError("CLAUDE_API_KEY is not set in the environment.")
        _anthropic_client = anthropic.Anthropic(api_key=api_key)
    return _anthropic_client


# [/CLAUDE]

# [NUEXTRACT] ─── Local model (commented out — see fine_tuning/train_template.py) ──
# import torch
# from transformers import AutoProcessor, AutoModelForVision2Seq
# from qwen_vl_utils import process_vision_info
#
# MODEL = None
# PROCESSOR = None
#
# def initialize_model(state):
#     global MODEL, PROCESSOR
#     if MODEL is None:
#         print("🔄 Loading NuExtract-2.0-2B model (first time only)...")
#         try:
#             model_name = "numind/NuExtract-2.0-2B"
#             # To use a fine-tuned LoRA adapter instead, replace model_name with
#             # the path to your merged weights, e.g.:
#             #   model_name = "./fine_tuning/nuextract-bankstatement-merged"
#             MODEL = AutoModelForVision2Seq.from_pretrained(
#                 model_name,
#                 trust_remote_code=True,
#                 torch_dtype=torch.bfloat16,
#                 device_map="auto",
#             )
#             PROCESSOR = AutoProcessor.from_pretrained(
#                 model_name, trust_remote_code=True, padding_side="left", use_fast=True
#             )
#             print("✓ Model loaded successfully")
#         except Exception as e:
#             state["error"] = f"Error loading model: {str(e)}"
#             print(f"✗ {state['error']}")
#     return state
# [/NUEXTRACT]


# ─── Bank statement guard ─────────────────────────────────────────────────────

# Keywords drawn from real HSBC and Lloyds statement layouts.
# The real statements in agent/bank_statements/ were used to verify these terms.
_BANK_KEYWORDS = [
    # Universal banking terms
    "sort code",
    "account number",
    "balance brought forward",
    "balance carried forward",
    "opening balance",
    "closing balance",
    "statement period",
    "statement date",
    # Column headers
    "paid in",
    "paid out",
    "debit",
    "credit",
    "withdrawals",
    "deposits",
    "date",
    "description",
    "transactions",
    # UK bank names
    "hsbc",
    "lloyds",
    "barclays",
    "natwest",
    "santander",
    "halifax",
    "nationwide",
    "monzo",
    "starling",
    # HSBC-specific
    "balance brought forward",
    "faster payment",
    "direct debit",
    # Lloyds-specific
    "sort code",
    "account number",
]
_MIN_KEYWORD_HITS = 3


def is_likely_bank_statement(pdf_path: str) -> tuple[bool, str]:
    """
    Returns (True, bank_name) if the PDF looks like a bank statement,
    or (False, "") if it does not.

    Uses PyMuPDF text extraction — no ML required.
    The keyword list was validated against the real HSBC and Lloyds PDFs
    stored in agent/bank_statements/.
    """
    try:
        doc = fitz.open(pdf_path)
        full_text = " ".join(page.get_text().lower() for page in doc).replace("\n", " ")
        doc.close()
    except Exception:
        return False, ""

    hits = sum(1 for kw in _BANK_KEYWORDS if kw in full_text)
    if hits < _MIN_KEYWORD_HITS:
        return False, ""

    # Detect bank brand for layout-aware prompting
    bank_name = "Unknown Bank"
    if "hsbc" in full_text:
        bank_name = "HSBC"
    elif "lloyds" in full_text:
        bank_name = "Lloyds"
    elif "barclays" in full_text:
        bank_name = "Barclays"
    elif "natwest" in full_text:
        bank_name = "NatWest"
    elif "santander" in full_text:
        bank_name = "Santander"
    elif "halifax" in full_text:
        bank_name = "Halifax"
    elif "nationwide" in full_text:
        bank_name = "Nationwide"
    elif "monzo" in full_text:
        bank_name = "Monzo"
    elif "starling" in full_text:
        bank_name = "Starling"

    return True, bank_name


# ─── State ────────────────────────────────────────────────────────────────────


class BankStatementState(TypedDict):
    pdf_path: str
    bank_name: str  # Detected bank (HSBC, Lloyds, …)
    pdf_images: List[str]  # Base64-encoded JPEG images, one per page
    transactions: List[Dict]
    error: str


# ─── Nodes ────────────────────────────────────────────────────────────────────


def detect_bank_and_guard(state: BankStatementState) -> BankStatementState:
    """
    Step 1 — Guard: reject non-bank-statement PDFs early.
    Also detects the bank brand so the extraction prompt can be tailored.
    """
    ok, bank_name = is_likely_bank_statement(state["pdf_path"])
    if not ok:
        state["error"] = (
            "This does not appear to be a bank statement PDF. "
            "Please upload an official bank statement (HSBC, Lloyds, etc.)."
        )
        print(f"✗ Guard rejected file: {state['pdf_path']}")
        return state

    state["bank_name"] = bank_name
    print(f"✓ Bank statement detected — bank: {bank_name}")
    return state


def convert_pdf_to_images(state: BankStatementState) -> BankStatementState:
    """Render each PDF page to a base64 JPEG using PyMuPDF (no poppler needed)."""
    if state.get("error"):
        return state

    try:
        print("🔄 Converting PDF to images...")
        pdf_document = fitz.open(state["pdf_path"])
        base64_images = []

        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            mat = fitz.Matrix(2.0, 2.0)  # 2× zoom for better OCR accuracy
            pix = page.get_pixmap(matrix=mat)
            img_base64 = base64.b64encode(pix.tobytes("jpeg")).decode()
            base64_images.append(img_base64)

        pdf_document.close()
        state["pdf_images"] = base64_images
        print(f"✓ Converted PDF to {len(base64_images)} images")

    except Exception as e:
        state["error"] = f"Error converting PDF: {str(e)}"
        print(f"✗ {state['error']}")

    return state


# [CLAUDE] ─── Claude Vision extraction ───────────────────────────────────────

_BANK_LAYOUT_HINTS: Dict[str, str] = {
    "HSBC": (
        "HSBC statements have columns: Date | Description | Paid out | Paid in | Balance. "
        "'Paid out' values are expenses (negative amount). "
        "'Paid in' values are income (positive amount). "
        "Date format is typically 'DD MMM YYYY' (e.g. '01 Apr 2026'). "
        "Descriptions sometimes span two lines; include both lines as one description. "
        "There are NO other columns between Description and the money columns."
    ),
    "Lloyds": (
        "Lloyds statements have SIX columns: Date | Description | Type | Money In (£) | Money Out (£) | Balance (£). "
        "The THIRD column is a transaction TYPE code (e.g. SO=Standing Order, FPO=Faster Payment Out, "
        "FPI=Faster Payment In, DD=Direct Debit, DEB=Debit Card, BGC=Bank Giro Credit, BP=Bill Payment, etc.). "
        "IGNORE the Type column — do not include it in the output. "
        "'Money Out' values are expenses: use a NEGATIVE amount. "
        "'Money In' values are income: use a POSITIVE amount. "
        "A blank/empty Money In cell means it is a Money Out transaction, and vice versa. "
        "Date format is 'DD MMM YY' (e.g. '02 Mar 26' = 2026-03-02). "
        "The Balance column is the rightmost column and is always present. "
        "CRITICAL: Every row that has a date is a transaction. Do not skip any row."
    ),
}

_DEFAULT_LAYOUT_HINT = (
    "The statement may have columns for date, description, an optional type/code column, "
    "debit/paid-out (negative amount), credit/paid-in (positive amount), and running balance. "
    "Extract every row that has a date."
)

_SYSTEM_PROMPT = """You are a precise bank statement data extractor.
Your job is to read a bank statement page image and return ONLY a valid JSON object.

Rules:
- Extract EVERY transaction row visible on the page — do not skip any.
- Dates must be normalised to ISO format: YYYY-MM-DD.
  - Two-digit years: 26 = 2026, 25 = 2025, 24 = 2024.
- amount: NEGATIVE (-) for money OUT (debit / paid out / money out / withdrawal).
          POSITIVE (+) for money IN (credit / paid in / money in / deposit).
- If a row has a value in "Money Out" and the "Money In" cell is blank, the amount is NEGATIVE.
- If a row has a value in "Money In" and the "Money Out" cell is blank, the amount is POSITIVE.
- balance: the running balance after the transaction (rightmost column). Use null if not shown.
- description: the full transaction description. If it spans two lines, join them with a space.
  Do NOT include transaction type codes (SO, FPO, FPI, DD, etc.) in the description.
- If the page has no transactions (e.g. cover page, legal notice, summary), return {"transactions": []}.
- Do NOT hallucinate transactions. Only extract what is clearly visible.
- Return ONLY the JSON object, no markdown, no explanation.

Output format:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "balance": number or null
    }
  ]
}"""


def _build_extraction_prompt(bank_name: str) -> str:
    hint = _BANK_LAYOUT_HINTS.get(bank_name, _DEFAULT_LAYOUT_HINT)
    return f"Bank: {bank_name}\nLayout hint: {hint}\n\nExtract all transactions from this page."


# ─── Date patterns used to cross-check Claude's output against raw text ───────
# Matches HSBC "01 Apr 2026" and Lloyds "04 Apr 26" formats
_DATE_PATTERN = re.compile(
    r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}\b",
    re.IGNORECASE,
)


def _count_dates_in_text(raw_text: str) -> int:
    """Count transaction-date-like occurrences in raw PyMuPDF text for a page."""
    return len(_DATE_PATTERN.findall(raw_text))


def _call_claude_for_page(
    client: anthropic.Anthropic,
    img_base64: str,
    user_prompt: str,
    retry_hint: str = "",
) -> list[dict]:
    """
    Call Claude Vision for one page and return the parsed transactions list.
    Returns [] on JSON parse failure (caller decides whether to retry).
    """
    prompt_text = user_prompt
    if retry_hint:
        prompt_text = f"{retry_hint}\n\n{user_prompt}"

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        # 8192 is the Haiku max — gives ~68-100 transactions of headroom per page
        max_tokens=8192,
        system=_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": img_base64,
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt_text,
                    },
                ],
            }
        ],
    )

    output_text = response.content[0].text.strip()

    # Strip markdown code fences if Claude wraps the JSON
    if output_text.startswith("```"):
        output_text = re.sub(r"^```[a-z]*\n?", "", output_text)
        output_text = re.sub(r"\n?```$", "", output_text)

    try:
        page_data = json.loads(output_text)
        return page_data.get("transactions", [])
    except json.JSONDecodeError:
        return []


def extract_transactions_from_images(state: BankStatementState) -> BankStatementState:
    """
    [CLAUDE] Run Claude claude-haiku-4-5 Vision over each page image and aggregate transactions.

    Reliability improvements over the naive approach:
    1. max_tokens=8192 (was 4096) — prevents truncation on dense pages.
    2. PyMuPDF text cross-check — counts date patterns in raw text to detect
       when Claude has missed rows, then retries with an explicit count hint.
    3. Retry with hint — if the cross-check finds a significant shortfall,
       Claude is called a second time with a message like
       "I can see ~12 transaction dates but you only returned 7. Re-read carefully."

    The real HSBC/Lloyds PDFs in bank_statements/ were used to calibrate the
    date regex and the retry threshold.
    """
    if state.get("error"):
        return state

    try:
        print(
            f"🔄 Extracting transactions with Claude Vision (bank: {state.get('bank_name', 'Unknown')})..."
        )
        client = _get_anthropic_client()
        user_prompt = _build_extraction_prompt(state.get("bank_name", "Unknown Bank"))
        all_transactions = []

        # Re-open the PDF for raw text cross-checking (already closed after image render)
        pdf_doc_for_text = fitz.open(state["pdf_path"])

        for page_num, img_base64 in enumerate(state["pdf_images"], 1):
            print(
                f"   Processing page {page_num}/{len(state['pdf_images'])}...", end=" "
            )

            # ── First pass ────────────────────────────────────────────────────
            page_transactions = _call_claude_for_page(client, img_base64, user_prompt)

            # ── Cross-check with PyMuPDF raw text ─────────────────────────────
            # Count date-like patterns in the raw text of this page.
            # If Claude returned significantly fewer transactions than dates found,
            # it likely truncated or missed rows — retry with an explicit hint.
            raw_text = pdf_doc_for_text[page_num - 1].get_text()
            date_count = _count_dates_in_text(raw_text)

            # Threshold: retry if Claude returned ≥2 fewer than the date count
            # (allow 1 off for opening/closing balance lines that look like dates)
            shortfall = date_count - len(page_transactions)
            if shortfall >= 2 and date_count > 0:
                print(
                    f"⚠ Cross-check: {date_count} dates in text but only "
                    f"{len(page_transactions)} transactions returned — retrying...",
                    end=" ",
                )
                retry_hint = (
                    f"IMPORTANT: I can detect approximately {date_count} transaction "
                    f"date entries in this page's text, but your previous response only "
                    f"contained {len(page_transactions)} transactions. "
                    f"Please re-read the entire page very carefully, including rows near "
                    f"the top and bottom of the table, and extract ALL {date_count} transactions. "
                    f"Do not skip any row."
                )
                retry_transactions = _call_claude_for_page(
                    client, img_base64, user_prompt, retry_hint=retry_hint
                )
                # Use the retry result only if it found more transactions
                if len(retry_transactions) > len(page_transactions):
                    page_transactions = retry_transactions
                    print(f"✓ Retry found {len(page_transactions)} transactions")
                else:
                    print(f"✓ Retry did not improve ({len(page_transactions)} kept)")
            else:
                print(f"✓ Found {len(page_transactions)} transactions")

            all_transactions.extend(page_transactions)

        pdf_doc_for_text.close()

        # ── Post-processing: validate, filter, and normalise ──────────────────

        # HSBC payment-type prefixes that sometimes bleed into descriptions
        _TYPE_PREFIX = re.compile(
            r"^(?:VIS|CR|DR|ATM|BP|DD|SO|FPI|FPO|BGC|CHQ|TFR|DEP|DEB|MPI|MPO|PAY|FEE|CHG|COR|CPT)\s+",
            re.IGNORECASE,
        )
        # Rows that are balance markers, not real transactions
        _SKIP_DESCRIPTIONS = {
            "balance brought forward",
            "balance carried forward",
            "balance b/f",
            "balance c/f",
        }

        cleaned = []
        for t in all_transactions:
            if not t.get("date") or not t.get("description"):
                continue

            desc = str(t["description"]).strip()

            # Skip balance marker rows
            if desc.lower() in _SKIP_DESCRIPTIONS:
                continue
            # Also skip if description starts with "BALANCE BROUGHT" / "BALANCE CARRIED"
            if re.match(r"^balance\s+(brought|carried)", desc, re.IGNORECASE):
                continue

            # Strip payment-type prefix from description if present
            desc = _TYPE_PREFIX.sub("", desc).strip()

            try:
                cleaned.append(
                    {
                        "date": str(t["date"]),
                        "description": desc,
                        "amount": (
                            float(t["amount"]) if t.get("amount") is not None else 0.0
                        ),
                        "balance": (
                            float(t["balance"])
                            if t.get("balance") is not None
                            else None
                        ),
                    }
                )
            except (ValueError, TypeError):
                continue

        state["transactions"] = cleaned
        print(f"✓ Total extracted: {len(cleaned)} transactions")

    except Exception as e:
        state["error"] = f"Error extracting transactions: {str(e)}"
        print(f"✗ {state['error']}")
        import traceback

        traceback.print_exc()

    return state


# [/CLAUDE]


# [NUEXTRACT] ─── NuExtract extraction (commented out) ────────────────────────
# def extract_transactions_from_images_nuextract(state: BankStatementState):
#     """Run NuExtract over each page image and aggregate extracted transactions."""
#     if state.get("error"):
#         return state
#     try:
#         print("🔄 Extracting transactions with NuExtract...")
#         template = {
#             "transactions": [
#                 {"date": "date-time", "description": "string",
#                  "amount": "number", "balance": "number"}
#             ]
#         }
#         all_transactions = []
#         for page_num, img_base64 in enumerate(state["pdf_images"], 1):
#             print(f"   Processing page {page_num}/{len(state['pdf_images'])}...", end=" ")
#             messages = [{"role": "user", "content": [{
#                 "type": "image",
#                 "image": f"data:image/jpeg;base64,{img_base64}",
#             }]}]
#             text = PROCESSOR.tokenizer.apply_chat_template(
#                 messages,
#                 template=json.dumps(template, indent=2),
#                 tokenize=False,
#                 add_generation_prompt=True,
#             )
#             inputs = PROCESSOR(
#                 text=[text],
#                 images=_process_all_vision_info(messages),
#                 padding=True,
#                 return_tensors="pt",
#             ).to(MODEL.device)
#             generated_ids = MODEL.generate(
#                 **inputs, do_sample=False, num_beams=1, max_new_tokens=4096,
#             )
#             trimmed = [out[len(inp):] for inp, out in zip(inputs.input_ids, generated_ids)]
#             output_text = PROCESSOR.batch_decode(
#                 trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False,
#             )[0]
#             try:
#                 page_data = json.loads(output_text)
#                 page_transactions = page_data.get("transactions", [])
#                 all_transactions.extend(page_transactions)
#                 print(f"✓ Found {len(page_transactions)} transactions")
#             except json.JSONDecodeError:
#                 print(f"⚠ JSON parse error on page {page_num}")
#         cleaned = [
#             {
#                 "date": str(t.get("date", "")),
#                 "description": str(t.get("description", "")),
#                 "amount": float(t["amount"]) if t.get("amount") else 0.0,
#                 "balance": float(t["balance"]) if t.get("balance") else None,
#             }
#             for t in all_transactions
#             if t.get("date") and t.get("description")
#         ]
#         state["transactions"] = cleaned
#         print(f"✓ Total extracted: {len(cleaned)} transactions")
#     except Exception as e:
#         state["error"] = f"Error extracting transactions: {str(e)}"
#         print(f"✗ {state['error']}")
#         import traceback
#         traceback.print_exc()
#     return state
# [/NUEXTRACT]


def format_output(state: BankStatementState) -> BankStatementState:
    """Print a formatted summary to stdout (useful when running as a script)."""
    if state.get("error") and not state.get("transactions"):
        print(f"\n❌ Error: {state['error']}")
        return state

    transactions = state["transactions"]
    total_in = total_out = 0

    print("\n" + "=" * 80)
    print(f"EXTRACTED TRANSACTIONS  [{state.get('bank_name', 'Unknown Bank')}]")
    print("=" * 80)

    for i, t in enumerate(transactions, 1):
        amount = t.get("amount", 0)
        if amount >= 0:
            total_in += amount
            amount_str = f"+£{amount:.2f}"
        else:
            total_out += abs(amount)
            amount_str = f"-£{abs(amount):.2f}"

        print(f"\n{i}. {t.get('date', 'N/A')}")
        print(f"   {t.get('description', 'N/A')}")
        print(f"   Amount: {amount_str}", end="")
        print(f" | Balance: £{t['balance']:.2f}" if t.get("balance") else "")

    print("\n" + "=" * 80)
    print(f"Total transactions : {len(transactions)}")
    print(f"Total paid in      : £{total_in:.2f}")
    print(f"Total paid out     : £{total_out:.2f}")
    print(f"Net                : £{(total_in - total_out):.2f}")
    print("=" * 80)

    return state


# ─── Graph ────────────────────────────────────────────────────────────────────


def create_workflow():
    """Build and compile the extraction LangGraph workflow."""
    workflow = StateGraph(BankStatementState)

    workflow.add_node("guard", detect_bank_and_guard)
    workflow.add_node("convert_pdf", convert_pdf_to_images)
    workflow.add_node("extract_transactions", extract_transactions_from_images)
    workflow.add_node("format_output", format_output)

    workflow.set_entry_point("guard")
    workflow.add_edge("guard", "convert_pdf")
    workflow.add_edge("convert_pdf", "extract_transactions")
    workflow.add_edge("extract_transactions", "format_output")
    workflow.add_edge("format_output", END)

    return workflow.compile()


# ─── Public API ───────────────────────────────────────────────────────────────


def process_bank_statement(pdf_path: str) -> tuple[List[Dict], str]:
    """
    Run the full extraction workflow on a PDF.

    Returns:
        (transactions, bank_name) — transactions is a list of dicts with keys:
        date, description, amount, balance.
        bank_name is the detected bank (e.g. "HSBC", "Lloyds").

    Raises:
        ValueError: if the PDF is not a bank statement (guard rejection).
        RuntimeError: for other processing errors.
    """
    print(f"\n🏦 Processing bank statement: {pdf_path}")
    print("-" * 80)

    app = create_workflow()

    final_state = app.invoke(
        {
            "pdf_path": pdf_path,
            "bank_name": "",
            "pdf_images": [],
            "transactions": [],
            "error": "",
        }
    )

    if final_state.get("error"):
        # Distinguish guard rejection from processing errors
        err = final_state["error"]
        if "does not appear to be a bank statement" in err:
            raise ValueError(err)
        raise RuntimeError(err)

    return final_state["transactions"], final_state.get("bank_name", "Unknown Bank")


# ─── Script entry point ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    pdf_file = sys.argv[1] if len(sys.argv) > 1 else "assets/sample_bank_statement.pdf"
    try:
        transactions, bank = process_bank_statement(pdf_file)
    except (ValueError, RuntimeError) as exc:
        print(f"\n❌ {exc}")
        sys.exit(1)

    if transactions:
        import json as _json

        output_file = "transactions.json"
        with open(output_file, "w") as f:
            _json.dump(transactions, f, indent=2)
        print(f"\n💾 Transactions saved to {output_file}")

    print(f"\n📊 Returned {len(transactions)} transactions from {bank}")
