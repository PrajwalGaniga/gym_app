from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone, date
from app.db.mongo import db_manager
from app.repositories.base import str_to_oid, serialize_doc, format_date_to_iso

class AttendanceRepository:
    @property
    def collection(self):
        return db_manager.get_database().attendance

    async def get_last_checkin_for_member(self, member_id: str) -> Optional[Dict[str, Any]]:
        cursor = self.collection.find({"member_id": str(member_id)}).sort("check_in_at_utc", -1).limit(1)
        async for doc in cursor:
            return serialize_doc(doc)
        return None

    async def record_checkin(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now_utc = datetime.now(timezone.utc)
        doc = {
            "member_id": str(data["member_id"]),
            "member_code_snapshot": str(data["member_code_snapshot"]),
            "member_name_snapshot": str(data["member_name_snapshot"]),
            "check_in_at_utc": now_utc,
            "check_in_local_date": format_date_to_iso(data["check_in_local_date"]),
            "check_in_local_time": data.get("check_in_local_time", now_utc.strftime("%H:%M:%S")),
            "membership_status_at_checkin": data.get("membership_status_at_checkin", "paid"),
            "is_expired_warning": data.get("is_expired_warning", False),
            "created_by": str(data.get("created_by", "admin"))
        }
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return serialize_doc(doc)

    async def count_for_date(self, local_date: date) -> int:
        iso_d = format_date_to_iso(local_date)
        return await self.collection.count_documents({"check_in_local_date": iso_d})

    async def get_today_attendance(
        self,
        local_date: date,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        iso_d = format_date_to_iso(local_date)
        query = {"check_in_local_date": iso_d}
        total = await self.collection.count_documents(query)
        skip = (page - 1) * page_size
        cursor = self.collection.find(query).sort("check_in_at_utc", -1).skip(skip).limit(page_size)
        items = []
        async for doc in cursor:
            items.append(serialize_doc(doc))
        return items, total

    async def get_member_attendance(
        self,
        member_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = {"member_id": str(member_id)}
        total = await self.collection.count_documents(query)
        skip = (page - 1) * page_size
        cursor = self.collection.find(query).sort("check_in_at_utc", -1).skip(skip).limit(page_size)
        items = []
        async for doc in cursor:
            items.append(serialize_doc(doc))
        return items, total

    async def get_expired_checkins_for_date(self, local_date: date) -> List[Dict[str, Any]]:
        iso_d = format_date_to_iso(local_date)
        cursor = self.collection.find({
            "check_in_local_date": iso_d,
            "is_expired_warning": True
        }).sort("check_in_at_utc", -1)
        items = []
        async for doc in cursor:
            items.append(serialize_doc(doc))
        return items

attendance_repo = AttendanceRepository()

