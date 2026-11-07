from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.db.mongo import db_manager
from app.core.config import settings as app_settings
from app.repositories.base import serialize_doc

class SettingsRepository:
    @property
    def collection(self):
        return db_manager.get_database().settings

    async def get_settings(self) -> Dict[str, Any]:
        doc = await self.collection.find_one({})
        if not doc:
            now = datetime.now(timezone.utc)
            default_doc = {
                "gym_name": app_settings.DEFAULT_GYM_NAME,
                "trainer_name": "Coach",
                "coach_phone": "9110687983",
                "coach_pin": "0608",
                "logo_url": None,
                "timezone": app_settings.DEFAULT_TIMEZONE,
                "currency": app_settings.DEFAULT_CURRENCY,
                "country_calling_code": app_settings.DEFAULT_PHONE_CODE,
                "member_code_prefix": app_settings.DEFAULT_MEMBER_CODE_PREFIX,
                "attendance_enabled": True,
                "duplicate_checkin_window_minutes": app_settings.DEFAULT_DUPLICATE_CHECKIN_WINDOW_MINUTES,
                "expired_checkin_policy": app_settings.DEFAULT_EXPIRED_CHECKIN_POLICY,
                "date_format": app_settings.DEFAULT_DATE_FORMAT,
                "created_at": now,
                "updated_at": now
            }
            res = await self.collection.insert_one(default_doc)
            default_doc["_id"] = res.inserted_id
            return serialize_doc(default_doc)

        # Ensure defaults for new fields if not already stored
        updates_needed = {}
        if "trainer_name" not in doc:
            updates_needed["trainer_name"] = "Coach"
        if "coach_phone" not in doc:
            updates_needed["coach_phone"] = "9110687983"
        if "coach_pin" not in doc:
            updates_needed["coach_pin"] = "0608"

        if updates_needed:
            await self.collection.update_one({"_id": doc["_id"]}, {"$set": updates_needed})
            doc.update(updates_needed)

        return serialize_doc(doc)

    async def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        await self.get_settings()
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one(
            {},
            {"$set": updates}
        )
        return await self.get_settings()

settings_repo = SettingsRepository()

