from pymongo import ASCENDING, DESCENDING
from app.db.mongo import db_manager
from app.core.logging import logger

async def create_indexes():
    """Ensure all required collections and indexes exist in MongoDB Atlas."""
    db = db_manager.get_database()
    logger.info("Verifying and creating MongoDB indexes...")

    # admins
    await db.admins.create_index([("username", ASCENDING)], unique=True)

    # members
    await db.members.create_index([("member_code", ASCENDING)], unique=True)
    await db.members.create_index([("normalized_phone", ASCENDING)])
    await db.members.create_index([("full_name", ASCENDING)])
    await db.members.create_index([("is_archived", ASCENDING), ("created_at", DESCENDING)])

    # memberships
    await db.memberships.create_index([("member_id", ASCENDING), ("expiry_date", DESCENDING)])
    await db.memberships.create_index([("expiry_date", ASCENDING)])
    await db.memberships.create_index([("status", ASCENDING)])

    # payments
    await db.payments.create_index([("payment_date", DESCENDING)])
    await db.payments.create_index([("member_id", ASCENDING), ("payment_date", DESCENDING)])
    await db.payments.create_index([("status", ASCENDING)])

    # attendance
    await db.attendance.create_index([("member_id", ASCENDING), ("check_in_local_date", DESCENDING)])
    await db.attendance.create_index([("check_in_at_utc", DESCENDING)])
    await db.attendance.create_index([("check_in_local_date", DESCENDING)])

    # plans
    await db.plans.create_index([("name", ASCENDING)], unique=True)

    # audit_logs
    await db.audit_logs.create_index([("created_at", DESCENDING)])
    await db.audit_logs.create_index([("entity_type", ASCENDING), ("entity_id", ASCENDING)])

    logger.info("MongoDB indexes verified successfully.")

