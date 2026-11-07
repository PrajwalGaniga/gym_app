from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    phone: Optional[str] = None
    pin: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int

class AdminResponse(BaseModel):
    id: str
    username: str
    role: str = "admin"
    is_active: bool = True
    last_login_at: Optional[datetime] = None

