from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from models import ChatRequest, ChatResponse
from flows import chat as chat_with_agent

router = APIRouter(tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Chat with the StudyBudget AI assistant.

    Each session_id maintains its own conversation memory.
    Pass the authenticated user's ID as session_id for per-user persistence.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        response_text = await chat_with_agent(
            message=request.message,
            session_id=request.session_id,
        )
        return ChatResponse(response=response_text, success=True)

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "response": f"⚠️ Agent error: {str(e)}",
                "error": str(e),
            },
        )
