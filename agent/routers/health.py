from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/")
async def root():
    return {"status": "ok", "message": "PocketWise Agent API is running"}


@router.get("/health")
async def health():
    return {"status": "healthy"}
