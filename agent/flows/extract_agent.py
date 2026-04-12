"""
Extraction Flow — LangGraph Workflow
Uses NuExtract-2.0-2B (vision model) to read PDF bank statements
and extract structured transaction data page by page.
"""

import json
import base64
from typing import TypedDict, List, Dict

import fitz  # PyMuPDF — no poppler needed
import torch
from transformers import AutoProcessor, AutoModelForVision2Seq
from qwen_vl_utils import process_vision_info
from langgraph.graph import StateGraph, END

# ─── State ────────────────────────────────────────────────────────────────────

class BankStatementState(TypedDict):
    pdf_path: str
    pdf_images: List[str]       # Base64-encoded JPEG images, one per page
    transactions: List[Dict[str, str]]
    error: str


# ─── Model (loaded once globally) ────────────────────────────────────────────

MODEL = None
PROCESSOR = None


# ─── Nodes ────────────────────────────────────────────────────────────────────

def initialize_model(state: BankStatementState) -> BankStatementState:
    """Load NuExtract-2.0-2B on first call; no-op on subsequent calls."""
    global MODEL, PROCESSOR

    if MODEL is None:
        print("🔄 Loading NuExtract-2.0-2B model (first time only)...")
        try:
            model_name = "numind/NuExtract-2.0-2B"

            MODEL = AutoModelForVision2Seq.from_pretrained(
                model_name,
                trust_remote_code=True,
                torch_dtype=torch.bfloat16,
                device_map="auto",
            )

            PROCESSOR = AutoProcessor.from_pretrained(
                model_name, trust_remote_code=True, padding_side="left", use_fast=True
            )

            print("✓ Model loaded successfully")
        except Exception as e:
            state["error"] = f"Error loading model: {str(e)}"
            print(f"✗ {state['error']}")

    return state


def convert_pdf_to_images(state: BankStatementState) -> BankStatementState:
    """Render each PDF page to a base64 JPEG using PyMuPDF (no poppler needed)."""
    try:
        print("🔄 Converting PDF to images...")

        pdf_document = fitz.open(state["pdf_path"])
        base64_images = []

        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            mat = fitz.Matrix(2.0, 2.0)   # 2× zoom for better OCR accuracy
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


def _process_all_vision_info(messages, examples=None):
    """Collect image inputs for NuExtract (follows qwen_vl_utils API)."""
    from qwen_vl_utils import fetch_image

    def extract_example_images(example_item):
        if not example_item:
            return []
        items = example_item if isinstance(example_item, list) else [example_item]
        return [
            fetch_image(ex["input"])
            for ex in items
            if isinstance(ex.get("input"), dict) and ex["input"].get("type") == "image"
        ]

    is_batch = messages and isinstance(messages[0], list)
    messages_batch = messages if is_batch else [messages]
    is_batch_examples = (
        examples
        and isinstance(examples, list)
        and (isinstance(examples[0], list) or examples[0] is None)
    )
    examples_batch = (
        examples if is_batch_examples else ([examples] if examples is not None else None)
    )

    all_images = []
    for i, message_group in enumerate(messages_batch):
        if examples and i < len(examples_batch):
            all_images.extend(extract_example_images(examples_batch[i]))
        all_images.extend(process_vision_info(message_group)[0] or [])

    return all_images if all_images else None


