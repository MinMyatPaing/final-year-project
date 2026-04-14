"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  NuExtract-2.0-2B  —  QLoRA Fine-Tuning Template                           ║
║  agent/fine_tuning/train_template.py                                        ║
║                                                                              ║
║  STATUS: TEMPLATE ONLY — not executed in the current pipeline.              ║
║  The live pipeline uses Claude Vision (see flows/extract_agent.py).         ║
║                                                                              ║
║  Use this script if you want to switch back to local inference with a       ║
║  fine-tuned NuExtract model.                                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

HOW TO USE
──────────
1.  Label your statements
    ─────────────────────
    Run the current Claude-based pipeline over all PDFs in bank_statements/:

        cd agent
        python flows/extract_agent.py bank_statements/HSBC/2026-03-20_Statement.pdf

    Save the output JSON to fine_tuning/labels/<bank>/<filename>_page_NNN.json
    Then open each JSON in VS Code and correct any errors.
    Aim for ~50 corrected pages per bank (HSBC + Lloyds = ~100 pages total).

2.  Build the dataset
    ──────────────────
    Run build_dataset() below to convert PDFs + label JSONs into HuggingFace
    Dataset records.

3.  Train
    ──────
    Run train() on your RTX PC (Windows WSL2 or native Linux recommended).
    Required packages (add to pyproject.toml or install manually):
        pip install peft bitsandbytes
        pip install bitsandbytes --prefer-binary \
            --extra-index-url=https://jllllll.github.io/bitsandbytes-windows-whl

4.  Deploy
    ───────
    After training, update flows/extract_agent.py:
        - Uncomment the [NUEXTRACT] blocks.
        - Comment out the [CLAUDE] blocks.
        - Set model_name = "./fine_tuning/nuextract-bankstatement-merged"

PRIVACY NOTE
────────────
Your real bank statements in bank_statements/ are used ONLY as training data
on your local machine.  They are never uploaded anywhere.
The fine-tuned weights contain no raw statement data — only learned patterns.
"""

from __future__ import annotations

import json
import base64
from pathlib import Path
from typing import Optional

# ─── Dependencies (install before running) ────────────────────────────────────
# pip install peft bitsandbytes datasets transformers accelerate torch

# ─── Paths ────────────────────────────────────────────────────────────────────

BANK_STATEMENTS_DIR = Path(__file__).parent.parent / "bank_statements"
LABELS_DIR = Path(__file__).parent / "labels"
OUTPUT_DIR = Path(__file__).parent / "nuextract-bankstatement-lora"
MERGED_DIR = Path(__file__).parent / "nuextract-bankstatement-merged"

MODEL_NAME = "numind/NuExtract-2.0-2B"

# ─── Extraction template (must match what NuExtract expects) ──────────────────

TEMPLATE = {
    "transactions": [
        {
            "date": "date-time",
            "description": "string",
            "amount": "number",
            "balance": "number",
        }
    ]
}


# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Build dataset
# ══════════════════════════════════════════════════════════════════════════════


def build_dataset(
    bank_statements_dir: Path = BANK_STATEMENTS_DIR,
    labels_dir: Path = LABELS_DIR,
) -> list[dict]:
    """
    Walk bank_statements/ and labels/ in parallel.

    Expected label directory structure:
        fine_tuning/labels/
            HSBC/
                2026-03-20_Statement_page_001.json
                2026-03-20_Statement_page_002.json
                ...
            LLOYDs/
                Statement_2026_3_page_001.json
                ...

    Each label JSON must match the ground-truth format:
        {
          "transactions": [
            {"date": "2026-03-01", "description": "...", "amount": -22.00, "balance": 1234.56},
            ...
          ]
        }

    Returns a list of training records:
        [{"image_b64": "...", "target_json": "..."}, ...]
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError("PyMuPDF is required: pip install pymupdf")

    records = []

    for bank_dir in sorted(bank_statements_dir.iterdir()):
        if not bank_dir.is_dir():
            continue
        bank_label_dir = labels_dir / bank_dir.name
        if not bank_label_dir.exists():
            print(f"⚠  No labels found for {bank_dir.name} — skipping")
            continue

        for pdf_path in sorted(bank_dir.glob("*.pdf")):
            doc = fitz.open(str(pdf_path))
            for page_num in range(len(doc)):
                label_file = (
                    bank_label_dir / f"{pdf_path.stem}_page_{page_num + 1:03d}.json"
                )
                if not label_file.exists():
                    continue  # Only train on labelled pages

                with open(label_file) as f:
                    ground_truth = json.load(f)

                # Render page at 2× zoom (same as the live pipeline)
                mat = fitz.Matrix(2.0, 2.0)
                pix = doc[page_num].get_pixmap(matrix=mat)
                img_b64 = base64.b64encode(pix.tobytes("jpeg")).decode()

                records.append(
                    {
                        "image_b64": img_b64,
                        "target_json": json.dumps(ground_truth, indent=2),
                        "bank": bank_dir.name,
                        "source": f"{pdf_path.name}:page{page_num + 1}",
                    }
                )

            doc.close()

    print(f"✓ Built dataset: {len(records)} labelled pages")
    return records


# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Train with QLoRA
# ══════════════════════════════════════════════════════════════════════════════


def train(
    records: Optional[list[dict]] = None,
    output_dir: Path = OUTPUT_DIR,
    num_epochs: int = 3,
    lora_rank: int = 16,
):
    """
    Fine-tune NuExtract-2.0-2B with QLoRA on the labelled bank statement pages.

    Hardware requirements:
        - NVIDIA GPU with ≥ 8 GB VRAM (RTX 5070 Ti / 3080 / 4080 etc.)
        - CUDA 12.4+
        - ~50 GB free disk space (model weights + dataset)

    Training time estimate:
        ~2–4 hours for 3 epochs over 100–500 pages on an RTX 5070 Ti.
    """
    import torch
    from transformers import (
        AutoProcessor,
        AutoModelForVision2Seq,
        BitsAndBytesConfig,
        TrainingArguments,
        Trainer,
    )
    from peft import LoraConfig, get_peft_model, TaskType
    from datasets import Dataset

    if records is None:
        records = build_dataset()

    if not records:
        raise ValueError(
            "No training records found. "
            "Make sure you have label JSON files in fine_tuning/labels/."
        )

    # ── 4-bit quantisation config (QLoRA) ────────────────────────────────────
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
    )

    print(f"🔄 Loading {MODEL_NAME} in 4-bit (QLoRA)...")
    model = AutoModelForVision2Seq.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        trust_remote_code=True,
        device_map="cuda",
    )

    processor = AutoProcessor.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        padding_side="left",
        use_fast=True,
    )

    # ── LoRA adapter config ───────────────────────────────────────────────────
    # Targets the attention projection layers in the transformer.
    # r=16 is a good starting point; increase to 32 if you have >200 pages.
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=lora_rank,
        lora_alpha=lora_rank * 2,
        target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    # Expected: ~3–5% of parameters are trainable

    # ── Dataset ───────────────────────────────────────────────────────────────
    dataset = Dataset.from_list(records)
    split = dataset.train_test_split(test_size=0.1, seed=42)
    train_ds = split["train"]
    eval_ds = split["test"]

    # ── Data collator ─────────────────────────────────────────────────────────
    def collate_fn(batch):
        """
        Convert a batch of {image_b64, target_json} records into model inputs.
        NuExtract expects: image + JSON template → JSON output.
        """
        import base64
        from PIL import Image
        import io

        messages_batch = []
        targets = []

        for item in batch:
            img_bytes = base64.b64decode(item["image_b64"])
            image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

            messages = [
                {
                    "role": "user",
                    "content": [{"type": "image", "image": image}],
                }
            ]
            messages_batch.append(messages)
            targets.append(item["target_json"])

        texts = [
            processor.tokenizer.apply_chat_template(
                msgs,
                template=json.dumps(TEMPLATE, indent=2),
                tokenize=False,
                add_generation_prompt=True,
            )
            for msgs in messages_batch
        ]

        # Append target JSON so the model learns to generate it
        full_texts = [t + tgt for t, tgt in zip(texts, targets)]

        inputs = processor(
            text=full_texts,
            images=[
                processor.image_processor(msg[0]["content"][0]["image"])
                for msg in messages_batch
            ],
            padding=True,
            truncation=True,
            max_length=4096,
            return_tensors="pt",
        )

        # Labels: mask the prompt tokens (only supervise the JSON output)
        labels = inputs["input_ids"].clone()
        for i, text in enumerate(texts):
            prompt_len = len(
                processor.tokenizer(text, return_tensors="pt")["input_ids"][0]
            )
            labels[i, :prompt_len] = -100  # ignore prompt in loss

        inputs["labels"] = labels
        return inputs

    # ── Training arguments ────────────────────────────────────────────────────
    output_dir.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=num_epochs,
        per_device_train_batch_size=1,  # Safe on 16 GB VRAM; use 2 on 24 GB
        gradient_accumulation_steps=8,  # Effective batch size = 8
        learning_rate=2e-4,
        warmup_ratio=0.05,
        lr_scheduler_type="cosine",
        bf16=True,  # RTX 50-series supports bfloat16
        logging_steps=10,
        save_strategy="epoch",
        eval_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        report_to="none",  # Change to "wandb" for experiment tracking
        dataloader_num_workers=0,  # Set to 4 on Linux for faster loading
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        data_collator=collate_fn,
    )

    print("🚀 Starting QLoRA fine-tuning...")
    trainer.train()
    trainer.save_model(str(output_dir))
    print(f"✓ LoRA adapter saved to {output_dir}")


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Merge LoRA weights into a single model (optional, for deployment)
# ══════════════════════════════════════════════════════════════════════════════


