from typing import List, Dict, Any, Optional, Tuple
from datetime import date, datetime
from app.repositories.payment_repo import payment_repo
from app.repositories.member_repo import member_repo
from app.repositories.audit_repo import audit_repo
from app.utils.csv_export import generate_csv_response
from app.schemas.payment import PaymentResponse, PaginatedPaymentsResponse, PaymentCreate

class PaymentService:
    async def create_payment(self, data: PaymentCreate, admin_id: str) -> PaymentResponse:
        member = await member_repo.get_by_id(data.member_id)
        if not member:
            raise ValueError("Member not found.")

        p_doc = await payment_repo.create_payment({
            "member_id": member["id"],
            "member_code_snapshot": member["member_code"],
            "member_name_snapshot": member["full_name"],
            "membership_id": data.membership_id,
            "amount": data.amount,
            "payment_date": data.payment_date,
            "payment_method": data.payment_method,
            "reference": data.reference,
            "notes": data.notes,
            "record_origin": "regular",
            "created_by": admin_id
        })

        await audit_repo.log_action(
            admin_id=admin_id,
            action="payment_created",
            entity_type="payment",
            entity_id=p_doc["id"],
            after={"amount": data.amount, "method": data.payment_method, "member": member["member_code"]}
        )

        return self._to_payment_response(p_doc)

    async def void_payment(self, payment_id: str, reason: str, admin_id: str) -> PaymentResponse:
        p_doc = await payment_repo.get_by_id(payment_id)
        if not p_doc:
            raise ValueError("Payment record not found.")

        if p_doc.get("status") == "voided":
            raise ValueError("Payment is already voided.")

        updated = await payment_repo.void_payment(payment_id, reason, admin_id)
        if not updated:
            raise ValueError("Failed to void payment.")

        await audit_repo.log_action(
            admin_id=admin_id,
            action="payment_voided",
            entity_type="payment",
            entity_id=payment_id,
            before={"status": "completed", "amount": p_doc["amount"]},
            after={"status": "voided", "reason": reason},
            reason=reason
        )

        return self._to_payment_response(updated)

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
    ) -> PaginatedPaymentsResponse:
        items_raw, total, total_sum = await payment_repo.list_payments(
            member_id=member_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
            payment_method=payment_method,
            search_query=search_query,
            page=page,
            page_size=page_size
        )

        items = [self._to_payment_response(d) for d in items_raw]
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1

        return PaginatedPaymentsResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            total_amount_collected=total_sum
        )

    async def export_payments_csv(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None
    ) -> str:
        items_raw, _, _ = await payment_repo.list_payments(
            status=status,
            start_date=start_date,
            end_date=end_date,
            page=1,
            page_size=10000
        )

        fieldnames = [
            "payment_id",
            "member_code",
            "member_name",
            "payment_date",
            "amount",
            "currency",
            "payment_method",
            "reference",
            "status",
            "record_origin",
            "void_reason",
            "created_at"
        ]

        rows = []
        for doc in items_raw:
            rows.append({
                "payment_id": doc["id"],
                "member_code": doc.get("member_code_snapshot", ""),
                "member_name": doc.get("member_name_snapshot", ""),
                "payment_date": doc.get("payment_date", ""),
                "amount": doc.get("amount", 0.0),
                "currency": doc.get("currency", "INR"),
                "payment_method": doc.get("payment_method", ""),
                "reference": doc.get("reference", "") or "",
                "status": doc.get("status", "completed"),
                "record_origin": doc.get("record_origin", "regular"),
                "void_reason": doc.get("void_reason", "") or "",
                "created_at": str(doc.get("created_at", ""))
            })

        return generate_csv_response(fieldnames, rows)

    def _to_payment_response(self, doc: Dict[str, Any]) -> PaymentResponse:
        p_date = datetime.strptime(doc["payment_date"], "%Y-%m-%d").date() if isinstance(doc.get("payment_date"), str) else doc.get("payment_date")
        return PaymentResponse(
            id=doc["id"],
            member_id=doc["member_id"],
            member_code_snapshot=doc.get("member_code_snapshot", ""),
            member_name_snapshot=doc.get("member_name_snapshot", ""),
            membership_id=doc.get("membership_id"),
            amount=doc["amount"],
            currency=doc.get("currency", "INR"),
            payment_date=p_date,
            payment_method=doc["payment_method"],
            reference=doc.get("reference"),
            status=doc.get("status", "completed"),
            record_origin=doc.get("record_origin", "regular"),
            void_reason=doc.get("void_reason"),
            created_by=doc.get("created_by", "admin"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"]
        )

payment_service = PaymentService()
