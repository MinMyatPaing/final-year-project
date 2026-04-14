"""
Report Router — POST /report

Generates a personalised financial report for a given month using Claude.
Returns structured JSON that the frontend renders and can export as PDF.
"""

import os
import json
import logging
from typing import Any, Optional

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["Report"])
logger = logging.getLogger(__name__)

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("CLAUDE_API_KEY")
        if not api_key:
            raise RuntimeError("CLAUDE_API_KEY is not set")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


# ─── Request / Response models ────────────────────────────────────────────────


class ReportRequest(BaseModel):
    month: str  # "YYYY-MM"
    transactions: list[dict[str, Any]]
    user: Optional[dict[str, Any]] = None


class ReportResponse(BaseModel):
    success: bool
    month: str
    summary: str
    total_income: float
    total_expenses: float
    net: float
    top_categories: list[dict[str, Any]]
    insights: list[str]
    recommendations: list[str]
    html: str  # pre-rendered HTML for PDF export


# ─── Helpers ──────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are a friendly, expert personal finance advisor for university students in the UK.
Your job is to analyse a month's bank transactions and produce a clear, personalised financial report.
Be encouraging but honest. Use British English. Keep insights concise and actionable.
Return ONLY a valid JSON object — no markdown, no explanation."""

_REPORT_SCHEMA = """{
  "summary": "2-3 sentence overview of the month",
  "insights": ["insight 1", "insight 2", "insight 3", "insight 4"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}"""


def _build_prompt(month: str, transactions: list[dict], user: dict | None) -> str:
    # Aggregate by category
    income = [t for t in transactions if float(t.get("amount", 0)) > 0]
    expenses = [t for t in transactions if float(t.get("amount", 0)) < 0]

    total_in = sum(float(t["amount"]) for t in income)
    total_out = sum(abs(float(t["amount"])) for t in expenses)

    cat_totals: dict[str, float] = {}
    for t in expenses:
        cat = t.get("category") or "Other"
        cat_totals[cat] = cat_totals.get(cat, 0) + abs(float(t.get("amount", 0)))

    top_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)[:5]

    user_ctx = ""
    if user:
        name = user.get("name", "Student")
        uni = user.get("university", "")
        income_goal = user.get("monthlyIncome", 0)
        spend_goal = user.get("monthlySpendingGoal", 0)
        user_ctx = (
            f"Student name: {name}\n"
            f"University: {uni or 'not specified'}\n"
            f"Monthly income target: £{income_goal}\n"
            f"Monthly spending goal: £{spend_goal}\n"
        )

    txn_summary = "\n".join(
        f"- {t.get('date','?')} | {t.get('description','?')} | "
        f"{'£'+str(abs(float(t.get('amount',0)))) if float(t.get('amount',0))<0 else '+£'+str(float(t.get('amount',0)))} "
        f"| {t.get('category','Other')}"
        for t in transactions[:60]  # cap at 60 rows to stay within token budget
    )

    return f"""Month: {month}
{user_ctx}
Total income: £{total_in:.2f}
Total expenses: £{total_out:.2f}
Net: £{total_in - total_out:.2f}

Top spending categories:
{chr(10).join(f'  {cat}: £{amt:.2f}' for cat, amt in top_cats)}

Transaction list (up to 60 shown):
{txn_summary}

Please analyse this student's finances for {month} and return a JSON object matching this schema:
{_REPORT_SCHEMA}

Be specific — reference actual amounts and categories from the data above.
"""


def _build_html(
    month: str,
    report: dict,
    total_in: float,
    total_out: float,
    top_cats: list,
    user: dict | None,
) -> str:
    """Build a self-contained HTML string suitable for expo-print PDF export."""
    name = (user or {}).get("name", "Student")
    net = total_in - total_out
    net_color = "#10b981" if net >= 0 else "#f43f5e"
    net_sign = "+" if net >= 0 else ""

    cat_rows = "".join(
        f'<tr><td style="padding:6px 0;color:#475569">{cat}</td>'
        f'<td style="padding:6px 0;text-align:right;font-weight:600;color:#f43f5e">£{amt:.2f}</td></tr>'
        for cat, amt in top_cats
    )

    insights_html = "".join(
        f'<li style="margin-bottom:8px;color:#475569;line-height:1.5">{i}</li>'
        for i in report.get("insights", [])
    )
    recs_html = "".join(
        f'<li style="margin-bottom:8px;color:#475569;line-height:1.5">{r}</li>'
        for r in report.get("recommendations", [])
    )

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page {{ margin: 24px; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #1e293b; }}
  .header {{ background: #4f46e5; color: white; border-radius: 16px; padding: 24px; margin-bottom: 20px; page-break-inside: avoid; }}
  .header h1 {{ margin: 0 0 4px; font-size: 22px; }}
  .header p {{ margin: 0; opacity: 0.8; font-size: 13px; }}
  .card {{ background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); page-break-inside: avoid; }}
  .card h2 {{ margin: 0 0 12px; font-size: 15px; color: #1e293b; }}
  .stat-row {{ display: flex; gap: 12px; margin-bottom: 16px; page-break-inside: avoid; }}
  .stat {{ flex: 1; background: white; border-radius: 12px; padding: 14px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}
  .stat .label {{ font-size: 11px; color: #94a3b8; margin-bottom: 4px; }}
  .stat .value {{ font-size: 18px; font-weight: 700; }}
  table {{ width: 100%; border-collapse: collapse; }}
  tr {{ page-break-inside: avoid; }}
  ul {{ margin: 0; padding-left: 18px; }}
  li {{ page-break-inside: avoid; margin-bottom: 6px; }}
  .summary {{ font-size: 14px; line-height: 1.6; color: #475569; }}
  .footer {{ text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; page-break-inside: avoid; }}
  /* Ensure content after a page break has proper top spacing */
  @media print {{
    body {{ padding-top: 0; }}
    .card {{ margin-top: 16px; }}
  }}
</style>
</head>
<body>
<div class="header">
  <h1>📊 Financial Report</h1>
  <p>{name} · {month}</p>
</div>

<div class="stat-row">
  <div class="stat">
    <div class="label">Income</div>
    <div class="value" style="color:#10b981">£{total_in:.2f}</div>
  </div>
  <div class="stat">
    <div class="label">Expenses</div>
    <div class="value" style="color:#f43f5e">£{total_out:.2f}</div>
  </div>
  <div class="stat">
    <div class="label">Net</div>
    <div class="value" style="color:{net_color}">{net_sign}£{abs(net):.2f}</div>
  </div>
</div>

<div class="card">
  <h2>Summary</h2>
  <p class="summary">{report.get('summary', '')}</p>
</div>

<div class="card">
  <h2>Top Spending Categories</h2>
  <table>{cat_rows}</table>
</div>

<div class="card">
  <h2>💡 Insights</h2>
  <ul>{insights_html}</ul>
</div>

<div class="card">
  <h2>✅ Recommendations</h2>
  <ul>{recs_html}</ul>
</div>

<div class="footer">Generated by StudyBudget · {month}</div>
</body>
</html>"""


# ─── Endpoint ─────────────────────────────────────────────────────────────────


@router.post("/report", response_model=ReportResponse)
async def generate_report(req: ReportRequest):
    """
    Generate a personalised monthly financial report using Claude.
    Returns structured data + pre-rendered HTML for PDF export.
    """
    if not req.transactions:
        raise HTTPException(
            status_code=400, detail="No transactions provided for report"
        )

    try:
        client = _get_client()
        prompt = _build_prompt(req.month, req.transactions, req.user)

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text.strip()
        # Strip markdown fences if present
        import re

        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

        report_data = json.loads(raw)

    except json.JSONDecodeError as e:
        logger.error("Report JSON parse error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to parse report from AI")
    except Exception as e:
        logger.error("Report generation error: %s", e)
        raise HTTPException(
            status_code=500, detail=f"Report generation failed: {str(e)}"
        )

    # Compute aggregates
    income_txns = [t for t in req.transactions if float(t.get("amount", 0)) > 0]
    expense_txns = [t for t in req.transactions if float(t.get("amount", 0)) < 0]
    total_in = sum(float(t["amount"]) for t in income_txns)
    total_out = sum(abs(float(t["amount"])) for t in expense_txns)

    cat_totals: dict[str, float] = {}
    for t in expense_txns:
        cat = t.get("category") or "Other"
        cat_totals[cat] = cat_totals.get(cat, 0) + abs(float(t.get("amount", 0)))
    top_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)[:5]
    top_cats_list = [{"category": c, "amount": round(a, 2)} for c, a in top_cats]

    html = _build_html(req.month, report_data, total_in, total_out, top_cats, req.user)

    return ReportResponse(
        success=True,
        month=req.month,
        summary=report_data.get("summary", ""),
        total_income=round(total_in, 2),
        total_expenses=round(total_out, 2),
        net=round(total_in - total_out, 2),
        top_categories=top_cats_list,
        insights=report_data.get("insights", []),
        recommendations=report_data.get("recommendations", []),
        html=html,
    )
