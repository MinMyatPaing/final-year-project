"""
Qwen2.5-VL for Bank Statement Extraction
Works out-of-the-box without fine-tuning
Better accuracy than Donut and NuExtract
"""

from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
import torch
from PIL import Image
import fitz  # PyMuPDF
import json
import re


class QwenBankStatementExtractor:
    def __init__(self, model_name="Qwen/Qwen2-VL-7B-Instruct"):
        """
        Initialize Qwen2.5-VL model for bank statement extraction

        Models:
        - Qwen/Qwen2-VL-2B-Instruct (faster, fits 16GB easily)
        - Qwen/Qwen2-VL-7B-Instruct (more accurate, recommended)
        """
        print(f"🔄 Loading Qwen model: {model_name}")

        self.model = Qwen2VLForConditionalGeneration.from_pretrained(
            model_name, torch_dtype=torch.bfloat16, device_map="auto"
        )

        self.processor = AutoProcessor.from_pretrained(model_name)

        print(f"✓ Model loaded on {self.model.device}")

    def extract_from_pdf(self, pdf_path):
        """Extract transactions from bank statement PDF"""
        print(f"📄 Processing: {pdf_path}")

        # Convert PDF to images
        pdf_document = fitz.open(pdf_path)
        all_transactions = []

        for page_num in range(len(pdf_document)):
            print(f"   Page {page_num + 1}/{len(pdf_document)}...", end=" ")

            # Render page to image
            page = pdf_document[page_num]
            mat = fitz.Matrix(2.0, 2.0)  # 2x resolution
            pix = page.get_pixmap(matrix=mat)

            # Convert to PIL Image
            import io

            img = Image.open(io.BytesIO(pix.tobytes("jpeg")))

            # Extract transactions from this page
            page_transactions = self.extract_from_image(img)
            all_transactions.extend(page_transactions)

            print(f"✓ {len(page_transactions)} transactions")

        pdf_document.close()

        print(f"\n✓ Total: {len(all_transactions)} transactions")
        return all_transactions

    def extract_from_image(self, image):
        """Extract transactions from a single image"""

        # Create detailed prompt for extraction
        prompt = """Analyze this bank statement page and extract ALL transactions.

For each transaction, extract:
- date: Transaction date (format as YYYY-MM-DD)
- description: Full transaction description
- type: One of: credit, debit, card_payment, direct_debit, cash_deposit, cash_withdrawal, transfer
- amount: Transaction amount (positive for credits/deposits, negative for debits/withdrawals)
- balance: Account balance after transaction (if shown)

CRITICAL RULES:
1. "CR" or "CASH IN" or "PIM" = credit (positive amount)
2. "BP" or "DD" or "ATM" or "VIS" or ")))" = debit (negative amount)
3. Multi-line transactions should be combined into one entry
4. For dates like "21 Aug 25", convert to "2025-08-21"
5. Remove commas from amounts (1,000.00 → 1000.00)

Return ONLY a JSON array, no other text:
[
  {"date": "2025-08-21", "description": "Cash deposit HSBC", "type": "cash_deposit", "amount": 750.00, "balance": 927.57},
  {"date": "2025-08-21", "description": "Tesco Stores", "type": "card_payment", "amount": -34.20, "balance": 893.37}
]"""

        # Prepare messages
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": prompt},
                ],
            }
        ]

        # Apply chat template
        text = self.processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )

        # Process vision info - returns tuple (image_list, image_sizes)
        vision_info = process_vision_info(messages)

        # Extract image list from tuple and ensure it's a list (not tuple)
        if isinstance(vision_info, tuple):
            image_list = vision_info[0]  # Extract image list from tuple
            # Convert to list if it's still a tuple
            if isinstance(image_list, tuple):
                image_inputs = list(image_list)
            elif isinstance(image_list, list):
                image_inputs = image_list
            else:
                image_inputs = [image_list] if image_list is not None else None
        elif isinstance(vision_info, list):
            image_inputs = vision_info
        else:
            # If it's a single image or None, convert to list
            image_inputs = [vision_info] if vision_info is not None else None

        # Final check: ensure image_inputs is a list or None (never a tuple)
        if image_inputs is not None:
            if isinstance(image_inputs, tuple):
                image_inputs = list(image_inputs)
            elif not isinstance(image_inputs, list):
                image_inputs = [image_inputs]

        # Prepare inputs - pass images as list or None
        inputs = self.processor(
            text=[text],
            images=image_inputs if image_inputs else None,
            padding=True,
            return_tensors="pt",
        ).to(self.model.device)

        # Generate
        generated_ids = self.model.generate(
            **inputs,
            max_new_tokens=4096,
            temperature=0.1,  # Low temperature for structured output
            do_sample=False,
        )

        # Decode
        generated_ids_trimmed = [
            out_ids[len(in_ids) :]
            for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]

        output_text = self.processor.batch_decode(
            generated_ids_trimmed,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=False,
        )[0]

        # Parse JSON
        transactions = self._parse_output(output_text)
        return transactions

    def _parse_output(self, output_text):
        """Parse model output into structured transactions"""
        try:
            # Remove markdown code blocks if present
            if "```" in output_text:
                match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", output_text)
                if match:
                    output_text = match.group(1)

            # Find JSON array
            start_idx = output_text.find("[")
            end_idx = output_text.rfind("]")

            if start_idx != -1 and end_idx != -1:
                json_str = output_text[start_idx : end_idx + 1]
                transactions = json.loads(json_str)

                # Validate and clean
                cleaned = []
                for t in transactions:
                    if isinstance(t, dict) and "date" in t and "description" in t:
                        cleaned.append(
                            {
                                "date": t.get("date", ""),
                                "description": t.get("description", ""),
                                "type": t.get("type", "unknown"),
                                "amount": float(t.get("amount", 0)),
                                "balance": (
                                    float(t.get("balance", 0))
                                    if t.get("balance")
                                    else None
                                ),
                            }
                        )

                return cleaned

            return []

        except json.JSONDecodeError as e:
            print(f"⚠ JSON parse error: {e}")
            return []
        except Exception as e:
            print(f"⚠ Parse error: {e}")
            return []


