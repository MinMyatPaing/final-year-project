"""
FastAPI application — wires middleware and mounts all routers.
For request/response models see models.py.
For LangGraph flows see flows/.
For route handlers see routers/.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import health, extract, categorize, chat, vectors

app = FastAPI(title="StudyBudget Agent API")

# ─── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(health.router)
app.include_router(extract.router)
app.include_router(categorize.router)
app.include_router(chat.router)
app.include_router(vectors.router)
