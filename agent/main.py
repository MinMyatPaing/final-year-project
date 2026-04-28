"""
Entry point — run this file to start the PocketWise Agent API server.

    uv run main.py
    # or
    python main.py
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,   # auto-restart on code changes during development
    )
