# API Contract: Gym Membership & Fee Management System

All API endpoints are accessible under `/api/v1` (and mirrored under `/api` for convenience).

## Authentication
- `POST /auth/login`: Authenticate admin with username & password. Sets HttpOnly cookie `gym_session`.
- `POST /auth/logout`: Clears HttpOnly cookie.
- `GET /auth/me`: Returns current logged-in admin details.

## Dashboard
- `GET /dashboard/summary`: Summary metrics (total, paid, expiring soon, expired, new joins this month, collections this month, attendance count, upcoming renewals, recent payments, expired check-ins today, revenue timeline).

## Members
- `POST /members`: Register new member with initial plan and payment.
- `POST /members/legacy`: Register existing/legacy member preserving existing ID without fake payments.
- `GET /members`: Paginated member directory with filters (`category=paid|expiring_soon|expired`, `search`, `archived`).
- `GET /members/search`: Fast autocomplete search across ID, full name, and phone.
- `GET /members/{member_id}`: Member details, current membership status, and profile.
- `PUT /members/{member_id}`: Update member personal information.
- `POST /members/{member_id}/archive`: Soft-archive member (preserves all payments).
- `POST /members/{member_id}/restore`: Restore member to active directories.
- `POST /members/{member_id}/photo`: Upload and optimize member profile photo (JPEG, PNG, WebP up to 5MB).
- `DELETE /members/{member_id}/photo`: Remove member photo.
- `GET /members/{member_id}/payments`: Payment history for specific member.
- `GET /members/{member_id}/attendance`: Attendance history for specific member.

## Memberships & Renewals
- `GET /memberships/preview-renewal`: Preview start and expiry dates for a proposed renewal.
- `POST /memberships/{member_id}/renew`: Execute renewal with idempotency key, start calculation, and append payment.
- `POST /memberships/{member_id}/migrate-expiry`: Manually adjust expiry date with mandatory audit reason (zero revenue impact).
- `GET /memberships/{member_id}/history`: All membership periods for this member.

## Payments
- `POST /payments`: Record manual payment.
- `GET /payments`: Paginated payment transactions with filters (`status`, `payment_method`, `start_date`, `end_date`, `search`).
- `POST /payments/{payment_id}/void`: Void a payment with mandatory audit reason.
- `GET /payments/export`: Export filtered payments to CSV with formula injection prevention.

## Attendance
- `POST /attendance/check-in`: Record member check-in with duplicate window suppression and expired alert.
- `GET /attendance/today`: List today's check-in activity.

## Plans
- `GET /plans`: List active membership plans.
- `POST /plans`: Create new plan package.
- `PATCH /plans/{plan_id}`: Edit plan price, description, or active status.

## Reports & Analytics
- `GET /reports/collections`: Collections report with gross collected, voided, net revenue, and method breakdown.
- `GET /reports/members`: Membership growth and retention summary.
- `GET /reports/attendance`: Attendance summary and unique attendee count.
- `GET /reports/attendance/export`: Export attendance logs to CSV.

## Settings
- `GET /settings`: Get gym configuration.
- `PUT /settings`: Update gym name, timezone, currency, calling code, prefix, attendance policy.

## Legacy Imports
- `GET /imports/template`: Download standard CSV import template.
- `POST /imports/preview`: Upload CSV file to receive field validation, error reports, and duplicate detection.
- `POST /imports/commit`: Commit validated legacy members into MongoDB Atlas.

