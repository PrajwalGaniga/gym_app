import sys
from pathlib import Path
import pytest
import pytest_asyncio

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.mongo import db_manager
from app.db.indexes import create_indexes
from app.repositories.plan_repo import plan_repo
from app.repositories.settings_repo import settings_repo
from app.core.config import settings
from app.core.security import hash_password
from app.repositories.admin_repo import admin_repo

@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await db_manager.connect()
    await create_indexes()
    
    # Ensure test admin exists
    existing = await admin_repo.get_by_username(settings.ADMIN_USERNAME)
    if not existing:
        pwd_hash = hash_password(settings.ADMIN_PASSWORD)
        await admin_repo.create_admin(
            username=settings.ADMIN_USERNAME,
            password_hash=pwd_hash,
            role="admin"
        )
    await plan_repo.seed_default_plans()
    await settings_repo.get_settings()

    yield

    await db_manager.close()
