from fastapi import Depends, HTTPException, status, Request
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.security import decode_access_token
from app.repositories.admin_repo import admin_repo

async def get_current_admin(request: Request) -> Dict[str, Any]:
    # 1. Try HttpOnly Cookie
    token = request.cookies.get(settings.COOKIE_NAME)
    
    # 2. Fallback to Authorization Header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session required. Please log in."
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again."
        )

    admin_id = payload["sub"]
    admin = await admin_repo.get_by_id(admin_id)
    if not admin or not admin.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin account not found or deactivated."
        )

    return admin
