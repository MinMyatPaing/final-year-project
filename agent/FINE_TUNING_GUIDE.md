# Fine-Tuning NuExtract-2.0-2B for Bank Statement Extraction

> **Status:** Planning document — not yet implemented.  
> **Author:** Generated as a practical roadmap.

---

## 1. Is It Worth Doing? — TL;DR

| Question | Answer |
|----------|--------|
| Can NuExtract-2.0-2B be fine-tuned? | **Yes.** It is built on Qwen2.5-VL-2B, an open-weight vision-language model. LoRA fine-tuning is well-documented. |
| Will accuracy improve? | **Yes — meaningfully.** The base model is a general-purpose extractor. A domain-tuned version that has seen HSBC and Lloyds layouts specifically will make far fewer field-level errors. |
| Is the RTX 5070 Ti enough? | **Yes.** The 5070 Ti has 16 GB VRAM (or 24 GB depending on variant). QLoRA on a 2B model requires ~6–10 GB. You have headroom. |
| Is the Mac M3 Pro enough? | For *inference* yes. For *training* no — use the Windows/RTX machine. Metal does not support `bfloat16` training well and has no CUDA kernel support. |
| How many samples do you need? | ~50–150 labelled pages per bank type is enough for LoRA. More is better but not required. |
| What is the biggest risk? | **Under-labelling.** If your ground-truth JSON has errors, the model learns the wrong thing. Quality > quantity. |

---

## 2. Two Immediate Goals

### Goal A — Reject Non-Bank Statements (Guard)

Before fine-tuning anything, add a **classification guard** at the API layer that rejects uploads that are not bank statements. This is a two-line text check and does not require ML.

#### Option 1: Heuristic text check (fast, deploy now)

When the PDF is converted to images, also extract raw text using PyMuPDF's `.get_text()`:

```python
import fitz

def is_likely_bank_statement(pdf_path: str) -> bool:
    """
    Returns True if the PDF appears to be a bank statement.
    Checks for keywords common in HSBC and Lloyds statements.
    """
    KEYWORDS = [
        "sort code", "account number", "balance brought forward",
        "balance carried forward", "transactions", "date", "description",
        "paid in", "paid out", "debit", "credit",
        "statement period", "opening balance", "closing balance",
        "hsbc", "lloyds", "barclays", "natwest", "santander",
    ]
    MIN_KEYWORD_HITS = 3   # tune this threshold

    doc = fitz.open(pdf_path)
    full_text = " ".join(
        page.get_text().lower()
        for page in doc
    ).replace("\n", " ")
    doc.close()

    hits = sum(1 for kw in KEYWORDS if kw in full_text)
    return hits >= MIN_KEYWORD_HITS
```

Wire this into `api.py` before calling `process_bank_statement()`:

```python
if not is_likely_bank_statement(tmp_path):
    return JSONResponse(
        status_code=422,
        content={"error": "This does not appear to be a bank statement PDF. Please upload an official HSBC or Lloyds statement."}
    )
```

#### Option 2: Lightweight classifier (better long-term)

Train a tiny image classifier (ResNet-18 or EfficientNet-B0) on the *first page* of the PDF to distinguish bank statement / not bank statement. This takes ~1 hour to train with 200 examples. Only needed if heuristic gives false positives.

---

## 3. Understanding the Current Model

NuExtract-2.0-2B is `numind/NuExtract-2.0-2B` on HuggingFace:

- **Architecture:** Qwen2.5-VL-2B with a structured-output instruction-tuning head.
- **Parameters:** ~2 billion.
- **Input:** An image + a JSON template (schema) describing what to extract.
- **Output:** JSON that fills the template from the image.
- **Why it makes mistakes:** The base training data is diverse (receipts, forms, invoices). HSBC and Lloyds have specific tabular layouts with multi-column date/description/debit/credit/balance rows that the model has not been specifically optimised for.

**Typical errors on bank statements:**
1. Merging two transactions into one (especially when description spans two lines)
2. Swapping debit/credit into the wrong `amount` field sign
3. Skipping rows near page headers/footers
4. Hallucinating transactions on non-transaction pages (cover page, legal notice)

---

## 4. Hardware & Software Setup

### 4.1 Hardware

| Component | Your PC | Requirement |
|-----------|---------|-------------|
| GPU | RTX 5070 Ti | ✅ 16–24 GB VRAM (QLoRA needs ~8 GB) |
| CUDA | CUDA 12.x (RTX 50-series needs CUDA 12.4+) | ✅ |
| RAM | ≥ 32 GB | ✅ |
| Storage | ≥ 50 GB free | For model weights + dataset |

