from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.db.mongo import db_manager
from app.repositories.base import str_to_oid, serialize_doc

class AdminRepository:
    @property
    def collection(self):
        return db_manager.get_database().admins

    async def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one({"username": username.strip()})
        return serialize_doc(doc)

    async def get_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(admin_id)
        if not oid:
            return None
        doc = await self.collection.find_one({"_id": oid})
        return serialize_doc(doc)

    async def create_admin(self, username: str, password_hash: str, role: str = "admin") -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "username": username.strip(),
            "password_hash": password_hash,
            "role": role,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "last_login_at": None
        }
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return serialize_doc(doc)

    async def update_last_login(self, admin_id: str):
        oid = str_to_oid(admin_id)
        if oid:
            now = datetime.now(timezone.utc)
            await self.collection.update_one(
                {"_id": oid},
                {"$set": {"last_login_at": now, "updated_at": now}}
            )

admin_repo = AdminRepository()

