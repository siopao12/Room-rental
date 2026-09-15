# Comprehensive System Walkthrough & Feature Reference

This document summarizes all recent updates, security implementations, database schema alignment fixes, and UI bug resolution across **RentEase**.

---

## 🔒 1. Client-Side AES-256 Field-Level Encryption & Security Audit Logs

### Core Security Module ([encryptionHelper.js](file:///c:/xampp/htdocs/rental-system/src/lib/encryptionHelper.js))
- **`encryptData(text)`**: Encrypts sensitive string values with AES-256 and prefixes them with `ENC:`.
- **`decryptData(text)`**: Decrypts `ENC:...` ciphertext back to plain text. Gracefully handles legacy unencrypted database rows.
- **`encryptObject(obj, keys)` & `decryptObject(obj, keys)`**: Batch helpers for mapping over API rows and state objects.

### Encrypted Data Fields Table
| Table | Encrypted Fields | Operational / Public Fields |
| :--- | :--- | :--- |
| `users` | `phone`, `emergency_contact` | `id`, `auth_id`, `name`, `email`, `role_id`, `is_active` |
| `payments` | `reference_number`, `notes`, `rejection_reason` | `id`, `amount`, `status`, `payment_date`, `method` |
| `payment_settings` | `gcash_number`, `gcash_name`, `bank_account_number`, `bank_account_name` | `id`, `landlord_id`, `gcash_enabled`, `bank_enabled`, `qr_code_url` |
| `rental_applications` | `emergency_contact_name`, `emergency_contact_phone`, `message`, `notes` | `id`, `user_id`, `room_id`, `status`, `move_in_date` |
| `audit_logs` | `ip_address`, `description` | `id`, `user_id`, `action`, `created_at` |
| `notifications` | `message` | `id`, `user_id`, `title`, `is_read` |

---

## 🛠️ 2. Key System Fixes & Component Refactoring

