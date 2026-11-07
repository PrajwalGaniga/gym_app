from typing import List, Dict, Any
from datetime import datetime, date
from app.repositories.member_repo import member_repo
from app.repositories.membership_repo import membership_repo
from app.repositories.payment_repo import payment_repo
from app.repositories.attendance_repo import attendance_repo
from app.repositories.settings_repo import settings_repo
from app.utils.dates import get_gym_today, calculate_member_status
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    UpcomingRenewalItem,
    ExpiredCheckinItem,
    MonthlyRevenuePoint
)
from app.schemas.payment import PaymentResponse

class DashboardService:
    async def get_dashboard_summary(self) -> DashboardSummaryResponse:
        settings = await settings_repo.get_settings()
        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))
        current_month_prefix = gym_today.strftime("%Y-%m")

        # 1. Total members (active, non-archived)
        total_members = await member_repo.collection.count_documents({"is_archived": False})

        # 2. Latest memberships mapped by member_id
        latest_memberships = await membership_repo.get_all_latest_memberships()

        # 3. Categorize members dynamically
        paid_count = 0
        expiring_soon_count = 0
        expired_count = 0
        upcoming_items: List[UpcomingRenewalItem] = []

        cursor = member_repo.collection.find({"is_archived": False})
        async for m in cursor:
            mid = str(m["_id"])
            m_doc = latest_memberships.get(mid)
            if not m_doc:
                expired_count += 1
                continue

            try:
                exp_d = datetime.strptime(m_doc["expiry_date"], "%Y-%m-%d").date()
                st, rem = calculate_member_status(exp_d, gym_today)
                if st == "paid":
                    paid_count += 1
                elif st == "expiring_soon":
                    expiring_soon_count += 1
                    photo_dict = m.get("photo")
                    upcoming_items.append(UpcomingRenewalItem(
                        member_id=mid,
                        member_code=m.get("member_code", ""),
                        full_name=m.get("full_name", ""),
                        phone=m.get("phone", ""),
                        plan_name=m_doc.get("plan_name_snapshot", "Standard Plan"),
                        expiry_date=exp_d,
                        remaining_days=rem,
                        status=st,
                        photo_url=photo_dict.get("thumbnail_url") or photo_dict.get("url") if photo_dict else None
                    ))
                else:
                    expired_count += 1
            except Exception:
                expired_count += 1

        # Sort upcoming renewals by nearest expiry date
        upcoming_items.sort(key=lambda x: x.expiry_date)
        upcoming_renewals = upcoming_items[:8]

        # 4. New registrations this month
        month_start_iso = f"{current_month_prefix}-01"
        new_registrations = await member_repo.collection.count_documents({
            "is_archived": False,
            "created_at": {
                "$gte": datetime.strptime(f"{month_start_iso} 00:00:00", "%Y-%m-%d %H:%M:%S")
            }
        })

        # 5. Collections this month
        collections_this_month = await payment_repo.get_monthly_collections(current_month_prefix)

        # 6. Today's attendance count
        today_attendance = await attendance_repo.count_for_date(gym_today)

        # 7. Recent payments
        recent_p_docs = await payment_repo.get_recent_payments(limit=5)
        recent_payments = []
        for p in recent_p_docs:
            p_date = datetime.strptime(p["payment_date"], "%Y-%m-%d").date() if isinstance(p.get("payment_date"), str) else p.get("payment_date")
            recent_payments.append(PaymentResponse(
                id=p["id"],
                member_id=p["member_id"],
                member_code_snapshot=p.get("member_code_snapshot", ""),
                member_name_snapshot=p.get("member_name_snapshot", ""),
                membership_id=p.get("membership_id"),
                amount=p["amount"],
                currency=p.get("currency", "INR"),
                payment_date=p_date,
                payment_method=p["payment_method"],
                reference=p.get("reference"),
                status=p.get("status", "completed"),
                record_origin=p.get("record_origin", "regular"),
                void_reason=p.get("void_reason"),
                created_by=p.get("created_by", "admin"),
                created_at=p["created_at"],
                updated_at=p["updated_at"]
            ))

        # 8. Expired checkins today
        expired_checkin_docs = await attendance_repo.get_expired_checkins_for_date(gym_today)
        expired_checkins_today = []
        for chk in expired_checkin_docs:
            mid = chk["member_id"]
            m_doc = latest_memberships.get(mid)
            exp_d = None
            days_exp = 0
            if m_doc:
                try:
                    exp_d = datetime.strptime(m_doc["expiry_date"], "%Y-%m-%d").date()
                    days_exp = (gym_today - exp_d).days
                except Exception:
                    pass
            expired_checkins_today.append(ExpiredCheckinItem(
                attendance_id=chk["id"],
                member_id=mid,
                member_code=chk.get("member_code_snapshot", ""),
                full_name=chk.get("member_name_snapshot", ""),
                check_in_time=chk.get("check_in_local_time", ""),
                expiry_date=exp_d,
                days_expired=days_exp
            ))

        # 9. Revenue chart (monthly data points)
        timeline_raw = await payment_repo.get_revenue_timeline(num_months=6)
        revenue_chart = []
        for pt in timeline_raw:
            m_str = pt["month"]
            try:
                dt = datetime.strptime(m_str, "%Y-%m")
                label = dt.strftime("%b %Y")
            except Exception:
                label = m_str
            revenue_chart.append(MonthlyRevenuePoint(
                month=m_str,
                label=label,
                amount=pt["amount"]
            ))

        return DashboardSummaryResponse(
            total_members=total_members,
            paid_members=paid_count,
            expiring_soon_members=expiring_soon_count,
            expired_members=expired_count,
            new_registrations_this_month=new_registrations,
            collections_this_month=collections_this_month,
            today_attendance_count=today_attendance,
            upcoming_renewals=upcoming_renewals,
            recent_payments=recent_payments,
            expired_checkins_today=expired_checkins_today,
            revenue_chart=revenue_chart
        )

dashboard_service = DashboardService()