### 4.2 Software stack

```bash
# On Windows — use WSL2 (Ubuntu 22.04) for best CUDA support
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install transformers datasets accelerate peft bitsandbytes
pip install qwen-vl-utils wandb   # optional: weights & biases for logging
```

> **Note:** `bitsandbytes` on Windows requires the pre-built wheel:  
> `pip install bitsandbytes --prefer-binary --extra-index-url=https://jllllll.github.io/bitsandbytes-windows-whl`

---

## 5. Data Labelling Plan

### 5.1 What you need

For each bank type (HSBC, Lloyds), collect:

| Item | Target count |
|------|-------------|
| Real bank statement PDFs | 20–30 per bank (60 pages per PDF = 1200–1800 pages total) |
| Ground-truth JSON per page | 1 JSON file per page |
| Rejection examples (non-statements) | 50–100 PDFs (receipts, invoices, payslips, utility bills) |

You do NOT need every page labelled — only pages that contain the transactions table. Cover/summary/legal pages can be labelled as `{"transactions": []}`.

### 5.2 HSBC statement layout

```
Statement Date: DD MMM YYYY
Account: XXXX XXXX XXXX XXXX

Date        | Description                    | Paid out   | Paid in   | Balance
------------|--------------------------------|------------|-----------|--------
01 Apr 2026 | DIRECT DEBIT VODAFONE          | 22.00      |           | 1,234.56
03 Apr 2026 | FASTER PAYMENT RECEIVED        |            | 500.00    | 1,734.56
```

- `amount`: negative for "Paid out", positive for "Paid in"
- `balance`: the rightmost column
- Descriptions often span 2 lines; the second line is a reference number (include both)

### 5.3 Lloyds statement layout

```
Account Number: XXXXXXXX   Sort Code: XX-XX-XX

Date        | Description                    | Debit (£)  | Credit (£) | Balance (£)
------------|--------------------------------|------------|------------|------------
04 Apr 26   | TFL TRAVEL                     | 3.40       |            | 892.60
05 Apr 26   | WAGES FROM EMPLOYER            |            | 1,200.00   | 2,092.60
```

- Similar to HSBC but column headers differ; date format is shorter (`04 Apr 26`)
- Running balance is always present

### 5.4 Ground-truth JSON format per page

```json
{
  "transactions": [
    {
      "date": "2026-04-01",
      "description": "DIRECT DEBIT VODAFONE",
      "amount": -22.00,
      "balance": 1234.56
    },
    {
      "date": "2026-04-03",
      "description": "FASTER PAYMENT RECEIVED",
      "amount": 500.00,
      "balance": 1734.56
    }
  ]
}
```

Dates should be normalised to `YYYY-MM-DD` regardless of the source format.

### 5.5 Labelling tool recommendation

Use **Label Studio** (free, open-source) with a custom JSON labelling interface:

```bash
pip install label-studio
label-studio start
```

Or — since the output is already JSON — a simple spreadsheet approach works:
1. Run the current model on each page.
2. Export outputs.
3. Manually correct the JSON in VS Code.
4. Save as `page_001.json`, `page_002.json`, etc.

This is faster than starting from scratch because the model is ~70–80% correct already.

---

## 6. Fine-Tuning Approach: QLoRA

### Why QLoRA?

Full fine-tuning of a 2B model requires ~16 GB VRAM. QLoRA (4-bit quantisation + LoRA adapters) reduces this to ~5–8 GB, with minimal accuracy difference.

### 6.1 Dataset preparation

```python
# build_dataset.py

import json
import base64
from pathlib import Path
from datasets import Dataset
import fitz

def build_training_record(pdf_path: str, labels_dir: str):
    records = []
    doc = fitz.open(pdf_path)
    for page_num, page in enumerate(doc):
        label_file = Path(labels_dir) / f"page_{page_num+1:03d}.json"
        if not label_file.exists():
            continue
        with open(label_file) as f:
            ground_truth = json.load(f)

        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        img_b64 = base64.b64encode(pix.tobytes("jpeg")).decode()

        records.append({
            "image_b64": img_b64,
            "target_json": json.dumps(ground_truth, indent=2),
        })
    doc.close()
    return records
```

### 6.2 Training script skeleton

