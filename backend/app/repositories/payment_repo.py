from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone, date
from app.db.mongo import db_manager
from app.repositories.base import str_to_oid, serialize_doc, format_date_to_iso

class PaymentRepository:
    @property
    def collection(self):
        return db_manager.get_database().payments

    async def get_by_idempotency_key(self, key: str) -> Optional[Dict[str, Any]]:
        if not key:
            return None
        doc = await self.collection.find_one({"idempotency_key": key})
        return serialize_doc(doc)

    async def create_payment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "member_id": str(data["member_id"]),
            "member_code_snapshot": str(data.get("member_code_snapshot", "")),
            "member_name_snapshot": str(data.get("member_name_snapshot", "")),
            "membership_id": str(data["membership_id"]) if data.get("membership_id") else None,
            "amount": float(data["amount"]),
            "currency": data.get("currency", "INR"),
            "payment_date": format_date_to_iso(data["payment_date"]),
            "payment_method": data.get("payment_method", "Cash"),
            "reference": data.get("reference"),
            "notes": data.get("notes"),
            "status": "completed",
            "record_origin": data.get("record_origin", "regular"),
            "void_reason": None,
            "idempotency_key": data.get("idempotency_key"),
            "created_by": str(data.get("created_by", "admin")),
            "created_at": now,
            "updated_at": now
        }
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return serialize_doc(doc)

    async def get_by_id(self, payment_id: str) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(payment_id)
        if not oid:
            return None
        doc = await self.collection.find_one({"_id": oid})
        return serialize_doc(doc)

    async def void_payment(self, payment_id: str, reason: str, admin_id: str) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(payment_id)
        if not oid:
            return None
        now = datetime.now(timezone.utc)
        res = await self.collection.find_one_and_update(
            {"_id": oid, "status": "completed"},
            {
                "$set": {
                    "status": "voided",
                    "void_reason": reason,
                    "voided_by": admin_id,
                    "voided_at": now,
                    "updated_at": now
                }
            },
            return_document=True
        )
        return serialize_doc(res)

    async def list_payments(
        self,
        member_id: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        payment_method: Optional[str] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int, float]:
        query: Dict[str, Any] = {}
        if member_id:
            query["member_id"] = str(member_id)
        if status:
            query["status"] = status
        if payment_method:
            query["payment_method"] = payment_method
        if search_query and search_query.strip():
            sq = search_query.strip()
            query["$or"] = [
                {"member_code_snapshot": {"$regex": sq, "$options": "i"}},
                {"member_name_snapshot": {"$regex": sq, "$options": "i"}}
            ]
        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query["$gte"] = format_date_to_iso(start_date)
            if end_date:
                date_query["$lte"] = format_date_to_iso(end_date)
            query["payment_date"] = date_query

        total = await self.collection.count_documents(query)
        
        # Calculate sum of completed payments in this query
        sum_pipeline = [
            {"$match": {**query, "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        sum_cursor = await self.collection.aggregate(sum_pipeline)
        total_sum = 0.0
        async for doc in sum_cursor:
            total_sum = float(doc.get("total", 0.0))

        skip = (page - 1) * page_size
        cursor = self.collection.find(query).sort("payment_date", -1).skip(skip).limit(page_size)
        items = []
        async for doc in cursor:
            items.append(serialize_doc(doc))
        return items, total, total_sum

    async def get_recent_payments(self, limit: int = 5) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"status": "completed"}).sort("created_at", -1).limit(limit)
        items = []
        async for doc in cursor:
            items.append(serialize_doc(doc))
        return items

    async def get_monthly_collections(self, month_prefix: str) -> float:
        """Sums completed payments for dates starting with YYYY-MM."""
        pipeline = [
            {
                "$match": {
                    "status": "completed",
                    "payment_date": {"$regex": f"^{month_prefix}"}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        cursor = await self.collection.aggregate(pipeline)
        async for doc in cursor:
            return float(doc.get("total", 0.0))
        return 0.0

    async def get_revenue_timeline(self, num_months: int = 6) -> List[Dict[str, Any]]:
        """Aggregates completed payments grouped by month for the past N months."""
        pipeline = [
            {"$match": {"status": "completed"}},
            {
                "$group": {
                    "_id": {"$substr": ["$payment_date", 0, 7]},
                    "amount": {"$sum": "$amount"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        cursor = await self.collection.aggregate(pipeline)
        result = []
        async for item in cursor:
            month_str = item["_id"]
            if month_str:
                result.append({
                    "month": month_str,
                    "amount": float(item.get("amount", 0.0))
                })
        return result[-num_months:]

payment_repo = PaymentRepository()
