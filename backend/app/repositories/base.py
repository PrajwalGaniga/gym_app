from bson import ObjectId
from typing import Any, Dict, Optional
from datetime import datetime, date

def oid_to_str(oid: Any) -> str:
    if isinstance(oid, ObjectId):
        return str(oid)
    return str(oid) if oid is not None else ""

def str_to_oid(id_str: str) -> Optional[ObjectId]:
    if not id_str:
        return None
    try:
        return ObjectId(id_str)
    except Exception:
        return None

def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    res = dict(doc)
    if "_id" in res:
        res["id"] = oid_to_str(res.pop("_id"))
    return res

def format_date_to_iso(d: Any) -> Optional[str]:
    if isinstance(d, (date, datetime)):
        return d.strftime("%Y-%m-%d")
    return d