```python
# train.py  (run on RTX PC with CUDA)

from transformers import AutoProcessor, AutoModelForVision2Seq
from peft import LoraConfig, get_peft_model, TaskType
import torch

model_name = "numind/NuExtract-2.0-2B"

# Load in 4-bit (QLoRA)
from transformers import BitsAndBytesConfig
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
)

model = AutoModelForVision2Seq.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    trust_remote_code=True,
    device_map="cuda",
)

processor = AutoProcessor.from_pretrained(
    model_name,
    trust_remote_code=True,
    padding_side="left",
)

# Apply LoRA to query/value projection layers
lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,                 # rank — increase to 32 if you have data
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# Expected output: ~3–5% of parameters are trainable

# ── Training loop ──────────────────────────────────────────────────────────
from transformers import TrainingArguments, Trainer

training_args = TrainingArguments(
    output_dir="./nuextract-bankstatement-lora",
    num_train_epochs=3,
    per_device_train_batch_size=1,   # 1 is safe on 16 GB; use 2 on 24 GB
    gradient_accumulation_steps=8,   # effective batch = 8
    learning_rate=2e-4,
    warmup_ratio=0.05,
    lr_scheduler_type="cosine",
    bf16=True,
    logging_steps=10,
    save_strategy="epoch",
    eval_strategy="epoch",
    load_best_model_at_end=True,
    report_to="none",               # change to "wandb" if you want tracking
)

# ... add custom data collator for image+text inputs ...
```

> **Training time estimate:** 3 epochs over 500 pages ≈ 2–4 hours on RTX 5070 Ti.

### 6.3 Using the fine-tuned model

After training, merge the LoRA weights or load them alongside the base:

```python
from peft import PeftModel

base_model = AutoModelForVision2Seq.from_pretrained("numind/NuExtract-2.0-2B", ...)
model = PeftModel.from_pretrained(base_model, "./nuextract-bankstatement-lora")

# Optional: merge for single-file deployment
model = model.merge_and_unload()
model.save_pretrained("./nuextract-bankstatement-merged")
```

In `extract_agent.py`, change the model name to your local path.

---

## 7. Expected Accuracy Improvement

| Metric | Base NuExtract-2.0-2B | After LoRA fine-tuning |
|--------|----------------------|------------------------|
| Field precision (date, amount, balance) | ~75–85% | ~92–97% |
| Multi-line description merging | Often wrong | Mostly correct |
| Page-level false positives (non-tx pages) | ~10% hallucination | Near zero (if trained on empty pages) |
| Debit/credit sign accuracy | ~80% | ~98% |

Accuracy gains are highest for the specific layouts in your training set (HSBC, Lloyds). A Barclays or NatWest statement will still degrade to near-base accuracy.

---

## 8. Migration Path to a Larger Model

If accuracy plateaus at ~95% and you need more:

| Option | Model | VRAM needed | Notes |
|--------|-------|-------------|-------|
| Stay on 2B | NuExtract-2.0-2B | ~8 GB | Fastest inference |
| Move to 7B | Qwen2.5-VL-7B | ~18 GB | Fits on 5070 Ti with QLoRA |
| Move to 72B | Qwen2.5-VL-72B | Needs A100 | Cloud only |
| Specialised | GOT-OCR-2.0 | ~12 GB | OCR-first pipeline, then NLP extraction |

The 7B route on the RTX 5070 Ti is the most practical upgrade path.

---

## 9. Recommended Implementation Order

1. ✅ **Today:** Add heuristic bank statement guard (`is_likely_bank_statement`) to `api.py`
2. 📋 **Week 1:** Collect and label 50 HSBC pages + 50 Lloyds pages using the correction workflow above
3. 📋 **Week 2:** Set up training environment on the RTX PC (WSL2 + CUDA 12.4 + required packages)
4. 📋 **Week 2–3:** Run QLoRA training, evaluate, iterate on labelling quality
5. 📋 **Week 3:** Deploy fine-tuned LoRA weights to the agent server; update `extract_agent.py` model path
6. 📋 **Ongoing:** Add 10–20 new pages/month as real-world failures are found

---

## 10. Privacy Note

Bank statement PDFs contain highly sensitive personal financial data. When collecting training samples:

- Use **synthetic** statements generated with realistic-looking fake names/amounts, OR
- Use **your own** statements and redact any personally identifiable information before labelling
- Never share unlabelled raw statements with any cloud labelling service
- Store training data in an encrypted directory on the RTX PC

---

*Document last updated: April 2026*