def merge_and_save(
    lora_dir: Path = OUTPUT_DIR,
    merged_dir: Path = MERGED_DIR,
):
    """
    Merge the LoRA adapter into the base model weights.
    The merged model can be loaded without PEFT and is faster at inference.

    After merging, update flows/extract_agent.py:
        model_name = "./fine_tuning/nuextract-bankstatement-merged"
    """
    import torch
    from transformers import AutoModelForVision2Seq, AutoProcessor
    from peft import PeftModel

    print(f"🔄 Loading base model {MODEL_NAME}...")
    base_model = AutoModelForVision2Seq.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        torch_dtype=torch.bfloat16,
        device_map="cpu",  # Merge on CPU to avoid VRAM limits
    )

    print(f"🔄 Loading LoRA adapter from {lora_dir}...")
    model = PeftModel.from_pretrained(base_model, str(lora_dir))

    print("🔄 Merging weights...")
    model = model.merge_and_unload()

    merged_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(merged_dir))

    processor = AutoProcessor.from_pretrained(MODEL_NAME, trust_remote_code=True)
    processor.save_pretrained(str(merged_dir))

    print(f"✓ Merged model saved to {merged_dir}")
    print(
        "\nNext step: in flows/extract_agent.py, uncomment the [NUEXTRACT] blocks\n"
        f"and set:  model_name = '{merged_dir}'"
    )


# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Quick evaluation helper
# ══════════════════════════════════════════════════════════════════════════════


def evaluate_on_statement(pdf_path: str, model_dir: Optional[str] = None):
    """
    Run the fine-tuned (or base) NuExtract model on a single PDF and print
    the extracted transactions.  Useful for quick sanity checks.

    Args:
        pdf_path:  Path to a bank statement PDF.
        model_dir: Path to the merged fine-tuned model, or None to use the
                   base NuExtract model from HuggingFace.
    """
    import torch
    import fitz
    from transformers import AutoProcessor, AutoModelForVision2Seq

    name = model_dir or MODEL_NAME
    print(f"🔄 Loading model: {name}")

    model = AutoModelForVision2Seq.from_pretrained(
        name,
        trust_remote_code=True,
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )
    processor = AutoProcessor.from_pretrained(
        name, trust_remote_code=True, padding_side="left", use_fast=True
    )

    doc = fitz.open(pdf_path)
    all_transactions = []

    for page_num in range(len(doc)):
        mat = fitz.Matrix(2.0, 2.0)
        pix = doc[page_num].get_pixmap(matrix=mat)
        img_b64 = base64.b64encode(pix.tobytes("jpeg")).decode()

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": f"data:image/jpeg;base64,{img_b64}"}
                ],
            }
        ]
        text = processor.tokenizer.apply_chat_template(
            messages,
            template=json.dumps(TEMPLATE, indent=2),
            tokenize=False,
            add_generation_prompt=True,
        )
        inputs = processor(text=[text], padding=True, return_tensors="pt").to(
            model.device
        )
        generated = model.generate(
            **inputs, do_sample=False, num_beams=1, max_new_tokens=4096
        )
        trimmed = [out[len(inp) :] for inp, out in zip(inputs.input_ids, generated)]
        output = processor.batch_decode(trimmed, skip_special_tokens=True)[0]

        try:
            page_data = json.loads(output)
            txns = page_data.get("transactions", [])
            all_transactions.extend(txns)
            print(f"Page {page_num + 1}: {len(txns)} transactions")
        except json.JSONDecodeError:
            print(f"Page {page_num + 1}: JSON parse error")

    doc.close()
    print(f"\nTotal: {len(all_transactions)} transactions")
    print(
        json.dumps(all_transactions[:5], indent=2),
        "..." if len(all_transactions) > 5 else "",
    )
    return all_transactions


# ══════════════════════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys

    command = sys.argv[1] if len(sys.argv) > 1 else "help"

    if command == "build":
        records = build_dataset()
        print(f"Dataset has {len(records)} records.")

    elif command == "train":
        records = build_dataset()
        train(records)

    elif command == "merge":
        merge_and_save()

    elif command == "eval":
        pdf = sys.argv[2] if len(sys.argv) > 2 else None
        model_dir = sys.argv[3] if len(sys.argv) > 3 else None
        if not pdf:
            print("Usage: python train_template.py eval <pdf_path> [model_dir]")
            sys.exit(1)
        evaluate_on_statement(pdf, model_dir)

    else:
        print(__doc__)
        print("Commands:")
        print("  python train_template.py build   — build dataset from labels")
        print("  python train_template.py train   — run QLoRA fine-tuning")
        print("  python train_template.py merge   — merge LoRA into base model")
        print("  python train_template.py eval <pdf> [model_dir]  — quick eval")
