import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.security import hash_password
from app.db.mongo import db_manager
from app.repositories.admin_repo import admin_repo
from app.repositories.plan_repo import plan_repo
from app.repositories.settings_repo import settings_repo
from app.db.indexes import create_indexes

async def seed():
    print("Connecting to MongoDB Atlas...")
    await db_manager.connect()
    await create_indexes()

    username = settings.ADMIN_USERNAME
    password = settings.ADMIN_PASSWORD
    print(f"Ensuring admin account for '{username}'...")

    existing = await admin_repo.get_by_username(username)
    if existing:
        print(f"Admin '{username}' already exists.")
    else:
        pwd_hash = hash_password(password)
        await admin_repo.create_admin(username=username, password_hash=pwd_hash, role="admin")
        print(f"Created admin '{username}' successfully.")

    print("Seeding default membership plans...")
    await plan_repo.seed_default_plans()

    print("Seeding gym settings...")
    await settings_repo.get_settings()

    await db_manager.close()
    print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())