def extract_transactions_from_images(state: BankStatementState) -> BankStatementState:
    """Run NuExtract over each page image and aggregate extracted transactions."""
    if state.get("error"):
        return state

    try:
        print("🔄 Extracting transactions with NuExtract...")

        template = {
            "transactions": [
                {
                    "date": "date-time",
                    "description": "string",
                    "amount": "number",
                    "balance": "number",
                }
            ]
        }

        all_transactions = []

        for page_num, img_base64 in enumerate(state["pdf_images"], 1):
            print(f"   Processing page {page_num}/{len(state['pdf_images'])}...", end=" ")

            messages = [{"role": "user", "content": [{
                "type": "image",
                "image": f"data:image/jpeg;base64,{img_base64}",
            }]}]

            text = PROCESSOR.tokenizer.apply_chat_template(
                messages,
                template=json.dumps(template, indent=2),
                tokenize=False,
                add_generation_prompt=True,
            )

            inputs = PROCESSOR(
                text=[text],
                images=_process_all_vision_info(messages),
                padding=True,
                return_tensors="pt",
            ).to(MODEL.device)

            generated_ids = MODEL.generate(
                **inputs,
                do_sample=False,
                num_beams=1,
                max_new_tokens=4096,
            )

            trimmed = [
                out[len(inp):]
                for inp, out in zip(inputs.input_ids, generated_ids)
            ]

            output_text = PROCESSOR.batch_decode(
                trimmed,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False,
            )[0]

            try:
                page_data = json.loads(output_text)
                page_transactions = page_data.get("transactions", [])
                all_transactions.extend(page_transactions)
                print(f"✓ Found {len(page_transactions)} transactions")
            except json.JSONDecodeError:
                print(f"⚠ JSON parse error on page {page_num}")

        # Validate and normalise
        cleaned = [
            {
                "date": str(t.get("date", "")),
                "description": str(t.get("description", "")),
                "amount": float(t["amount"]) if t.get("amount") else 0.0,
                "balance": float(t["balance"]) if t.get("balance") else None,
            }
            for t in all_transactions
            if t.get("date") and t.get("description")
        ]

        state["transactions"] = cleaned
        print(f"✓ Total extracted: {len(cleaned)} transactions")

    except Exception as e:
        state["error"] = f"Error extracting transactions: {str(e)}"
        print(f"✗ {state['error']}")
        import traceback
        traceback.print_exc()

    return state


def format_output(state: BankStatementState) -> BankStatementState:
    """Print a formatted summary to stdout (useful when running as a script)."""
    if state.get("error") and not state.get("transactions"):
        print(f"\n❌ Error: {state['error']}")
        return state

    transactions = state["transactions"]
    total_in = total_out = 0

    print("\n" + "=" * 80)
    print("EXTRACTED TRANSACTIONS")
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

    workflow.add_node("initialize_model", initialize_model)
    workflow.add_node("convert_pdf", convert_pdf_to_images)
    workflow.add_node("extract_transactions", extract_transactions_from_images)
    workflow.add_node("format_output", format_output)

    workflow.set_entry_point("initialize_model")
    workflow.add_edge("initialize_model", "convert_pdf")
    workflow.add_edge("convert_pdf", "extract_transactions")
    workflow.add_edge("extract_transactions", "format_output")
    workflow.add_edge("format_output", END)

    return workflow.compile()


# ─── Public API ───────────────────────────────────────────────────────────────

def process_bank_statement(pdf_path: str) -> List[Dict[str, str]]:
    """
    Run the full extraction workflow on a PDF and return the transactions list.

    Args:
        pdf_path: Absolute or relative path to the bank statement PDF.

    Returns:
        List of transaction dicts with keys: date, description, amount, balance.
    """
    print(f"\n🏦 Processing bank statement: {pdf_path}")
    print("-" * 80)

    app = create_workflow()

    final_state = app.invoke({
        "pdf_path": pdf_path,
        "pdf_images": [],
        "transactions": [],
        "error": "",
    })

    return final_state["transactions"]


# ─── Script entry point ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    pdf_file = sys.argv[1] if len(sys.argv) > 1 else "../../assets/sample_bank_statement.pdf"
    transactions = process_bank_statement(pdf_file)

    if transactions:
        import json as _json
        output_file = "transactions.json"
        with open(output_file, "w") as f:
            _json.dump(transactions, f, indent=2)
        print(f"\n💾 Transactions saved to {output_file}")

    print(f"\n📊 Returned {len(transactions)} transactions")
