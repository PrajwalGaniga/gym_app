from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.db.mongo import db_manager
from app.repositories.base import str_to_oid, serialize_doc

class PlanRepository:
    @property
    def collection(self):
        return db_manager.get_database().plans

    async def seed_default_plans(self):
        count = await self.collection.count_documents({})
        if count == 0:
            now = datetime.now(timezone.utc)
            default_plans = [
                {
                    "name": "1 Month Standard",
                    "duration_unit": "month",
                    "duration_value": 1,
                    "price": 1500.0,
                    "currency": "INR",
                    "description": "Standard 1 calendar month gym membership",
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now
                },
                {
                    "name": "3 Months Quarterly",
                    "duration_unit": "month",
                    "duration_value": 3,
                    "price": 4000.0,
                    "currency": "INR",
                    "description": "3 calendar months quarterly membership plan",
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now
                },
                {
                    "name": "6 Months Half-Yearly",
                    "duration_unit": "month",
                    "duration_value": 6,
                    "price": 7500.0,
                    "currency": "INR",
                    "description": "6 calendar months half-yearly membership plan",
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now
                },
                {
                    "name": "12 Months Annual",
                    "duration_unit": "month",
                    "duration_value": 12,
                    "price": 14000.0,
                    "currency": "INR",
                    "description": "12 calendar months full annual membership plan",
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now
                }
            ]
            await self.collection.insert_many(default_plans)

    async def list_plans(self, active_only: bool = False) -> List[Dict[str, Any]]:
        query = {"is_active": True} if active_only else {}
        cursor = self.collection.find(query).sort("price", 1)
        plans = []
        async for doc in cursor:
            plans.append(serialize_doc(doc))
        return plans

    async def get_by_id(self, plan_id: str) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(plan_id)
        if not oid:
            return None
        doc = await self.collection.find_one({"_id": oid})
        return serialize_doc(doc)

    async def create_plan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {**data, "created_at": now, "updated_at": now}
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return serialize_doc(doc)

    async def update_plan(self, plan_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(plan_id)
        if not oid:
            return None
        updates["updated_at"] = datetime.now(timezone.utc)
        res = await self.collection.find_one_and_update(
            {"_id": oid},
            {"$set": updates},
            return_document=True
        )
        return serialize_doc(res)

plan_repo = PlanRepository()
