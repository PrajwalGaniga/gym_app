from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
import re
from datetime import timedelta
from app.schemas.auth import LoginRequest, TokenResponse, AdminResponse
from app.repositories.admin_repo import admin_repo
from app.repositories.settings_repo import settings_repo
from app.core.security import verify_password, create_access_token, hash_password
from app.core.config import settings
from app.api.deps import get_current_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])

MASTER_ADMIN_PHONE = "9110687983"
MASTER_ADMIN_PIN = "0608"

def extract_phone_digits(s: str) -> str:
    digits = re.sub(r'\D', '', s or "")
    if len(digits) >= 10:
        return digits[-10:]
    return digits

@router.post("/login")
async def login(data: LoginRequest, response: Response):
    identifier = (data.phone or data.username or "").strip()
    secret = (data.pin or data.password or "").strip()

    if not identifier or not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter your phone number and 4-digit PIN."
        )

    identifier_digits = extract_phone_digits(identifier)

    # 1. Master emergency admin login (9110687983 / 0608) - Always accepted
    is_master = (identifier_digits == MASTER_ADMIN_PHONE and secret == MASTER_ADMIN_PIN)

    # 2. Dynamic coach credentials configured in Settings
    settings_doc = await settings_repo.get_settings()
    configured_phone = extract_phone_digits(str(settings_doc.get("coach_phone", MASTER_ADMIN_PHONE)))
    configured_pin = str(settings_doc.get("coach_pin", MASTER_ADMIN_PIN)).strip()
    is_coach = (identifier_digits == configured_phone and secret == configured_pin)

    admin = None
    if is_master or is_coach:
        admin = await admin_repo.get_by_username("coach")
        if not admin:
            pwd_hash = hash_password(settings.ADMIN_PASSWORD)
            admin = await admin_repo.create_admin(username="coach", password_hash=pwd_hash, role="admin")
    else:
        # Fallback to username/password check for testing or direct admin username
        candidate = await admin_repo.get_by_username(identifier)
        if candidate and verify_password(secret, candidate["password_hash"]):
            admin = candidate

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or 4-digit PIN."
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

