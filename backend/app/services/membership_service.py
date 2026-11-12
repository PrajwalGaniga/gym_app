from typing import Optional, Dict, Any, Tuple
from datetime import date, datetime
from app.repositories.member_repo import member_repo
from app.repositories.membership_repo import membership_repo
from app.repositories.payment_repo import payment_repo
from app.repositories.plan_repo import plan_repo
from app.repositories.settings_repo import settings_repo
from app.repositories.audit_repo import audit_repo
from app.utils.dates import calculate_renewal_dates, get_gym_today, calculate_member_status, calculate_plan_expiry
from app.schemas.membership import RenewalRequest, RenewalPreviewResponse, ExpiryMigrationRequest, MembershipResponse

class MembershipService:
    async def preview_renewal(
        self,
        member_id: str,
        plan_id: str,
        payment_date: Optional[date] = None,
        custom_start_date: Optional[date] = None
    ) -> RenewalPreviewResponse:
        member = await member_repo.get_by_id(member_id)
        if not member:
            raise ValueError("Member not found.")

        plan = await plan_repo.get_by_id(plan_id)
        if not plan:
            raise ValueError("Membership plan not found.")

        settings = await settings_repo.get_settings()
        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))
        pay_date = payment_date or gym_today

        latest_m = await membership_repo.get_latest_membership_for_member(member_id)
        current_expiry = None
        if latest_m:
            try:
                current_expiry = datetime.strptime(latest_m["expiry_date"], "%Y-%m-%d").date()
            except Exception:
                pass

        new_start, new_expiry = calculate_renewal_dates(
            current_expiry_date=current_expiry,
            payment_date=pay_date,
            custom_start_date=custom_start_date,
            duration_unit=plan["duration_unit"],
            duration_value=plan["duration_value"],
            gym_today=gym_today
        )

        is_extended = (current_expiry is not None and current_expiry >= gym_today and custom_start_date is None)

        return RenewalPreviewResponse(
            member_id=member["id"],
            member_code=member["member_code"],
            member_name=member["full_name"],
            current_expiry_date=current_expiry,
            calculated_start_date=new_start,
            calculated_expiry_date=new_expiry,
            plan_name=plan["name"],
            amount=plan["price"],
            is_extended_from_expiry=is_extended
        )

    async def renew_membership(self, member_id: str, data: RenewalRequest, admin_id: str) -> MembershipResponse:
        member = await member_repo.get_by_id(member_id)
        if not member:
            raise ValueError("Member not found.")

        # Idempotency safeguard: check if idempotency key already processed
        if data.idempotency_key:
            existing_payment = await payment_repo.get_by_idempotency_key(data.idempotency_key)
            if existing_payment:
                # Retrieve the linked membership
                m_id = existing_payment.get("membership_id")
                if m_id:
                    m_doc = await membership_repo.get_by_id(m_id)
                    if m_doc:
                        settings = await settings_repo.get_settings()
                        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))
                        exp_d = datetime.strptime(m_doc["expiry_date"], "%Y-%m-%d").date()
                        start_d = datetime.strptime(m_doc["start_date"], "%Y-%m-%d").date()
                        st, rem = calculate_member_status(exp_d, gym_today)
                        return MembershipResponse(
                            id=m_doc["id"],
                            member_id=m_doc["member_id"],
                            plan_id=m_doc["plan_id"],
                            plan_name_snapshot=m_doc["plan_name_snapshot"],
                            start_date=start_d,
                            expiry_date=exp_d,
                            payment_id=existing_payment["id"],
                            status=st,
                            remaining_days=rem,
                            record_origin=m_doc.get("record_origin", "regular"),
                            created_at=m_doc["created_at"],
                            created_by=m_doc["created_by"]
                        )

        plan = await plan_repo.get_by_id(data.plan_id)
        if not plan:
            raise ValueError("Membership plan not found.")

        settings = await settings_repo.get_settings()
        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))

        latest_m = await membership_repo.get_latest_membership_for_member(member_id)
        current_expiry = None
        if latest_m:
            try:
                current_expiry = datetime.strptime(latest_m["expiry_date"], "%Y-%m-%d").date()
            except Exception:
                pass

        new_start, new_expiry = calculate_renewal_dates(
            current_expiry_date=current_expiry,
            payment_date=data.payment_date,
            custom_start_date=data.custom_start_date,
            duration_unit=plan["duration_unit"],
            duration_value=plan["duration_value"],
            gym_today=gym_today
        )

        # 1. Create new membership period document (NEVER overwrite old membership periods)
        m_doc = await membership_repo.create_membership({
            "member_id": member["id"],
            "plan_id": plan["id"],
            "plan_name_snapshot": plan["name"],
            "start_date": new_start,
            "expiry_date": new_expiry,
            "record_origin": "regular",
            "created_by": admin_id
        })
        membership_id = m_doc["id"]

        # 2. Append new payment record
        charge_amount = data.payment_amount if data.payment_amount is not None else float(plan["price"])
        p_doc = await payment_repo.create_payment({
            "member_id": member["id"],
            "member_code_snapshot": member["member_code"],
            "member_name_snapshot": member["full_name"],
            "membership_id": membership_id,
            "amount": charge_amount,
            "currency": settings.get("currency", "INR"),
            "payment_date": data.payment_date,
            "payment_method": data.payment_method,
            "reference": data.reference,
            "notes": data.notes,
            "record_origin": "regular",
            "idempotency_key": data.idempotency_key,
            "created_by": admin_id
        })

        # Link payment to membership
        from app.repositories.base import str_to_oid
        await membership_repo.collection.update_one(
            {"_id": str_to_oid(membership_id)},
            {"$set": {"payment_id": p_doc["id"]}}
        )

        # Audit log
        await audit_repo.log_action(
            admin_id=admin_id,
            action="membership_renewed",
            entity_type="membership",
            entity_id=membership_id,
            after={
                "member_code": member["member_code"],
                "plan": plan["name"],
                "start": str(new_start),
                "expiry": str(new_expiry),
                "amount": data.payment_amount
            }
        )

        status, remaining = calculate_member_status(new_expiry, gym_today)
        return MembershipResponse(
            id=membership_id,
            member_id=member["id"],
            plan_id=plan["id"],
            plan_name_snapshot=plan["name"],
            start_date=new_start,
            expiry_date=new_expiry,
            payment_id=p_doc["id"],
            status=status,
            remaining_days=remaining,
            record_origin="regular",
            created_at=m_doc["created_at"],
            created_by=admin_id
        )

    async def migrate_expiry_date(
        self,
        member_id: str,
        data: ExpiryMigrationRequest,
        admin_id: str
    ) -> MembershipResponse:
        member = await member_repo.get_by_id(member_id)
        if not member:
            raise ValueError("Member not found.")

        settings = await settings_repo.get_settings()
        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))

        latest_m = await membership_repo.get_latest_membership_for_member(member_id)
        before_expiry = latest_m.get("expiry_date") if latest_m else None

        if latest_m:
            updated = await membership_repo.update_expiry(
                membership_id=latest_m["id"],
                new_expiry_date=data.new_expiry_date,
                origin="migration"
            )
            membership_id = latest_m["id"]
            start_d = datetime.strptime(latest_m["start_date"], "%Y-%m-%d").date()
            plan_name = latest_m["plan_name_snapshot"]
            plan_id = latest_m["plan_id"]
        else:
            # Create a membership period for this migrated expiry
            m_doc = await membership_repo.create_membership({
                "member_id": member["id"],
                "plan_id": "migration_plan",
                "plan_name_snapshot": "Migrated Legacy Period",
                "start_date": gym_today,
                "expiry_date": data.new_expiry_date,
                "record_origin": "migration",
                "created_by": admin_id
            })
            membership_id = m_doc["id"]
            start_d = gym_today
            plan_name = "Migrated Legacy Period"
            plan_id = "migration_plan"

        # Mandatory audit log entry for manual expiry migration
        await audit_repo.log_action(
            admin_id=admin_id,
            action="manual_expiry_migrated",
            entity_type="membership",
            entity_id=membership_id,
            before={"expiry_date": before_expiry},
            after={"expiry_date": str(data.new_expiry_date)},
            reason=data.reason or "Coach manual date adjustment"
        )

        status, remaining = calculate_member_status(data.new_expiry_date, gym_today)
        return MembershipResponse(
            id=membership_id,
            member_id=member["id"],
            plan_id=plan_id,
            plan_name_snapshot=plan_name,
            start_date=start_d,
            expiry_date=data.new_expiry_date,
            payment_id=None,
            status=status,
            remaining_days=remaining,
            record_origin="migration",
            created_at=datetime.now(),
            created_by=admin_id
        )

membership_service = MembershipService()
