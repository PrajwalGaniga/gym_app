# Architecture Document: Gym Membership & Fee Management System

## 1. High-Level System Architecture

The Gym Membership & Fee Management System is built as a production-minded web application engineered for gym coaches and administrators. The application operates directly on the host machine without Docker or virtualization layers.

```
+-----------------------------------------------------------------------------------+
|                                Next.js Frontend                                   |
| - App Router, React 19, TypeScript                                                |
| - Pure CSS Modules & CSS Design System (No Tailwind, No Bootstrap)                |
| - Typed API Client with HttpOnly Cookie Authentication                            |
+----------------------------------------+------------------------------------------+
                                         | HTTP / JSON / Cookies / Multipart
                                         v
+-----------------------------------------------------------------------------------+
|                                 FastAPI Backend                                   |
| - REST API Architecture (/api/v1 and /api)                                        |
| - Pydantic v2 Request & Response Validation                                       |
| - Authentication: Bcrypt Password Hashing + JWT Sessions in HttpOnly Cookies      |
| - Service Layer: Calendar-month arithmetic, Status Classification, Renewal logic  |
| - Data Access Layer (Repositories): PyMongo 4.19 AsyncMongoClient                 |
| - Dual Image Storage: Local static disk adapter + Cloudinary integration          |
+----------------------------------------+------------------------------------------+
                                         | TLS Async Connection
                                         v
+-----------------------------------------------------------------------------------+
|                              MongoDB Atlas Cluster                                |
|  Database: gym_management                                                         |
|  Collections: admins, members, memberships, plans, payments, attendance,          |
|               settings, audit_logs                                                |
+-----------------------------------------------------------------------------------+
```

---

## 2. Security & Authentication Architecture

1. **Password Security**: Passwords are encrypted using salted `bcrypt` hashes. Plaintext passwords are never stored or logged.
2. **Session Handling**: Authentication sessions are stored in an `HttpOnly` secure cookie (`gym_session`) with `SameSite=lax`. Access tokens are never stored in browser `localStorage`, preventing XSS credential theft.
3. **Endpoint Authorization**: All operational endpoints (`/members`, `/memberships`, `/payments`, `/attendance`, `/dashboard`, `/reports`, `/settings`, `/imports`) require admin authentication via dependency injection (`get_current_admin`). Unauthenticated access returns HTTP 401.
4. **CORS Restrictions**: Backend restricts incoming origins strictly to configured frontend origins (`http://localhost:3000`).
5. **CSV Formula Injection Prevention**: All exported CSV files sanitize strings beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` by prefixing a single quote `'` (CWE-1236 mitigation).
6. **File Upload Security**: Uploaded profile images are validated using Python Imaging Library (PIL) to inspect magic bytes, verifying authentic JPEG, PNG, or WebP formats up to 5 MB. Filenames are replaced with randomized UUIDs to prevent directory traversal.

---

## 3. Data Access Layer & MongoDB Collections

Database interactions are strictly encapsulated behind a repository layer:
- `admins`: Administrator accounts, roles, hashed passwords, last login timestamps.
- `members`: Permanent member profiles, unique member codes, contact details, normalized phone numbers, photos, joining dates.
- `memberships`: Individual membership periods (start date, inclusive expiry date, plan snapshot, origin, payment link). Historical periods are preserved append-only.
- `plans`: Membership packages (1 month, 3 months, 6 months, 12 months, custom days/months).
- `payments`: Immutable payment ledger (amount, date, method, reference, origin, status: `completed` or `voided`).
- `attendance`: Check-in event records, timestamps, local dates, snapshot of status at check-in.
- `settings`: Gym operational configurations (timezone, currency, code prefix, attendance policies).
- `audit_logs`: Detailed administrative logs for sensitive actions (void payments, legacy migrations, archive actions).
