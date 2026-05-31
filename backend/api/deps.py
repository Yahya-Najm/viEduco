from fastapi import Header, HTTPException, status
from core.config import settings


async def require_internal_key(x_internal_key: str = Header(...)):
    if not settings.internal_api_key:
        return  # skip check in local dev if key not set
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
