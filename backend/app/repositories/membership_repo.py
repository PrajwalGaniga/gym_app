from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, date
from app.db.mongo import db_manager
from app.repositories.base import str_to_oid, serialize_doc, format_date_to_iso

class MembershipRepository:
    @property
    def collection(self):
        return db_manager.get_database().memberships

    async def create_membership(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "member_id": str(data["member_id"]),
            "plan_id": str(data["plan_id"]),
            "plan_name_snapshot": data.get("plan_name_snapshot", "Custom Plan"),
            "start_date": format_date_to_iso(data["start_date"]),
            "expiry_date": format_date_to_iso(data["expiry_date"]),
            "payment_id": str(data["payment_id"]) if data.get("payment_id") else None,
            "record_origin": data.get("record_origin", "regular"),
            "status": data.get("status", "active"),
            "created_by": str(data.get("created_by", "admin")),
            "created_at": now,
            "updated_at": now
        }
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return serialize_doc(doc)

    async def get_by_id(self, membership_id: str) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(membership_id)
        if not oid:
            return None
        doc = await self.collection.find_one({"_id": oid})
        return serialize_doc(doc)

    async def get_latest_membership_for_member(self, member_id: str) -> Optional[Dict[str, Any]]:
        cursor = self.collection.find({"member_id": str(member_id)}).sort("expiry_date", -1).limit(1)
        async for doc in cursor:
            return serialize_doc(doc)
        return None

    async def get_all_for_member(self, member_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"member_id": str(member_id)}).sort("expiry_date", -1)
        items = []
        async for doc in cursor:
            items.append(serialize_doc(doc))
        return items

    async def update_expiry(self, membership_id: str, new_expiry_date: date, origin: str = "migration") -> Optional[Dict[str, Any]]:
        oid = str_to_oid(membership_id)
        if not oid:
            return None
        now = datetime.now(timezone.utc)
        res = await self.collection.find_one_and_update(
            {"_id": oid},
            {
                "$set": {
                    "expiry_date": format_date_to_iso(new_expiry_date),
                    "record_origin": origin,
                    "updated_at": now
                }
            },
            return_document=True
        )
        return serialize_doc(res)

    async def get_all_latest_memberships(self) -> Dict[str, Dict[str, Any]]:
        """
        Uses aggregation to retrieve the newest membership per member_id.
        Avoids N+1 query patterns.
        """
        pipeline = [
            {"$sort": {"expiry_date": -1}},
            {"$group": {
                "_id": "$member_id",
                "doc": {"$first": "$$ROOT"}
            }}
        ]
        cursor = await self.collection.aggregate(pipeline)
        result = {}
        async for item in cursor:
            member_id = item["_id"]
            doc = item["doc"]
            result[member_id] = serialize_doc(doc)
        return result

membership_repo = MembershipRepository()
