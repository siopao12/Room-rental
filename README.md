#  RoomEase — Modern Boarding House & Rental Management System

RoomEase (formerly RentEase) is a comprehensive, full-stack rental management web application built with **React**, **Vite**, and **Supabase (PostgreSQL)**. It features **Client-Side AES-256 Field-Level Data Encryption**, automated monthly billing, digital payment proof verification, real-time notifications, and full disaster recovery engines.

---

##  Key Features & Role-Based Portals

### 1. Boarder Portal
- **Dashboard & Room Details**: View assigned room specs, monthly rent, floor number, room size ($\text{m}^2$), and listed amenities.
- **Dynamic Due Date & Bills**: Track current and upcoming bills with automatic due date calculations.
- **Digital Payment Submissions**: Submit payment receipts via **GCash**, **Maya**, **Bank Transfer**, or **Cash** with reference number validation (13 digits) and screenshot upload.
- **Payment History**: View past verified/paid transactions with decrypted reference numbers and instant status indicators.
- **In-App Notifications**: Real-time alerts for application approvals, payment verifications, and new bill releases.

### 2. Landlord Portal
- **Room & Inventory Management**: Add, edit, and toggle availability for rooms, set capacity, pricing, floor numbers, room size, and amenities.
- **Applicant Review & Verification**: Approve or reject rental applications with applicant profile insights and status management.
- **Payment Verification & Bill Rollover**: 1-Click payment proof approval, automatically clearing current bills and generating the upcoming month's billing cycle.
- **Payment Setup**: Configure landlord payment accounts (GCash, Maya, BDO/BPI Bank) and upload QR code receipts.
- **Broadcast Announcements**: Send property-wide notices with priority levels (Important, General, Maintenance).

###  3. Admin Portal & Disaster Recovery
- **User & RBAC Management**: Control system user accounts, assign roles (Admin, Landlord, Boarder), and toggle user active states.
- **Security Audit Trails**: Track login activity, system setting modifications, and user actions with client IP address logging.
- **Full Database Backup Archives**: Generate and download complete timestamped `.json` database snapshots.
- **Disaster Recovery Engine**: Upload backup `.json` archives to perform intelligent record diffing (restoring missing records without duplicates) or generate stand-alone `.sql` recovery scripts.
- **Data Export Center**: Export clean tabular data across all major tables to CSV.

---

##  Security Architecture: Client-Side AES-256 Data Encryption

To guarantee data confidentiality at rest, RoomEase uses **Client-Side AES-256 Field-Level Encryption** (`crypto-js`). Sensitive PII and financial details are encrypted in the browser **before** transmission to Supabase. Anyone inspecting raw database tables or exporting raw database dumps will only see encrypted ciphertext (`ENC:...`).

### Encrypted Data Summary
| Table | Encrypted Fields | Operational Fields |
| :--- | :--- | :--- |
| `users` | `phone`, `emergency_contact` | `id`, `auth_id`, `name`, `email`, `role_id` |
| `payments` | `reference_number`, `notes`, `rejection_reason` | `id`, `amount`, `status`, `payment_date`, `method` |
| `payment_settings` | `gcash_number`, `gcash_name`, `bank_account_number`, `bank_account_name` | `id`, `landlord_id`, `gcash_enabled`, `bank_enabled` |
| `rental_applications` | `emergency_contact_name`, `emergency_contact_phone`, `message`, `notes` | `id`, `user_id`, `room_id`, `status`, `move_in_date` |
| `audit_logs` | `ip_address`, `description` | `id`, `user_id`, `action`, `created_at` |
| `notifications` | `message` | `id`, `user_id`, `title`, `is_read` |

---

## Tech Stack

- **Frontend**: React 18, Vite, Vanilla CSS Design System, Lucide React Icons
- **Backend & Database**: Supabase (PostgreSQL), Supabase Auth, Supabase Storage
- **Cryptography**: AES-256 via `crypto-js`
- **Build Tool**: Vite v6

---

##  Project Directory Structure

```text
rental-system/
├── public/                     # Static public assets
├── src/
│   ├── assets/                 # App images and CSS tokens
│   ├── components/             # Reusable UI Modals, Headers, and Guards
│   │   ├── AuthModal.jsx       # Login, Signup, and Password Reset Modal
│   │   ├── Navbar.jsx          # Public & Main Application Navbar
│   │   ├── NotificationBell.jsx# Real-time Header Notification Dropdown
│   │   ├── RoomDetailsModal.jsx# Public & Boarder Room Specification Modal
│   │   └── ProtectedRoute.jsx  # RBAC Role-Based Guard Wrapper
│   ├── hooks/                  # Custom React Hooks (e.g., useNotifications)
│   ├── lib/                    # Core Helpers & API Utilities
│   │   ├── encryptionHelper.js # Client-Side AES-256 Encryption & Decryption
│   │   ├── notifyHelper.js     # Notification Dispatcher
│   │   ├── errorHandler.js     # Sanitized Error Handling & Logging
│   │   ├── authActivityHelper.js# Login Activity & IP Audit Tracking
│   │   └── supabaseClient.js   # Supabase Client Initialization
│   ├── pages/                  # Portal Layouts & Section Components
│   │   ├── admin/              # Admin Portal Sections (Backup, Audit, Users)
│   │   ├── boarder/            # Boarder Portal Sections (Overview, Bills, Room)
│   │   ├── landlord/           # Landlord Portal Sections (Rooms, Applications, Payments)
│   │   └── LandingPage.jsx     # Landing Page & Public Property Listings
│   ├── App.jsx                 # Main Application Router & Profile Provider
│   ├── main.jsx                # React Entry Point
│   └── index.css               # Global Design System Styles
├── .env                        # Environment Configuration (Supabase & Secret Key)
├── package.json                # Project Dependencies & Scripts
├── vite.config.js              # Vite Compiler Configuration
└── README.md                   # Project Documentation
```

---

##  Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### 1. Clone the Repository
```bash
git clone https://github.com/siopao12/Room-rental.git
cd Room-rental
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ENCRYPTION_KEY=your-aes256-secret-passphrase
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for Production
```bash
npm run build
```