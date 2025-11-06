from __future__ import annotations

from typing import Any, Dict

import pandas as pd


def load_csv(state: Dict[str, Any]) -> Dict[str, Any]:
    df = pd.read_csv(state["path"])
    state["raw_df"] = df
    return state
