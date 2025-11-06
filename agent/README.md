# Student Budgeting Agent (LangGraph)

A small LangGraph pipeline that reads a UK bank statement CSV, categorizes merchants into general categories, aggregates spending, and prints a breakdown.

## Features

- Flexible CSV parsing for UK statements (handles columns like `Date`, `Description`/`Merchant`, `Amount` or separate `Debit`/`Credit`).
- Multi-stage categorization:
  - Rules (fast keyword/regex)
  - LLM fallback (OpenAI, optional via `OPENAI_API_KEY`)
  - Web search fallback (DuckDuckGo) if still unknown
- LangGraph pipeline stages: load -> parse -> categorize_rules -> categorize_llm -> categorize_web -> aggregate.
- Outputs a clean table and JSON.

## Quickstart

```bash
# From project root
cd agent
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run on a CSV statement (module mode ensures package imports work)
# Optional envs: OPENAI_API_KEY=sk-... ENABLE_WEB=1
python -m agent.main --file path/to/statement.csv --output table

# Or JSON output
python -m agent.main --file path/to/statement.csv --output json > breakdown.json
```

## CSV Expectations

- Required columns (any reasonable variant is accepted):
  - Date: `Date`/`Transaction Date`
  - Description: `Description`/`Merchant`/`Details`
  - Amount: either a signed `Amount` column or `Debit`/`Credit` columns
- Date formats: `DD/MM/YYYY`, `YYYY-MM-DD`, and common UK variants.
- Amounts are treated as spending when negative or in `Debit` (credits/income are ignored for the spending breakdown).

## Categories

Rules live in `merchant_rules.py`. Adjust mappings or add new keywords to improve categorization.

## Example Output

```
Spending Breakdown (GBP)
=========================
Total Spent: £1,234.56

Category               Total      %     Count
---------------------------------------------
Groceries              £450.10    36.5  12
Eating Out             £320.45    26.0  18
Transport              £210.00    17.0   9
Shopping               £190.00    15.4   7
Other                  £64.01      5.1   5
```

## Notes

- LLM and web search are optional. If `OPENAI_API_KEY` is not set, the LLM step is skipped; if `ENABLE_WEB=0`, web search is skipped.
- Extend rules in `merchant_rules.py`, or customize prompts in `services/llm.py`.
