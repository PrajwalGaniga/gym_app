import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.security import hash_password
from app.db.mongo import db_manager
from app.db.indexes import create_indexes
from app.repositories.admin_repo import admin_repo
from app.repositories.plan_repo import plan_repo
from app.repositories.settings_repo import settings_repo
from app.api.v1.router import api_router

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Gym Management System API...")
    try:
        await db_manager.connect()
        await create_indexes()

        # Seed initial admin if no admin exists
        existing_admin = await admin_repo.get_by_username(settings.ADMIN_USERNAME)
        if not existing_admin:
            pwd_hash = hash_password(settings.ADMIN_PASSWORD)
            await admin_repo.create_admin(
                username=settings.ADMIN_USERNAME,
                password_hash=pwd_hash,
                role="admin"
            )
            logger.info(f"Initialized default coach account: {settings.ADMIN_USERNAME}")

        # Seed default plans and settings
        await plan_repo.seed_default_plans()
        await settings_repo.get_settings()
        logger.info("Database initialization and defaults verification complete.")
    except Exception as e:
        logger.error(f"Error during application startup: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down Gym Management System API...")
    await db_manager.close()

app = FastAPI(
    title="Gym Membership & Fee Management System API",
    description="Production-grade API for gym member registration, fee collection, renewals, and attendance.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Request ID & Logging Middleware
@app.middleware("http")
async def request_id_and_logging_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    request.state.request_id = req_id
    response: Response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    return response

# CORS Configuration
allowed_origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"]
)

# Mount local upload directory for profile photos
base_dir = Path(__file__).resolve().parent.parent
upload_path = base_dir / "uploads"
upload_path.mkdir(parents=True, exist_ok=True)
(upload_path / "profiles").mkdir(parents=True, exist_ok=True)
(upload_path / "profiles" / "thumbs").mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(upload_path)), name="static_uploads")

# Health and Readiness endpoints
@app.get("/health", tags=["System"])
async def health():
    return {"status": "healthy", "service": "gym-management-backend"}

@app.get("/ready", tags=["System"])
async def readiness():
    try:
        db = db_manager.get_database()
        await db.command("ping")
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "error": str(e)}
        )

# Include API Router under /api/v1
app.include_router(api_router)

# Also alias endpoints to /api/... for compatibility
app.include_router(api_router, prefix="")

