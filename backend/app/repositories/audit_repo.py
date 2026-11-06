from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from app.db.mongo import db_manager
from app.repositories.base import serialize_doc

class AuditRepository:
    @property
    def collection(self):
        return db_manager.get_database().audit_logs

    async def log_action(
        self,
        admin_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        before: Optional[Dict[str, Any]] = None,
        after: Optional[Dict[str, Any]] = None,
        reason: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "admin_id": str(admin_id),
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "before": before,
            "after": after,
            "reason": reason,
            "request_id": request_id,
            "created_at": now
        }
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return serialize_doc(doc)

    async def get_logs_for_entity(self, entity_type: str, entity_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({
            "entity_type": entity_type,
            "entity_id": str(entity_id)
        }).sort("created_at", -1)
        items = []
        async for doc in cursor:
            items.append(serialize_doc(doc))
        return items

audit_repo = AuditRepository()