### A. Authentication, Email Verification & Modal Responsiveness
1. **Email Confirmation Link Flow ([App.jsx](file:///c:/xampp/htdocs/rental-system/src/App.jsx) & [AuthModal.jsx](file:///c:/xampp/htdocs/rental-system/src/components/AuthModal.jsx))**:
   - Prevented auto-login when clicking the Gmail email verification link; users are signed out and prompted to log in manually.
   - Updated success message upon registration: *"Account registered successfully! Please check your email to verify your account before logging in."*
2. **Modal Height Overflow & Scrollability ([index.css](file:///c:/xampp/htdocs/rental-system/src/index.css))**:
   - Constrained modal dialogs to `max-height: calc(100vh - 48px)` with `overflow-y: auto`, ensuring creation/registration form submit buttons are accessible on all screens.

---

### B. Landlord Application & Payment Verification (400 Bad Request Resolution)
1. **Application Approval Schema Fix ([ApplicationsSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/landlord/sections/ApplicationsSection.jsx))**:
   - Removed non-existent database columns (`reviewed_by`, `reviewed_at`, `application_id`, `monthly_rent`) from approval payloads.
2. **Payment Verification & Approval Fix ([PaymentsSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/landlord/sections/PaymentsSection.jsx))**:
   - Removed non-existent columns (`amount_paid`, `amount_due`, `next_due_date`).
   - Updated payment approval to set `bills.status = 'Paid'` and automatically create the next month's bill using valid columns (`amount`, `due_date`, `status`, `user_id`, `rental_id`, `billing_month`).

---

### C. Boarder Portal Billing, Due Dates & Payment History Refactoring
1. **Monthly Rent Display Fix (`₱NaN`)**:
   - Fixed `₱NaN` in Overview, My Rental, My Room, and My Bills by deriving room prices directly from `rooms.price`.
2. **Boarder Payment Submission Fix ([BoarderMyBillsSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/sections/BoarderMyBillsSection.jsx))**:
   - Replaced non-existent `submitted_by` column with valid `user_id` column.
3. **Next Due Date Dynamic Calculation ([BoarderDashboard.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/BoarderDashboard.jsx))**:
   - Refactored `next_due_date` calculation to fetch the earliest `Unpaid` bill's due date. When a payment is verified, the boarder's Next Due Date automatically updates to the upcoming billing cycle (e.g., Nov 5, 2026).
4. **Amount Paid & Balance Display Fix ([BoarderMyBillsSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/sections/BoarderMyBillsSection.jsx) & [BoarderOverviewSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/sections/BoarderOverviewSection.jsx))**:
   - Fixed paid bills showing `Amount Paid: ₱0` and `Balance: ₱4,000`. Derived `Amount Paid` as `bill.amount` when `status === 'Paid'` and `Balance` as `₱0`.
5. **Decrypted Reference Numbers ([BoarderPaymentHistorySection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/sections/BoarderPaymentHistorySection.jsx))**:
   - Added AES-256 decryption so reference numbers display as plain text (e.g., `102399312093`) instead of `ENC:...`.

---

### D. Admin Data Export Schema Alignment ([DataExportSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/admin/sections/DataExportSection.jsx))
- Aligned SQL queries and CSV transforms for `rentals`, `bills`, `payments`, and `applications` to strictly match active Supabase database schema columns.

---

## 🔬 3. Build Verification
- Command: `npm run build`
- Result: **Passed with 0 errors** (`✓ 1690 modules transformed`).


# Comprehensive System Walkthrough & Feature Reference

This document provides an exhaustive, up-to-date summary of all security implementations, database schema alignment fixes, UI bug resolutions, and refactorings across **RentEase**.

---

## 🔒 1. Client-Side AES-256 Field-Level Data Encryption

### Core Security Module ([encryptionHelper.js](file:///c:/xampp/htdocs/rental-system/src/lib/encryptionHelper.js))
- **`encryptData(text)`**: Encrypts sensitive string values with AES-256 and prefixes them with `ENC:`.
- **`decryptData(text)`**: Decrypts `ENC:...` ciphertext back to plain text. Gracefully handles legacy unencrypted database rows.
- **`encryptObject(obj, keys)` & `decryptObject(obj, keys)`**: Batch helpers for mapping over API rows and state objects.

### Encrypted Data Fields Table
| Table | Encrypted Fields | Operational / Public Fields |
| :--- | :--- | :--- |
| `users` | `phone`, `emergency_contact` | `id`, `auth_id`, `name`, `email`, `role_id`, `is_active` |
| `payments` | `reference_number`, `notes`, `rejection_reason` | `id`, `amount`, `status`, `payment_date`, `method` |
| `payment_settings` | `gcash_number`, `gcash_name`, `bank_account_number`, `bank_account_name` | `id`, `landlord_id`, `gcash_enabled`, `bank_enabled`, `qr_code_url` |
| `rental_applications` | `emergency_contact_name`, `emergency_contact_phone`, `message`, `notes` | `id`, `user_id`, `room_id`, `status`, `move_in_date` |
| `audit_logs` | `ip_address`, `description` | `id`, `user_id`, `action`, `created_at` |
| `notifications` | `message` | `id`, `user_id`, `title`, `is_read` |

---

## 🛠️ 2. Key System Fixes & Component Refactoring

### A. Authentication, Email Verification & Modal Responsiveness
1. **Email Confirmation Link Flow ([App.jsx](file:///c:/xampp/htdocs/rental-system/src/App.jsx) & [AuthModal.jsx](file:///c:/xampp/htdocs/rental-system/src/components/AuthModal.jsx))**:
   - Prevented auto-login when clicking the Gmail email verification link; users are signed out and prompted to log in manually.
   - Updated success message upon registration: *"Account registered successfully! Please check your email to verify your account before logging in."*
2. **Modal Height Overflow & Scrollability ([index.css](file:///c:/xampp/htdocs/rental-system/src/index.css))**:
   - Constrained modal dialogs to `max-height: calc(100vh - 48px)` with `overflow-y: auto`, ensuring creation/registration form submit buttons are accessible on all screens.

---

### B. Landlord Application & Payment Verification (400 Bad Request Resolution)
1. **Application Approval Schema Fix ([ApplicationsSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/landlord/sections/ApplicationsSection.jsx))**:
   - Removed non-existent database columns (`reviewed_by`, `reviewed_at`, `application_id`, `monthly_rent`) from approval payloads.
2. **Payment Verification & Approval Fix ([PaymentsSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/landlord/sections/PaymentsSection.jsx))**:
   - Removed non-existent columns (`amount_paid`, `amount_due`, `next_due_date`).
   - Updated payment approval to set `bills.status = 'Paid'` and automatically create the next month's bill using valid columns (`amount`, `due_date`, `status`, `user_id`, `rental_id`, `billing_month`).

---

### C. Boarder Portal Billing, Due Dates, Payment History & Input Validation
1. **Monthly Rent Display Fix (`₱NaN`)**:
   - Fixed `₱NaN` in Overview, My Rental, My Room, and My Bills by deriving room prices directly from `rooms.price`.
2. **Boarder Payment Submission Fix ([BoarderMyBillsSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/sections/BoarderMyBillsSection.jsx))**:
   - Replaced non-existent `submitted_by` column with valid `user_id` column.
3. **Next Due Date Dynamic Calculation ([BoarderDashboard.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/BoarderDashboard.jsx))**:
   - Refactored `next_due_date` calculation to fetch the earliest `Unpaid` bill's due date. When a payment is verified, the boarder's Next Due Date automatically updates to the upcoming billing cycle (e.g., Nov 5, 2026).
4. **Amount Paid & Balance Display Fix ([BoarderMyBillsSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/sections/BoarderMyBillsSection.jsx) & [BoarderOverviewSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/sections/BoarderOverviewSection.jsx))**:
   - Fixed paid bills showing `Amount Paid: ₱0` and `Balance: ₱4,000`. Derived `Amount Paid` as `bill.amount` when `status === 'Paid'` and `Balance` as `₱0`.
5. **Decrypted Reference Numbers ([BoarderPaymentHistorySection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/sections/BoarderPaymentHistorySection.jsx))**:
   - Added AES-256 decryption so reference numbers display as plain text (e.g., `102399312093`) instead of `ENC:...`.
6. **13-Digit Reference Number Validation ([BoarderMyBillsSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/sections/BoarderMyBillsSection.jsx))**:
   - Restricted reference number input to numeric digits (`0-9`) up to max 13 digits (`maxLength={13}`).
   - Added a live character counter (`0/13` up to `13/13`) and red border warning hint.
   - Enforced strict validation on form submission blocking non-13 digit submissions.
7. **Room Floor & Size Reflection ([BoarderMyRoomSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/boarder/sections/BoarderMyRoomSection.jsx) & [RoomDetailsModal.jsx](file:///c:/xampp/htdocs/rental-system/src/components/RoomDetailsModal.jsx))**:
   - Mapped `room.floor_number` and `room.size_sqm` so landlord edits to room size and floor reflect immediately on the Boarder's **My Room** page.

---

### D. Full System Backup & Data Recovery Engine ([DataExportSection.jsx](file:///c:/xampp/htdocs/rental-system/src/pages/admin/sections/DataExportSection.jsx))
1. **Intelligent Record Diffing**:
   - Compares backup JSON IDs against active Supabase table IDs, skipping existing records and restoring **only deleted/missing records**.
   - Eliminates duplicate payment records and resolves PostgreSQL `400 Bad Request` / `23505 Duplicate Key` console errors.
2. **PostgreSQL Identity Column Overriding**:
   - Strips primary key `id` attributes during REST re-insertion so PostgreSQL identity sequences generate keys smoothly without `428C9` identity errors.
   - Added `OVERRIDING SYSTEM VALUE` to generated `.sql` disaster recovery scripts.
3. **Data Export Schema Alignment**:
   - Aligned SQL queries and CSV transforms for `rentals`, `bills`, `payments`, and `applications` to match active database columns.

---

## 🔬 3. Build Verification
- Command: `npm run build`
- Result: **Passed with 0 errors** (`✓ 1690 modules transformed`).
