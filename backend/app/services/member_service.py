from typing import List, Dict, Any, Optional, Tuple
from datetime import date, datetime
from app.repositories.member_repo import member_repo
from app.repositories.membership_repo import membership_repo
from app.repositories.payment_repo import payment_repo
from app.repositories.plan_repo import plan_repo
from app.repositories.settings_repo import settings_repo
from app.repositories.audit_repo import audit_repo
from app.utils.dates import calculate_plan_expiry, get_gym_today, calculate_member_status
from app.utils.phone import validate_phone
from app.schemas.member import MemberCreate, LegacyMemberCreate, MemberUpdate, MemberResponse, PaginatedMembersResponse, MembershipSnapshot

class MemberService:
    async def create_new_member(self, data: MemberCreate, admin_id: str) -> MemberResponse:
        settings = await settings_repo.get_settings()
        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))

        if not validate_phone(data.phone):
            raise ValueError("Invalid phone number. Must contain between 7 and 15 digits.")

        # Resolve member_code
        member_code = data.member_code
        if not member_code or not member_code.strip():
            prefix = settings.get("member_code_prefix", "GYM")
            member_code = await member_repo.generate_next_code(prefix)
        else:
            member_code = member_code.strip()
            existing = await member_repo.get_by_code(member_code)
            if existing:
                raise ValueError(f"Member ID '{member_code}' is already taken.")

        # Retrieve plan
        plan = await plan_repo.get_by_id(data.plan_id)
        if not plan:
            raise ValueError(f"Selected plan '{data.plan_id}' does not exist.")

        start_date = data.start_date or data.joining_date
        expiry_date = calculate_plan_expiry(
            start_date=start_date,
            duration_unit=plan["duration_unit"],
            duration_value=plan["duration_value"]
        )

        photo_obj = None
        if data.photo_url:
            photo_obj = {"url": data.photo_url, "thumbnail_url": data.photo_url}

        # 1. Create Member
        member_doc = await member_repo.create_member({
            "member_code": member_code,
            "full_name": data.full_name,
            "phone": data.phone,
            "photo": photo_obj,
            "joining_date": data.joining_date.strftime("%Y-%m-%d"),
            "joining_date_known": True,
            "notes": data.notes
        })
        member_id = member_doc["id"]

        # 2. Create Membership Period
        membership_doc = await membership_repo.create_membership({
            "member_id": member_id,
            "plan_id": data.plan_id,
            "plan_name_snapshot": plan["name"],
            "start_date": start_date,
            "expiry_date": expiry_date,
            "record_origin": "regular",
            "created_by": admin_id
        })
        membership_id = membership_doc["id"]

        # 3. Create Payment Record (only when genuine amount recorded)
        payment_date = data.payment_date or data.joining_date
        payment_doc = await payment_repo.create_payment({
            "member_id": member_id,
            "member_code_snapshot": member_code,
            "member_name_snapshot": data.full_name,
            "membership_id": membership_id,
            "amount": data.amount_paid,
            "currency": settings.get("currency", "INR"),
            "payment_date": payment_date,
            "payment_method": data.payment_method,
            "reference": data.reference,
            "notes": data.notes,
            "record_origin": "regular",
            "created_by": admin_id
        })

        # Update membership with payment_id
        from app.repositories.base import str_to_oid
        await membership_repo.collection.update_one(
            {"_id": str_to_oid(membership_doc["id"])},
            {"$set": {"payment_id": payment_doc["id"]}}
        )

        # Audit log
        await audit_repo.log_action(
            admin_id=admin_id,
            action="member_registered",
            entity_type="member",
            entity_id=member_id,
            after={"member_code": member_code, "full_name": data.full_name, "plan": plan["name"]}
        )

        return await self.get_member_detail(member_id)

    async def create_legacy_member(self, data: LegacyMemberCreate, admin_id: str) -> MemberResponse:
        settings = await settings_repo.get_settings()
        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))

        if not validate_phone(data.phone):
            raise ValueError("Invalid phone number. Must contain between 7 and 15 digits.")

        # Preserve legacy code verbatim
        member_code = data.member_code.strip()
        existing = await member_repo.get_by_code(member_code)
        if existing:
            raise ValueError(f"Existing Member ID '{member_code}' is already registered in the system.")

        photo_obj = None
        if data.photo_url:
            photo_obj = {"url": data.photo_url, "thumbnail_url": data.photo_url}

        # 1. Create Member
        joining_date_iso = data.joining_date.strftime("%Y-%m-%d") if data.joining_date else None
        member_doc = await member_repo.create_member({
            "member_code": member_code,
            "full_name": data.full_name,
            "phone": data.phone,
            "photo": photo_obj,
            "joining_date": joining_date_iso,
            "joining_date_known": data.joining_date_known if data.joining_date else False,
            "notes": data.migration_notes
        })
        member_id = member_doc["id"]

        membership_id = None
        # 2. If current expiry date is provided, create legacy membership record
        if data.current_expiry_date:
            plan_name = "Legacy Membership Plan"
            if data.plan_id:
                plan = await plan_repo.get_by_id(data.plan_id)
                if plan:
                    plan_name = plan["name"]
            
            start_date = data.current_start_date or data.joining_date or gym_today
            membership_doc = await membership_repo.create_membership({
                "member_id": member_id,
                "plan_id": data.plan_id or "legacy_plan",
                "plan_name_snapshot": plan_name,
                "start_date": start_date,
                "expiry_date": data.current_expiry_date,
                "record_origin": "legacy",
                "created_by": admin_id
            })
            membership_id = membership_doc["id"]

        # 3. If genuine historical payment details were supplied, record with record_origin="legacy"
        if data.payment_amount is not None and data.payment_date and data.payment_method:
            await payment_repo.create_payment({
                "member_id": member_id,
                "member_code_snapshot": member_code,
                "member_name_snapshot": data.full_name,
                "membership_id": membership_id,
                "amount": data.payment_amount,
                "currency": settings.get("currency", "INR"),
                "payment_date": data.payment_date,
                "payment_method": data.payment_method,
                "notes": f"Legacy Payment Record: {data.migration_notes or ''}".strip(),
                "record_origin": "legacy",
                "created_by": admin_id
            })

        # Audit log
        await audit_repo.log_action(
            admin_id=admin_id,
            action="legacy_member_migrated",
            entity_type="member",
            entity_id=member_id,
            reason=data.migration_notes or "Legacy member manual entry",
            after={"member_code": member_code, "full_name": data.full_name, "expiry": str(data.current_expiry_date)}
        )

        return await self.get_member_detail(member_id)

    async def get_member_detail(self, member_id: str) -> Optional[MemberResponse]:
        doc = await member_repo.get_by_id(member_id)
        if not doc:
            return None

        settings = await settings_repo.get_settings()
        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))

        latest_membership = await membership_repo.get_latest_membership_for_member(member_id)
        membership_snapshot = None
        status = "expired"
        remaining_days = 0

        if latest_membership:
            expiry_d = datetime.strptime(latest_membership["expiry_date"], "%Y-%m-%d").date()
            start_d = datetime.strptime(latest_membership["start_date"], "%Y-%m-%d").date()
            status, remaining_days = calculate_member_status(expiry_d, gym_today)
            membership_snapshot = MembershipSnapshot(
                id=latest_membership["id"],
                plan_name=latest_membership["plan_name_snapshot"],
                start_date=start_d,
                expiry_date=expiry_d,
                status=status,
                remaining_days=remaining_days,
                record_origin=latest_membership.get("record_origin", "regular")
            )

        joining_d = datetime.strptime(doc["joining_date"], "%Y-%m-%d").date() if doc.get("joining_date") else None

        return MemberResponse(
            id=doc["id"],
            member_code=doc["member_code"],
            full_name=doc["full_name"],
            phone=doc["phone"],
            normalized_phone=doc.get("normalized_phone", ""),
            photo=doc.get("photo"),
            joining_date=joining_d,
            joining_date_known=doc.get("joining_date_known", True),
            notes=doc.get("notes"),
            is_archived=doc.get("is_archived", False),
            archived_at=doc.get("archived_at"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            current_membership=membership_snapshot,
            status=status,
            remaining_days=remaining_days
        )

    async def list_members(
        self,
        category: Optional[str] = None,  # "paid", "expiring_soon", "expired"
        search_query: Optional[str] = None,
        is_archived: bool = False,
        page: int = 1,
        page_size: int = 20
    ) -> PaginatedMembersResponse:
        settings = await settings_repo.get_settings()
        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))

        # Fetch latest memberships for all members efficiently
        all_latest_memberships = await membership_repo.get_all_latest_memberships()

        target_member_ids = None
        if category in ("paid", "expiring_soon", "expired"):
            # Filter member IDs by category
            category_member_ids = []
            for mid, m_doc in all_latest_memberships.items():
                try:
                    exp_d = datetime.strptime(m_doc["expiry_date"], "%Y-%m-%d").date()
                    cat, _ = calculate_member_status(exp_d, gym_today)
                    if cat == category:
                        category_member_ids.append(mid)
                except Exception:
                    pass
            
            # Members with no membership are automatically categorized as "expired"
            if category == "expired":
                # Find members who have no membership
                all_known_members_cursor = member_repo.collection.find({"is_archived": is_archived}, {"_id": 1})
                async for m in all_known_members_cursor:
                    m_id_str = str(m["_id"])
                    if m_id_str not in all_latest_memberships:
                        category_member_ids.append(m_id_str)

            target_member_ids = category_member_ids

        # Query members from MongoDB with pagination
        raw_members, total = await member_repo.search_and_paginate(
            search_query=search_query,
            is_archived=is_archived,
            member_ids=target_member_ids,
            page=page,
            page_size=page_size
        )

        items: List[MemberResponse] = []
        for doc in raw_members:
            mid = doc["id"]
            latest_m = all_latest_memberships.get(mid)
            membership_snapshot = None
            status = "expired"
            remaining_days = 0

            if latest_m:
                try:
                    exp_d = datetime.strptime(latest_m["expiry_date"], "%Y-%m-%d").date()
                    start_d = datetime.strptime(latest_m["start_date"], "%Y-%m-%d").date()
                    status, remaining_days = calculate_member_status(exp_d, gym_today)
                    membership_snapshot = MembershipSnapshot(
                        id=latest_m["id"],
                        plan_name=latest_m["plan_name_snapshot"],
                        start_date=start_d,
                        expiry_date=exp_d,
                        status=status,
                        remaining_days=remaining_days,
                        record_origin=latest_m.get("record_origin", "regular")
                    )
                except Exception:
                    pass

            joining_d = datetime.strptime(doc["joining_date"], "%Y-%m-%d").date() if doc.get("joining_date") else None
            items.append(MemberResponse(
                id=doc["id"],
                member_code=doc["member_code"],
                full_name=doc["full_name"],
                phone=doc["phone"],
                normalized_phone=doc.get("normalized_phone", ""),
                photo=doc.get("photo"),
                joining_date=joining_d,
                joining_date_known=doc.get("joining_date_known", True),
                notes=doc.get("notes"),
                is_archived=doc.get("is_archived", False),
                archived_at=doc.get("archived_at"),
                created_at=doc["created_at"],
                updated_at=doc["updated_at"],
                current_membership=membership_snapshot,
                status=status,
                remaining_days=remaining_days
            ))

        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1

        return PaginatedMembersResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

member_service = MemberService()
