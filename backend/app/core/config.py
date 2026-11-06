from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # MongoDB Atlas
    MONGODB_URI: str
    MONGODB_DATABASE: str = "gym_management"

    # Security & Auth
    JWT_SECRET: str = "change_this_to_a_secure_secret_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    COOKIE_NAME: str = "gym_session"
    COOKIE_SECURE: bool = False  # Set to True in production HTTPS
    COOKIE_SAMESITE: str = "lax"

    # Initial Admin Seed
    ADMIN_USERNAME: str = "coach"
    ADMIN_PASSWORD: str = "Coach@Gym2026!"

    # CORS & Frontend
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Gym Defaults
    DEFAULT_GYM_NAME: str = "IronPulse Fitness Club"
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"
    DEFAULT_CURRENCY: str = "INR"
    DEFAULT_PHONE_CODE: str = "+91"
    DEFAULT_MEMBER_CODE_PREFIX: str = "GYM"
    DEFAULT_DATE_FORMAT: str = "DD MMM YYYY"
    DEFAULT_DUPLICATE_CHECKIN_WINDOW_MINUTES: int = 2
    DEFAULT_EXPIRED_CHECKIN_POLICY: str = "warn"  # "warn" or "block"

    # Storage (Cloudinary or Local Disk)
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    UPLOAD_DIR: str = "uploads/profiles"

settings = Settings()
