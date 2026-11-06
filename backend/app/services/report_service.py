from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from app.repositories.payment_repo import payment_repo
from app.repositories.member_repo import member_repo
from app.repositories.membership_repo import membership_repo
from app.repositories.attendance_repo import attendance_repo
from app.repositories.settings_repo import settings_repo
from app.utils.dates import get_gym_today, calculate_member_status
from app.utils.csv_export import generate_csv_response
from app.schemas.reports import (
    CollectionsReportResponse,
    PaymentMethodSummary,
    MembersReportResponse,
    AttendanceReportResponse
)

class ReportService:
    async def get_collections_report(self, start_date: date, end_date: date) -> CollectionsReportResponse:
        start_iso = start_date.strftime("%Y-%m-%d")
        end_iso = end_date.strftime("%Y-%m-%d")

        query = {
            "payment_date": {"$gte": start_iso, "$lte": end_iso}
        }

        # 1. Gross and Net
        gross = 0.0
        voided = 0.0
        total_transactions = 0
        method_map: Dict[str, Dict[str, Any]] = {}
        daily_map: Dict[str, float] = {}

        cursor = payment_repo.collection.find(query)
        async for doc in cursor:
            amt = float(doc.get("amount", 0.0))
            st = doc.get("status", "completed")
            method = doc.get("payment_method", "Cash")
            p_date = doc.get("payment_date", "")

            if st == "completed":
                gross += amt
                total_transactions += 1
                if method not in method_map:
                    method_map[method] = {"amount": 0.0, "count": 0}
                method_map[method]["amount"] += amt
                method_map[method]["count"] += 1
                daily_map[p_date] = daily_map.get(p_date, 0.0) + amt
            elif st == "voided":
                voided += amt

        net = gross  # Voided payments are never counted as revenue

        by_method = [
            PaymentMethodSummary(method=m, amount=v["amount"], count=v["count"])
            for m, v in sorted(method_map.items())
        ]

        daily_totals = [
            {"date": d, "amount": amt}
            for d, amt in sorted(daily_map.items())
        ]

        return CollectionsReportResponse(
            start_date=start_date,
            end_date=end_date,
            gross_collected=gross,
            voided_amount=voided,
            net_collected=net,
            total_transactions=total_transactions,
            by_payment_method=by_method,
            daily_totals=daily_totals
        )

    async def get_members_report(self, start_date: date, end_date: date) -> MembersReportResponse:
        start_iso = f"{start_date.strftime('%Y-%m-%d')} 00:00:00"
        end_iso = f"{end_date.strftime('%Y-%m-%d')} 23:59:59"

        total_registered = await member_repo.collection.count_documents({"is_archived": False})

        new_reg = await member_repo.collection.count_documents({
            "is_archived": False,
            "created_at": {
                "$gte": datetime.strptime(start_iso, "%Y-%m-%d %H:%M:%S"),
                "$lte": datetime.strptime(end_iso, "%Y-%m-%d %H:%M:%S")
            }
        })

        renewals = await membership_repo.collection.count_documents({
            "record_origin": "regular",
            "created_at": {
                "$gte": datetime.strptime(start_iso, "%Y-%m-%d %H:%M:%S"),
                "$lte": datetime.strptime(end_iso, "%Y-%m-%d %H:%M:%S")
            }
        })

        # Current statuses
        settings = await settings_repo.get_settings()
        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))
        latest_m = await membership_repo.get_all_latest_memberships()

        paid_cnt = 0
        soon_cnt = 0
        exp_cnt = 0

        cursor = member_repo.collection.find({"is_archived": False})
        async for m in cursor:
            mid = str(m["_id"])
            m_doc = latest_m.get(mid)
            if not m_doc:
                exp_cnt += 1
                continue
            try:
                exp_d = datetime.strptime(m_doc["expiry_date"], "%Y-%m-%d").date()
                st, _ = calculate_member_status(exp_d, gym_today)
                if st == "paid":
                    paid_cnt += 1
                elif st == "expiring_soon":
                    soon_cnt += 1
                else:
                    exp_cnt += 1
            except Exception:
                exp_cnt += 1

        return MembersReportResponse(
            start_date=start_date,
            end_date=end_date,
            total_registered=total_registered,
            new_registrations=new_reg,
            renewals_count=renewals,
            current_paid=paid_cnt,
            current_expiring_soon=soon_cnt,
            current_expired=exp_cnt
        )

    async def get_attendance_report(self, start_date: date, end_date: date) -> AttendanceReportResponse:
        start_iso = start_date.strftime("%Y-%m-%d")
        end_iso = end_date.strftime("%Y-%m-%d")

        query = {
            "check_in_local_date": {"$gte": start_iso, "$lte": end_iso}
        }

        total_checkins = await attendance_repo.collection.count_documents(query)
        expired_count = await attendance_repo.collection.count_documents({
            **query,
            "is_expired_warning": True
        })

        # Distinct unique members
        unique_members = len(await attendance_repo.collection.distinct("member_id", query))

        # Daily breakdown
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": "$check_in_local_date",
                    "total": {"$sum": 1},
                    "expired": {"$sum": {"$cond": ["$is_expired_warning", 1, 0]}}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        daily_cursor = await attendance_repo.collection.aggregate(pipeline)
        daily_breakdown = []
        async for item in daily_cursor:
            daily_breakdown.append({
                "date": item["_id"],
                "total": item.get("total", 0),
                "expired": item.get("expired", 0)
            })

        return AttendanceReportResponse(
            start_date=start_date,
            end_date=end_date,
            total_checkins=total_checkins,
            unique_members=unique_members,
            expired_checkins_count=expired_count,
            daily_breakdown=daily_breakdown
        )

    async def export_attendance_csv(self, start_date: date, end_date: date) -> str:
        start_iso = start_date.strftime("%Y-%m-%d")
        end_iso = end_date.strftime("%Y-%m-%d")
        query = {"check_in_local_date": {"$gte": start_iso, "$lte": end_iso}}

        cursor = attendance_repo.collection.find(query).sort("check_in_at_utc", -1)
        fieldnames = [
            "check_in_date",
            "check_in_time",
            "member_code",
            "member_name",
            "membership_status",
            "expired_warning"
        ]
        rows = []
        async for doc in cursor:
            rows.append({
                "check_in_date": doc.get("check_in_local_date", ""),
                "check_in_time": doc.get("check_in_local_time", ""),
                "member_code": doc.get("member_code_snapshot", ""),
                "member_name": doc.get("member_name_snapshot", ""),
                "membership_status": doc.get("membership_status_at_checkin", ""),
                "expired_warning": "YES" if doc.get("is_expired_warning") else "NO"
            })
        return generate_csv_response(fieldnames, rows)

report_service = ReportService()
