"""
Bank Statement Transaction Extractor using LangGraph + NuExtract
Much more reliable than LLM-based extraction
"""

from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, END
import torch
from transformers import AutoProcessor, AutoModelForVision2Seq
from qwen_vl_utils import process_vision_info
import json
import base64
import fitz  # PyMuPDF - no poppler needed!


# Define the state structure
class BankStatementState(TypedDict):
    pdf_path: str
    pdf_images: List[str]  # Base64 encoded images
    transactions: List[Dict[str, str]]
    error: str


# Global model and processor (load once)
MODEL = None
PROCESSOR = None


def initialize_model(state: BankStatementState) -> BankStatementState:
    """Initialize NuExtract model (only once)"""
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
    """Convert PDF pages to images using PyMuPDF (no poppler needed)"""
    try:
        print("🔄 Converting PDF to images...")

        # Open PDF with PyMuPDF
        pdf_document = fitz.open(state["pdf_path"])

        base64_images = []
        for page_num in range(len(pdf_document)):
            # Render page to image
            page = pdf_document[page_num]

            # Convert to pixmap (image) at 2x resolution for better OCR
            mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
            pix = page.get_pixmap(matrix=mat)

            # Convert to PIL Image
            img_data = pix.tobytes("jpeg")

            # Encode to base64
            img_base64 = base64.b64encode(img_data).decode()
            base64_images.append(img_base64)

        pdf_document.close()

        state["pdf_images"] = base64_images
        print(f"✓ Converted PDF to {len(base64_images)} images")

    except Exception as e:
        state["error"] = f"Error converting PDF: {str(e)}"
        print(f"✗ {state['error']}")

    return state


def process_all_vision_info(messages, examples=None):
    """Helper function from NuExtract docs"""
    from qwen_vl_utils import fetch_image

    def extract_example_images(example_item):
        if not example_item:
            return []
        examples_to_process = (
            example_item if isinstance(example_item, list) else [example_item]
        )
        images = []
        for example in examples_to_process:
            if (
                isinstance(example.get("input"), dict)
                and example["input"].get("type") == "image"
            ):
                images.append(fetch_image(example["input"]))
        return images

    is_batch = messages and isinstance(messages[0], list)
    messages_batch = messages if is_batch else [messages]
    is_batch_examples = (
        examples
        and isinstance(examples, list)
        and (isinstance(examples[0], list) or examples[0] is None)
    )
    examples_batch = (
        examples
        if is_batch_examples
        else ([examples] if examples is not None else None)
    )

    all_images = []
    for i, message_group in enumerate(messages_batch):
        if examples and i < len(examples_batch):
            input_example_images = extract_example_images(examples_batch[i])
            all_images.extend(input_example_images)

        input_message_images = process_vision_info(message_group)[0] or []
        all_images.extend(input_message_images)

    return all_images if all_images else None


def extract_transactions_from_images(state: BankStatementState) -> BankStatementState:
    """Extract transactions using NuExtract"""
    if state.get("error"):
        return state

    try:
        print("🔄 Extracting transactions with NuExtract...")

        # Define the schema we want to extract
        # Define the schema - SIMPLIFIED
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

        # Process each page
        for page_num, img_base64 in enumerate(state["pdf_images"], 1):
            print(
                f"   Processing page {page_num}/{len(state['pdf_images'])}...", end=" "
            )

            # Create image input
            document = {
                "type": "image",
                "image": f"data:image/jpeg;base64,{img_base64}",
            }

            messages = [{"role": "user", "content": [document]}]

            text = PROCESSOR.tokenizer.apply_chat_template(
                messages,
                template=json.dumps(template, indent=2),
                tokenize=False,
                add_generation_prompt=True,
            )

            image_inputs = process_all_vision_info(messages)

            inputs = PROCESSOR(
                text=[text],
                images=image_inputs,
                padding=True,
                return_tensors="pt",
            ).to(MODEL.device)

            # Generate extraction
            generation_config = {
                "do_sample": False,
                "num_beams": 1,
                "max_new_tokens": 4096,
            }

            generated_ids = MODEL.generate(**inputs, **generation_config)

            generated_ids_trimmed = [
                out_ids[len(in_ids) :]
                for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
            ]

            output_text = PROCESSOR.batch_decode(
                generated_ids_trimmed,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False,
            )[0]

            # Parse JSON output
            try:
                page_data = json.loads(output_text)
                page_transactions = page_data.get("transactions", [])
                all_transactions.extend(page_transactions)
                print(f"✓ Found {len(page_transactions)} transactions")
            except json.JSONDecodeError as e:
                print(f"⚠ JSON parse error on page {page_num}")
                continue

        # Clean and validate transactions - SIMPLIFIED
        cleaned_transactions = []
        for t in all_transactions:
            if t.get("date") and t.get("description"):
                cleaned_transactions.append(
                    {
                        "date": str(t.get("date", "")),
                        "description": str(t.get("description", "")),
                        "amount": float(t.get("amount", 0)) if t.get("amount") else 0.0,
                        "balance": (
                            float(t.get("balance", 0)) if t.get("balance") else None
                        ),
                    }
                )

        state["transactions"] = cleaned_transactions
        print(f"✓ Total extracted: {len(cleaned_transactions)} transactions")

    except Exception as e:
        state["error"] = f"Error extracting transactions: {str(e)}"
        print(f"✗ {state['error']}")
        import traceback

        traceback.print_exc()

    return state


