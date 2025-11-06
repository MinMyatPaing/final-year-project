from __future__ import annotations

from typing import Any, Dict, List, Optional, TypedDict

import pandas as pd
from dateutil import parser as dateparser


class StatementRow(TypedDict):
    date: str
    description: str
    amount: float


def _pick_first_present(d: Dict[str, Any], keys: List[str]) -> Optional[str]:
    for k in keys:
        if k in d and pd.notna(d[k]):
            return str(d[k])
    return None


def _parse_amount(row: Dict[str, Any]) -> Optional[float]:
    if "Amount" in row and row["Amount"] not in (None, ""):
        try:
            return float(str(row["Amount"]).replace(",", ""))
        except Exception:
            pass
    debit = row.get("Debit")
    credit = row.get("Credit")
    if debit not in (None, ""):
        try:
            val = float(str(debit).replace(",", ""))
            return -abs(val)
        except Exception:
            pass
    if credit not in (None, ""):
        try:
            val = float(str(credit).replace(",", ""))
            return abs(val)
        except Exception:
            pass
    return None


def _parse_date(value: str) -> Optional[str]:
    try:
        dt = dateparser.parse(value, dayfirst=True)
        return dt.date().isoformat()
    except Exception:
        return None


def parse_rows(state: Dict[str, Any]) -> Dict[str, Any]:
    df: pd.DataFrame = state["raw_df"]
    rows: List[StatementRow] = []
    for _, r in df.iterrows():
        rd = r.to_dict()
        date_val = _pick_first_present(rd, ["Date", "Transaction Date", "Posted"])
        desc_val = _pick_first_present(
            rd, ["Description", "Merchant", "Details", "Narrative"]
        )
        amt_val = _parse_amount(rd)
        if not date_val or not desc_val or amt_val is None:
            continue
        iso_date = _parse_date(date_val)
        if not iso_date:
            continue
        rows.append(
            {
                "date": iso_date,
                "description": desc_val.strip(),
                "amount": float(amt_val),
            }
        )
    state["rows"] = rows
    state["spending_rows"] = [t for t in rows if t["amount"] < 0]
    return state
