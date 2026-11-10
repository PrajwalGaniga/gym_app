import asyncio
import sys
from datetime import datetime, timezone
from bson import ObjectId

sys.path.insert(0, 'backend')
from app.db.mongo import db_manager

async def update_prajwal():
    await db_manager.connect()
    db = db_manager.get_database()

    # 1. Find member Prajwal with ID 488
    member = await db.members.find_one({"member_code": "488"})
    if not member:
        print("ERROR: Member 488 not found!")
        return

    member_id_str = str(member["_id"])
    print(f"Found Member: {member.get('full_name')} (ID: {member_id_str})")

    # 2. Find active membership
    membership = await db.memberships.find_one({"member_id": member_id_str})
    membership_id_str = str(membership["_id"]) if membership else None

    # 3. Create payment document for 500 INR on 2nd of Nov 2026
    payment_doc = {
        "member_id": member_id_str,
        "member_code_snapshot": "488",
        "member_name_snapshot": member.get("full_name", "Prajwal"),
        "membership_id": membership_id_str,
        "amount": 500.0,
        "currency": "INR",
        "payment_date": "2026-11-02",
        "payment_method": "Cash",
        "reference": "MANUAL-UPDATE",
        "notes": "Coach payment update: 500 INR on 02 Nov 2026",
        "status": "completed",
        "record_origin": "regular",
        "void_reason": None,
        "idempotency_key": None,
        "created_by": "coach_admin",
        "created_at": datetime(2026, 11, 2, 10, 0, 0, tzinfo=timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    insert_res = await db.payments.insert_one(payment_doc)
    payment_id_str = str(insert_res.inserted_id)
    print(f"Created Payment Record: ID {payment_id_str}, Amount: 500 INR, Date: 2026-11-02")

    # 4. Update member record
    update_member_res = await db.members.update_one(
        {"_id": member["_id"]},
        {"$set": {
            "last_payment_date": "2026-11-02",
            "lifetime_revenue": 500.0,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    print(f"Updated Member document: {update_member_res.modified_count} modified.")

    # 5. Link payment to membership if exists
    if membership:
        update_mship_res = await db.memberships.update_one(
            {"_id": membership["_id"]},
            {"$set": {
                "payment_id": payment_id_str,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        print(f"Updated Membership document: {update_mship_res.modified_count} modified.")

    # 6. Verify result
    updated_member = await db.members.find_one({"member_code": "488"})
    print("VERIFICATION:")
    print(" - Member full_name:", updated_member.get("full_name"))
    print(" - Member last_payment_date:", updated_member.get("last_payment_date"))
    print(" - Member lifetime_revenue:", updated_member.get("lifetime_revenue"))

    latest_payment = await db.payments.find_one({"_id": insert_res.inserted_id})
    print(" - Payment amount:", latest_payment.get("amount"))
    print(" - Payment date:", latest_payment.get("payment_date"))
    print(" - Payment method:", latest_payment.get("payment_method"))
    print(" - Payment status:", latest_payment.get("status"))

    print("Prajwal #488 payment update completed successfully!")

if __name__ == "__main__":
    asyncio.run(update_prajwal())

