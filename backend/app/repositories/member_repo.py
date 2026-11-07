from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import re
from app.db.mongo import db_manager
from app.repositories.base import str_to_oid, serialize_doc
from app.utils.phone import normalize_phone

class MemberRepository:
    @property
    def collection(self):
        return db_manager.get_database().members

    async def get_by_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(member_id)
        if not oid:
            return None
        doc = await self.collection.find_one({"_id": oid})
        return serialize_doc(doc)

    async def get_by_code(self, member_code: str) -> Optional[Dict[str, Any]]:
        if not member_code:
            return None
        doc = await self.collection.find_one({"member_code": member_code.strip()})
        return serialize_doc(doc)

    async def generate_next_code(self, prefix: str = "GYM") -> str:
        """Finds highest existing numeric sequence for this prefix or generates sequence."""
        pattern = f"^{re.escape(prefix)}(\\d+)$"
        cursor = self.collection.find({"member_code": {"$regex": pattern}}).sort("member_code", -1)
        max_num = 0
        async for doc in cursor:
            code = doc.get("member_code", "")
            match = re.match(pattern, code)
            if match:
                try:
                    num = int(match.group(1))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
        next_num = max_num + 1
        return f"{prefix}{next_num:03d}"

    async def create_member(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "member_code": data["member_code"].strip(),
            "full_name": data["full_name"].strip(),
            "phone": data["phone"].strip(),
            "normalized_phone": normalize_phone(data["phone"]),
            "gender": data.get("gender"),
            "photo": data.get("photo"),
            "joining_date": data.get("joining_date"),
            "joining_date_known": data.get("joining_date_known", True),
            "notes": data.get("notes"),
            "is_archived": False,
            "archived_at": None,
            "created_at": now,
            "updated_at": now
        }
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return serialize_doc(doc)

    async def update_member(self, member_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(member_id)
        if not oid:
            return None
        if "phone" in updates:
            updates["normalized_phone"] = normalize_phone(updates["phone"])
        updates["updated_at"] = datetime.now(timezone.utc)
        res = await self.collection.find_one_and_update(
            {"_id": oid},
            {"$set": updates},
            return_document=True
        )
        return serialize_doc(res)

    async def archive_member(self, member_id: str) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(member_id)
        if not oid:
            return None
        now = datetime.now(timezone.utc)
        res = await self.collection.find_one_and_update(
            {"_id": oid},
            {"$set": {"is_archived": True, "archived_at": now, "updated_at": now}},
            return_document=True
        )
        return serialize_doc(res)

    async def restore_member(self, member_id: str) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(member_id)
        if not oid:
            return None
        now = datetime.now(timezone.utc)
        res = await self.collection.find_one_and_update(
            {"_id": oid},
            {"$set": {"is_archived": False, "archived_at": None, "updated_at": now}},
            return_document=True
        )
        return serialize_doc(res)

    async def update_photo(self, member_id: str, photo: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        oid = str_to_oid(member_id)
        if not oid:
            return None
        now = datetime.now(timezone.utc)
        res = await self.collection.find_one_and_update(
            {"_id": oid},
            {"$set": {"photo": photo, "updated_at": now}},
            return_document=True
        )
        return serialize_doc(res)

    async def search_and_paginate(
        self,
        search_query: Optional[str] = None,
        is_archived: bool = False,
        member_ids: Optional[List[str]] = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        filters: Dict[str, Any] = {"is_archived": is_archived}

        if member_ids is not None:
            oids = [str_to_oid(mid) for mid in member_ids if str_to_oid(mid) is not None]
            filters["_id"] = {"$in": oids}

        if search_query and search_query.strip():
            sq = search_query.strip()
            norm_q = re.sub(r"\D", "", sq)
            escaped_q = re.escape(sq)
            or_conditions: List[Dict[str, Any]] = [
                {"member_code": {"$regex": escaped_q, "$options": "i"}},
                {"full_name": {"$regex": escaped_q, "$options": "i"}}
            ]
            if norm_q:
                or_conditions.append({"normalized_phone": {"$regex": re.escape(norm_q)}})
            filters["$or"] = or_conditions

        total = await self.collection.count_documents(filters)
        skip = (page - 1) * page_size
        cursor = self.collection.find(filters).sort(sort_by, sort_order).skip(skip).limit(page_size)
        items = []
        async for doc in cursor:
            items.append(serialize_doc(doc))
        return items, total

    async def quick_search(self, query_str: str, limit: int = 10) -> List[Dict[str, Any]]:
        if not query_str or not query_str.strip():
            return []
        sq = query_str.strip()
        norm_q = re.sub(r"\D", "", sq)
        escaped_q = re.escape(sq)
        or_conditions: List[Dict[str, Any]] = [
            {"member_code": {"$regex": escaped_q, "$options": "i"}},
            {"full_name": {"$regex": escaped_q, "$options": "i"}}
        ]
        if norm_q:
            or_conditions.append({"normalized_phone": {"$regex": re.escape(norm_q)}})
        
        cursor = self.collection.find({
            "is_archived": False,
            "$or": or_conditions
        }).limit(limit)
        items = []
        async for doc in cursor:
            items.append(serialize_doc(doc))
        return items

member_repo = MemberRepository()