# ==============================================================================
# USAGE
# ==============================================================================

if __name__ == "__main__":
    # Initialize extractor
    # Use 2B for faster inference, 7B for better accuracy
    extractor = QwenBankStatementExtractor("Qwen/Qwen2-VL-2B-Instruct")

    # Extract transactions
    transactions = extractor.extract_from_pdf("./assets/sample_bank_statement.pdf")

    # Display results
    print("\n" + "=" * 80)
    print("EXTRACTED TRANSACTIONS")
    print("=" * 80)

    total_in = 0
    total_out = 0

    for i, t in enumerate(transactions, 1):
        amount = t["amount"]
        if amount >= 0:
            total_in += amount
            amount_str = f"+£{amount:.2f}"
        else:
            total_out += abs(amount)
            amount_str = f"-£{abs(amount):.2f}"

        print(f"\n{i}. {t['date']}")
        print(f"   {t['description']}")
        print(f"   Type: {t['type']}")
        print(f"   Amount: {amount_str}", end="")
        if t["balance"]:
            print(f" | Balance: £{t['balance']:.2f}")
        else:
            print()

    print("\n" + "=" * 80)
    print(f"Total transactions: {len(transactions)}")
    print(f"Total paid in: £{total_in:.2f}")
    print(f"Total paid out: £{total_out:.2f}")
    print(f"Net: £{(total_in - total_out):.2f}")
    print("=" * 80)

    # Save to JSON
    with open("transactions.json", "w") as f:
        json.dump(transactions, f, indent=2)
    print("\n💾 Saved to transactions.json")
