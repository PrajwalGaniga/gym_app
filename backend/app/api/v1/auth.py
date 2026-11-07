from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from app.schemas.auth import LoginRequest, TokenResponse, AdminResponse
from app.repositories.admin_repo import admin_repo
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.api.deps import get_current_admin
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login")
async def login(data: LoginRequest, response: Response):
    admin = await admin_repo.get_by_username(data.username)
    if not admin or not verify_password(data.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not admin.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your admin account has been deactivated"
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": admin["id"], "username": admin["username"], "role": admin.get("role", "admin")},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Set secure HttpOnly cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/"
    )

    await admin_repo.update_last_login(admin["id"])

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "admin": {
            "id": admin["id"],
            "username": admin["username"],
            "role": admin.get("role", "admin"),
            "is_active": admin.get("is_active", True),
            "last_login_at": admin.get("last_login_at")
        }
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=AdminResponse)
async def get_me(admin: dict = Depends(get_current_admin)):
    return AdminResponse(
        id=admin["id"],
        username=admin["username"],
        role=admin.get("role", "admin"),
        is_active=admin.get("is_active", True),
        last_login_at=admin.get("last_login_at")
    )

