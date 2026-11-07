from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.db.mongo import db_manager
from app.repositories.base import str_to_oid, serialize_doc

class PlanRepository:
    @property
    def collection(self):
        return db_manager.get_database().plans

    async def seed_default_plans(self):
        now = datetime.now(timezone.utc)
        one_month = await self.collection.find_one({"duration_value": 1, "duration_unit": "month", "price": 500.0})
        if not one_month:
            await self.collection.insert_one({
                "name": "1 Month",
                "duration_unit": "month",
                "duration_value": 1,
                "price": 500.0,
                "currency": "INR",
                "description": "Standard 1 month gym membership (₹500/month)",
                "is_active": True,
                "created_at": now,
                "updated_at": now
            })

        two_months = await self.collection.find_one({"duration_value": 2, "duration_unit": "month", "price": 1000.0})
        if not two_months:
            await self.collection.insert_one({
                "name": "2 Months",
                "duration_unit": "month",
                "duration_value": 2,
                "price": 1000.0,
                "currency": "INR",
                "description": "2 months gym membership (₹1,000 for 2 months)",
                "is_active": True,
                "created_at": now,
                "updated_at": now
            })

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

