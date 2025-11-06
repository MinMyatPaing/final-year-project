from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import StateGraph, START, END

from .nodes.load import load_csv
from .nodes.parse import parse_rows
from .nodes.categorize_rules import categorize_rules
from .nodes.categorize_llm import categorize_llm
from .nodes.categorize_web import categorize_web
from .nodes.aggregate import aggregate


class AgentState(TypedDict, total=False):
    path: str
    raw_df: Any
    rows: Any
    spending_rows: Any
    categorized: Any
    pending: Any
    breakdown: Any
    total_spent: float
    uncategorized_count: int


def build_graph():
    g = StateGraph(AgentState)
    g.add_node("load_csv", load_csv)
    g.add_node("parse_rows", parse_rows)
    g.add_node("categorize_rules", categorize_rules)
    g.add_node("categorize_llm", categorize_llm)
    g.add_node("categorize_web", categorize_web)
    g.add_node("aggregate", aggregate)

    g.add_edge(START, "load_csv")
    g.add_edge("load_csv", "parse_rows")
    g.add_edge("parse_rows", "categorize_rules")
    g.add_edge("categorize_rules", "categorize_llm")
    g.add_edge("categorize_llm", "categorize_web")
    g.add_edge("categorize_web", "aggregate")
    g.add_edge("aggregate", END)
    return g.compile()