def format_output(state: BankStatementState) -> BankStatementState:
    """Format and display the transactions"""
    if state.get("error") and not state.get("transactions"):
        print(f"\n❌ Error: {state['error']}")
        return state

    transactions = state["transactions"]

    print("\n" + "=" * 80)
    print("EXTRACTED TRANSACTIONS")
    print("=" * 80)

    total_in = 0
    total_out = 0

    for i, transaction in enumerate(transactions, 1):
        amount = transaction.get("amount", 0)
        if amount >= 0:
            total_in += amount
            amount_str = f"+£{amount:.2f}"
        else:
            total_out += abs(amount)
            amount_str = f"-£{abs(amount):.2f}"

        print(f"\n{i}. {transaction.get('date', 'N/A')}")
        print(f"   {transaction.get('description', 'N/A')}")
        print(f"   Type: {transaction.get('type', 'N/A')}")
        print(f"   Amount: {amount_str}", end="")
        if transaction.get("balance"):
            print(f" | Balance: £{transaction.get('balance'):.2f}")
        else:
            print()

    print("\n" + "=" * 80)
    print(f"Total transactions: {len(transactions)}")
    print(f"Total paid in: £{total_in:.2f}")
    print(f"Total paid out: £{total_out:.2f}")
    print(f"Net: £{(total_in - total_out):.2f}")
    print("=" * 80)

    return state


# Build the LangGraph workflow
def create_workflow():
    """Create the LangGraph workflow"""
    workflow = StateGraph(BankStatementState)

    # Add nodes
    workflow.add_node("initialize_model", initialize_model)
    workflow.add_node("convert_pdf", convert_pdf_to_images)
    workflow.add_node("extract_transactions", extract_transactions_from_images)
    workflow.add_node("format_output", format_output)

    # Define the flow
    workflow.set_entry_point("initialize_model")
    workflow.add_edge("initialize_model", "convert_pdf")
    workflow.add_edge("convert_pdf", "extract_transactions")
    workflow.add_edge("extract_transactions", "format_output")
    workflow.add_edge("format_output", END)

    return workflow.compile()


def process_bank_statement(pdf_path: str) -> List[Dict[str, str]]:
    """Main function to process a bank statement PDF"""
    print(f"\n🏦 Processing bank statement: {pdf_path}")
    print("-" * 80)

    # Create the workflow
    app = create_workflow()

    # Run the workflow
    initial_state = {
        "pdf_path": pdf_path,
        "pdf_images": [],
        "transactions": [],
        "error": "",
    }

    final_state = app.invoke(initial_state)

    return final_state["transactions"]


# Example usage
if __name__ == "__main__":
    # Replace with your PDF file path
    pdf_file = "./assets/sample_bank_statement.pdf"

    transactions = process_bank_statement(pdf_file)

    # Export to JSON file
    if transactions:
        output_file = "transactions.json"
        with open(output_file, "w") as f:
            json.dump(transactions, f, indent=2)
        print(f"\n💾 Transactions saved to {output_file}")

    print(f"\n📊 Returned {len(transactions)} transactions as Python list")
