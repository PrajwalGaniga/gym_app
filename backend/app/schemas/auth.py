from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)

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

