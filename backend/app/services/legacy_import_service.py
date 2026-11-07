import csv
import io
from typing import List, Dict, Any, Tuple
from datetime import datetime, date
from app.repositories.member_repo import member_repo
from app.repositories.membership_repo import membership_repo
from app.repositories.payment_repo import payment_repo
from app.repositories.settings_repo import settings_repo
from app.repositories.audit_repo import audit_repo
from app.utils.phone import validate_phone
from app.schemas.legacy_import import (
    LegacyImportRow,
    LegacyImportPreviewRow,
    LegacyImportPreviewResponse,
    LegacyImportResultResponse
)

class LegacyImportService:
    def get_template_csv(self) -> str:
        output = io.StringIO()
        fieldnames = [
            "member_code",
            "full_name",
            "phone",
            "joining_date",
            "expiry_date",
            "payment_amount",
            "payment_date",
            "payment_method",
            "notes"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerow({
            "member_code": "OLD-001",
            "full_name": "Rohan Sharma",
            "phone": "+919876543210",
            "joining_date": "2025-01-10",
            "expiry_date": "2026-05-15",
            "payment_amount": "5000",
            "payment_date": "2026-01-15",
            "payment_method": "UPI",
            "notes": "Annual member migrated from legacy register"
        })
        writer.writerow({
            "member_code": "OLD-002",
            "full_name": "Priya Patel",
            "phone": "9823456789",
            "joining_date": "",
            "expiry_date": "2026-04-01",
            "payment_amount": "",
            "payment_date": "",
            "payment_method": "",
            "notes": "Joining date unknown, expiry from card"
        })
        return output.getvalue()

    async def preview_csv(self, csv_content: str) -> LegacyImportPreviewResponse:
        f = io.StringIO(csv_content)
        reader = csv.DictReader(f)

        preview_rows: List[LegacyImportPreviewRow] = []
        seen_codes: Dict[str, int] = {}
        duplicate_codes_in_file = set()

        total = 0
        valid_count = 0
        invalid_count = 0

        for idx, row in enumerate(reader, start=2):  # Line 2 is first data row
            total += 1
            code = (row.get("member_code") or "").strip()
            name = (row.get("full_name") or "").strip()
            phone = (row.get("phone") or "").strip()
            joining_str = (row.get("joining_date") or "").strip()
            expiry_str = (row.get("expiry_date") or "").strip()
            amt_str = (row.get("payment_amount") or "").strip()
            p_date_str = (row.get("payment_date") or "").strip()
            p_method = (row.get("payment_method") or "").strip()
            notes = (row.get("notes") or "").strip()

            errors: List[str] = []

            # 1. Member code validation
            if not code:
                errors.append("Member ID is required.")
            else:
                if code.lower() in seen_codes:
                    errors.append(f"Duplicate Member ID '{code}' found in CSV (row {seen_codes[code.lower()]}).")
                    duplicate_codes_in_file.add(code)
                seen_codes[code.lower()] = idx

                # Check existing in database
                existing = await member_repo.get_by_code(code)
                if existing:
                    errors.append(f"Member ID '{code}' already exists in the database.")
                    duplicate_codes_in_file.add(code)

            # 2. Full name
            if not name or len(name) < 2:
                errors.append("Full name must be at least 2 characters.")

            # 3. Phone validation
            if not phone:
                errors.append("Phone number is required.")
            elif not validate_phone(phone):
                errors.append(f"Invalid phone number '{phone}'.")

            # 4. Dates
            joining_d = None
            if joining_str:
                try:
                    joining_d = datetime.strptime(joining_str, "%Y-%m-%d").date()
                except Exception:
                    errors.append(f"Invalid joining date format '{joining_str}'. Use YYYY-MM-DD.")

            expiry_d = None
            if expiry_str:
                try:
                    expiry_d = datetime.strptime(expiry_str, "%Y-%m-%d").date()
                except Exception:
                    errors.append(f"Invalid expiry date format '{expiry_str}'. Use YYYY-MM-DD.")

            # 5. Payment details
            amt_val = None
            if amt_str:
                try:
                    amt_val = float(amt_str)
                    if amt_val < 0:
                        errors.append("Payment amount cannot be negative.")
                except Exception:
                    errors.append(f"Invalid payment amount '{amt_str}'.")

            p_date_val = None
            if p_date_str:
                try:
                    p_date_val = datetime.strptime(p_date_str, "%Y-%m-%d").date()
                except Exception:
                    errors.append(f"Invalid payment date format '{p_date_str}'. Use YYYY-MM-DD.")

            if (amt_val is not None or p_date_val is not None or p_method) and not (amt_val is not None and p_date_val and p_method):
                errors.append("When providing payment details, amount, payment date, and method must all be present.")

            if p_method and p_method not in ("Cash", "UPI", "Card", "Bank Transfer", "Other"):
                errors.append(f"Invalid payment method '{p_method}'. Allowed: Cash, UPI, Card, Bank Transfer, Other.")

            is_valid = len(errors) == 0
            if is_valid:
                valid_count += 1
            else:
                invalid_count += 1

            preview_rows.append(LegacyImportPreviewRow(
                row_number=idx,
                member_code=code,
                full_name=name,
                phone=phone,
                joining_date=joining_d,
                expiry_date=expiry_d,
                payment_amount=amt_val,
                payment_date=p_date_val,
                payment_method=p_method or None,
                notes=notes or None,
                is_valid=is_valid,
                errors=errors
            ))

        return LegacyImportPreviewResponse(
            total_rows=total,
            valid_rows=valid_count,
            invalid_rows=invalid_count,
            duplicate_codes=list(duplicate_codes_in_file),
            rows=preview_rows
        )

    async def commit_import(self, rows: List[LegacyImportRow], admin_id: str) -> LegacyImportResultResponse:
        settings = await settings_repo.get_settings()
        imported = 0
        skipped = 0
        errors: List[str] = []

        for row in rows:
            code = row.member_code.strip()
            existing = await member_repo.get_by_code(code)
            if existing:
                skipped += 1
                errors.append(f"Skipped {code}: already exists in database.")
                continue

            joining_iso = row.joining_date.strftime("%Y-%m-%d") if row.joining_date else None
            # 1. Create Member
            member_doc = await member_repo.create_member({
                "member_code": code,
                "full_name": row.full_name.strip(),
                "phone": row.phone.strip(),
                "joining_date": joining_iso,
                "joining_date_known": (row.joining_date is not None),
                "notes": row.notes or "Bulk Legacy Import"
            })
            mid = member_doc["id"]

            # 2. If expiry date exists, create legacy membership period
            membership_id = None
            if row.expiry_date:
                m_doc = await membership_repo.create_membership({
                    "member_id": mid,
                    "plan_id": "legacy_csv_plan",
                    "plan_name_snapshot": "Migrated Plan",
                    "start_date": row.joining_date or date.today(),
                    "expiry_date": row.expiry_date,
                    "record_origin": "legacy",
                    "created_by": admin_id
                })
                membership_id = m_doc["id"]

            # 3. If genuine payment details provided, append payment
            if row.payment_amount is not None and row.payment_date and row.payment_method:
                await payment_repo.create_payment({
                    "member_id": mid,
                    "member_code_snapshot": code,
                    "member_name_snapshot": row.full_name,
                    "membership_id": membership_id,
                    "amount": row.payment_amount,
                    "currency": settings.get("currency", "INR"),
                    "payment_date": row.payment_date,
                    "payment_method": row.payment_method,
                    "notes": f"Legacy Payment: {row.notes or ''}".strip(),
                    "record_origin": "legacy",
                    "created_by": admin_id
                })

            imported += 1

        # Audit log the bulk import
        await audit_repo.log_action(
            admin_id=admin_id,
            action="legacy_bulk_imported",
            entity_type="members",
            entity_id=f"batch_{len(rows)}",
            after={"imported_count": imported, "skipped_count": skipped}
        )

        return LegacyImportResultResponse(
            imported_count=imported,
            skipped_count=skipped,
            errors=errors
        )

legacy_import_service = LegacyImportService()

