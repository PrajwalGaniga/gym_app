import asyncio
from pymongo import AsyncMongoClient
from app.core.config import settings
from app.core.logging import logger
from typing import Optional

class DatabaseManager:
    client: Optional[AsyncMongoClient] = None

    @classmethod
    async def connect(cls):
        current_loop = asyncio.get_running_loop()
        if cls.client is None or getattr(cls.client, "_loop", None) != current_loop:
            logger.info("Connecting to MongoDB Atlas (new event loop)...")
            cls.client = AsyncMongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000
            )
            # Verify connection with ping
            await cls.client.admin.command("ping")
            logger.info("Successfully connected to MongoDB Atlas.")

    @classmethod
    async def close(cls):
        if cls.client is not None:
            logger.info("Closing MongoDB Atlas connection...")
            await cls.client.close()
            cls.client = None
            logger.info("MongoDB Atlas connection closed.")

    @classmethod
    def get_database(cls, db_name: Optional[str] = None):
        current_loop = asyncio.get_running_loop()
        if cls.client is None or getattr(cls.client, "_loop", None) != current_loop:
            cls.client = AsyncMongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000
            )
        return cls.client[db_name or settings.MONGODB_DATABASE]

db_manager = DatabaseManager()

async def get_db():
    return db_manager.get_database()
