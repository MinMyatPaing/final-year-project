from __future__ import annotations

import argparse
import json
from tabulate import tabulate

from .graph import build_graph


def run(file_path: str, output: str = "table") -> int:
    graph = build_graph()
    state = graph.invoke({"path": file_path})

    breakdown = state.get("breakdown", {})
    total_spent = state.get("total_spent", 0.0)

    if output == "json":
        print(
            json.dumps(
                {
                    "total_spent_gbp": total_spent,
                    "categories": breakdown,
                },
                indent=2,
            )
        )
        return 0

    # Default: nice table
    headers = ["Category", "Total", "%", "Count"]
    rows = []
    for cat, data in breakdown.items():
        rows.append(
            [
                cat,
                f"£{data['total']:.2f}",
                f"{data['percentage']:.1f}",
                data["count"],
            ]
        )

    print("Spending Breakdown (GBP)")
    print("=========================")
    print(f"Total Spent: £{total_spent:.2f}\n")
    print(tabulate(rows, headers=headers, tablefmt="github"))
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="UK Statement Spending Breakdown (LangGraph)"
    )
    parser.add_argument("--file", required=True, help="Path to the bank statement CSV")
    parser.add_argument(
        "--output", choices=["table", "json"], default="table", help="Output format"
    )
    args = parser.parse_args()
    raise SystemExit(run(args.file, args.output))


if __name__ == "__main__":
    main()
