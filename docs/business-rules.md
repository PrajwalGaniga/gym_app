# Business Rules & Calculations: Gym Membership & Fee Management

## 1. Dynamic Membership Status Classification

Membership status is computed on reads relative to the gym's configured timezone (`Asia/Kolkata` by default) rather than a scheduled cron mutation.

### Operational Categories:
- **Paid**: Members with strictly more than 3 calendar days remaining before expiration.
- **Expiring Soon**: Members with 0, 1, 2, or 3 calendar days remaining before expiration. **The expiry date itself is included in this category**.
- **Expired**: Members whose expiry date is strictly before today's date in the gym's configured timezone.

### Mathematical Formulation:
$$\text{remaining\_days} = \text{expiry\_date} - \text{gym\_local\_today}$$

- $\text{remaining\_days} > 3 \implies \text{paid}$
- $0 \le \text{remaining\_days} \le 3 \implies \text{expiring\_soon}$
- $\text{remaining\_days} < 0 \implies \text{expired}$

The member remains valid through 23:59:59 of their expiry date. They become expired only at the arrival of the next calendar day in the gym's timezone.

---

## 2. Calendar Month Arithmetic & Inclusive Expiry

For month-based plans, durations are added using calendar-month arithmetic rather than static 30-day approximations:
1. **Target Month Clamping**: If target month has fewer days than start day (e.g., Jan 31 + 1 month), the end date clamps to the final day of the target month:
   - `2025-01-31 + 1 month` $\rightarrow$ Ends `2025-02-28` (non-leap year).
   - `2028-01-31 + 1 month` $\rightarrow$ Ends `2028-02-29` (leap year).
   - `2026-03-31 + 1 month` $\rightarrow$ Ends `2026-04-30`.
2. **Cycle Boundaries**: For standard dates, the membership ends on the day before the same day in the target month:
   - `2026-01-15 + 1 month` $\rightarrow$ Ends `2026-02-14` (inclusive).
   - `2026-01-01 + 1 month` $\rightarrow$ Ends `2026-01-31`.

---

## 3. Membership Renewal Rules

Renewals append a new membership period and payment record without mutating historical records:
- **Renewal before expiry**: The new period starts on `current_expiry_date + 1 day`, completely preserving all already-paid time.
- **Renewal on expiry date**: The new period starts on `current_expiry_date + 1 day`.
- **Renewal after expiry**: The new period starts on `payment_date` by default, or an authorized coach custom start date.
- **Idempotency Protection**: Accidental double-clicks submit an idempotency key; if already processed, the duplicate payment is suppressed.

---

## 4. Legacy Member Migration Rules

1. **Member ID Preservation**: Existing IDs (e.g. `OLD-001`, `GYM/2023/12`) are stored verbatim without reformatting or automated prefix replacement.
2. **No Fake Revenue**: If a legacy member has an existing expiry date without payment records, the validity is established with `record_origin="legacy"` and an audit log without creating phantom payments or inflating financial revenue.
3. **Unknown Joining Dates**: Supported natively with `joining_date_known=False`.

---

## 5. Attendance & Check-In Rules

1. **Duplicate Check-in Suppression**: Check-ins within `duplicate_checkin_window_minutes` (default 2 minutes) are blocked to prevent accidental double-scans.
2. **Expired Member Policy**:
   - `warn` (default): Warns coach prominently that membership is expired, but allows recording check-in.
   - `block`: Denies entry unless the coach explicitly authorizes an override.
