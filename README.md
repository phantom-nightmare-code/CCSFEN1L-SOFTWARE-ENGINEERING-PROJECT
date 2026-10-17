# CCSFEN1L-SOFTWARE-ENGINEERING-PROJECT

> Project Repository for CCSFEN1L (Software Engineering)
>
> **NAME OF PROJECT: FitForge (Gym + Exercise Website)**

---

# FitForge 💪

> **Your move, your progress.**

FitForge is a full-stack gym management and workout tracking platform that brings together workout logging, routine building, analytics, membership management, equipment rentals, and personal coaching into a single, modern web application.

**🔗 Live Demo:** (https://fitforge-gym-and-track.pages.dev/)

[![Live Demo](https://img.shields.io/badge/Live_Demo-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://fitforge-gym-and-track.netlify.app)
[![Backend API](https://img.shields.io/badge/Backend_API-4A90E2?style=for-the-badge&logo=render&logoColor=white)](https://fitforge-backend-wey2.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)

---

## 🎨 The Logo

<p align="center">
  <img src="https://github.com/user-attachments/assets/80525ab6-58b5-4248-a652-662bc1863d85" width="400" alt="FitForge Logo"/>
</p>

<p align="center"><i>"Your move, your progress."</i></p>

---

## 📖 About

FitForge is a gym companion built for people who take their training seriously. Most fitness apps do one thing well — but FitForge brings every part of your fitness journey into a single platform: from the moment you walk in the door, through every rep and set, to the analytics that tell you what's working.

Whether you're a first-timer or a seasoned lifter, FitForge gives you the tools to **plan, track, and improve** every single session. Our name says it all — *forge* yourself, one workout at a time.

---

## ✨ Key Features

### 🔐 Authentication & Accounts
- Register and login with email + password
- Password hashing with bcrypt (10 rounds)
- JWT sessions with 7-day expiry
- Three roles: **user, coach, admin**
- Profile editing (name, username, birthday)
- Automatic age calculation from birthday
- Birthday validation — blocks future dates and under-13 users
- Auto-logout on token expiry

### 🏋️ Workout Tracking
- Log workouts with name, date, notes, and unlimited sets
- Each set records exercise, weight, and reps
- Automatic **personal record detection** using the Epley 1RM formula
- Toast notification when new PRs are broken
- Expandable workout history
- Cascade deletion of all sets

### 📋 Routine Builder
- Create routines with name, description, and multiple exercises
- Target sets, reps, and order per exercise
- One-click launch to pre-fill the workout form
- Delete with cascade removal

### 📊 Analytics Dashboard
- Volume over time (line chart)
- Muscle balance (pie chart by muscle group)
- Personal records table
- Range selector: 7 / 30 / 90 / 365 days

### 🎯 Exercise Library
- 43 seeded exercises across 6 muscle groups
- Filter by muscle group and equipment type
- Search by name
- Admin CRUD with reference-integrity checks

### 💳 Membership System
- Three plans: **Walk-in (₱100), Monthly (₱1,200), Yearly (₱12,000)**
- Auto-cancel previous active membership on new subscription
- Expiry tracking with color-coded countdown (green / orange / red)
- Active membership banner on the Profile page
- Status transitions: **Pending / Active / Cancelled / Cancelled + Refund**
- Membership stays `pending` until payment is verified
- Automatic refund on admin cancellation

### 💸 Payment Processing
- Five methods: **Cash, GCash, Maya, Bank Transfer, Card**
- Purchases remain pending until an admin verifies that payment was received; the app does not currently process card payments automatically
- **QR verification flow** for all payment methods:
  - Payment created with `pending` status
  - QR code encodes a verification URL
  - Email sent with the QR code
  - User scans, confirms, admin verifies
  - Result email sent to user
- Receipts emailed and viewable from Profile, Membership, Rentals, and Admin
- Send QR copy to up to 5 additional emails
- Resend from QR modal, Profile, or Admin
- Optional auto-CC to admin billing address
- Pending payments queue in admin panel
- Non-blocking email sending — API responds instantly

### 🏋️ Equipment Rentals
- 8 seeded rental items with hourly pricing
- Live stock tracking — decremented on reserve, restored on return
- Status flow: **Reserved → Confirmed → Hold → Active → Returned**
- Rentals stay `reserved` until payment is verified
- Admin CRUD for inventory with safety rules
- Automatic receipts

### 🎯 Personal Coaching
- Coach role with dedicated dashboard
- Admin assigns clients to coaches
- Coach views client workout history, PRs, and membership status
- Send detailed feedback with optional star rating and workout attachment
- Client "My Coach" page with unread badges
- Mark as read (individual or bulk)

### 🛡️ Admin Dashboard (13 Tabs)
| Tab | Purpose |
|---|---|
| **PROFILE** | Admin card + grid of all users |
| **STATS** | User counts, login chart, revenue analytics |
| **USERS** | Full user table with **role dropdown** and **Remove** button |
| **ACCOUNT ACTIVITY** | Recent presence, offline duration, latest login/logout, and deletion-request action for accounts offline over 7 days |
| **DELETIONS** | Scheduled account deletions and revocation deadlines |
| **ACTIVITY** | MongoDB activity feed |
| **AUDIT LOG** | Every admin action recorded with reason |
| **PAYMENTS** | All payments with KPIs and receipts |
| **PENDING** | Verification queue with Resend / Verify / Reject |
| **TRANSACTIONS** | Memberships + rentals with status control |
| **COACHES** | Assign coaches, promote users |
| **INVENTORY** | Full CRUD for rental items |
| **EXERCISES** | Full CRUD for the exercise library |

### 📜 Admin Audit Log
- Every admin action is automatically recorded
- Tracks role changes, payment verifications, status changes, CRUD operations, and user removals
- Records: admin identity, action, target, full details, reason, IP, user agent, timestamp
- Filterable from the Admin → AUDIT LOG tab

### 👤 User Management
- Change any user's role via dropdown: **User / Coach / Admin**
- Remove users with a mandatory reason
- Review online/offline presence in **ACCOUNT ACTIVITY**; accounts offline for more than 7 days can be scheduled for deletion
- Scheduled deletion emails give users 7 days to revoke the request; accounts are not deleted automatically based on inactivity
- Online status uses authenticated browser heartbeats while the app tab is visible; status changes to offline after 2 minutes without a heartbeat
- The recent-presence list is sorted newest first; offline times under 24 hours display as “Less than 1 day”
- Latest account action shows only “Logged in” or “Logged out”
- Existing accounts show unknown presence until their browser reports its first heartbeat; earlier login history is not treated as proof of current presence
- Safety rules:
  - Cannot remove yourself
  - Cannot remove other admins
  - Cannot remove coaches with active clients
  - Reason must be 5+ characters

### 🌗 User Interface
- Dark/light mode toggle
- Fully responsive layout
- Toast notifications for all actions
- Loading and empty states
- Modal components for QR, receipts, user details, and confirmations
- Color-coded status pills
- Sticky role-aware navbar
- Custom FitForge logo

### 🗄️ Backend Systems
- **Hybrid database architecture** — MySQL for relational data, MongoDB for logs and payments
- Transactional inserts for workouts, rentals, and memberships
- Foreign key cascades for clean deletion
- Activity logging + admin audit logging services
- Daily metrics rollup for fast dashboards
- Email service with HTML templates and QR embedding
- PR detection service (Epley 1RM)
- Recommendation service for neglected muscle groups
- Centralized error handling
- CORS whitelist for production

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express |
| **Frontend** | React 18, React Router, Recharts, Vite |
| **Styling** | Tailwind CSS v4 |
| **Primary Database** | MySQL 8 (Aiven Cloud) |
| **Secondary Database** | MongoDB Atlas |
| **Authentication** | JWT, bcrypt |
| **Email** | Nodemailer, Gmail SMTP |
| **QR Codes** | `qrcode` npm library |
| **Deployment** | Netlify (frontend), Render (backend) |

---

## 📁 Folder Structure

```text
FitForge/
├── .env                       # Environment variables (not committed)
├── .env.example               # Template for .env
├── .gitignore
├── package.json               # Backend dependencies & scripts
├── server.js                  # Express entry point
│
├── db/
│   ├── mysql.js               # MySQL connection pool
│   ├── mongo.js               # MongoDB connection (Mongoose)
│   └── migrations/            # SQL schema migration files
│
├── middleware/
│   └── auth.js                # JWT verification middleware
│
├── models/
│   └── mongo/                 # Mongoose schemas
│       ├── ActivityLog.js
│       ├── PaymentLog.js
│       └── AdminMetric.js
│
├── services/
│   ├── activityLogger.js      # Logs user actions to MongoDB
│   ├── auditLogger.js         # Logs admin actions to MySQL
│   ├── prDetection.js         # Epley 1RM + PR updates
│   ├── recommendation.js      # Recommends exercises for neglected muscles
│   └── mailer.js              # Gmail SMTP email sending
│
├── routes/                    # All API endpoints
│   ├── auth.js
│   ├── admin.js
│   ├── coaches.js
│   ├── myCoach.js
│   ├── memberships.js
│   ├── payments.js
│   ├── rentals.js
│   ├── recommendations.js
│   ├── routines.js
│   ├── workouts.js
│   ├── analytics.js
│   └── exercises.js
│
└── client/                    # React frontend
    ├── package.json
    ├── vite.config.js
    ├── netlify.toml
    ├── index.html
    ├── public/
    │   └── logo.png
    └── src/
        ├── api.js
        ├── App.jsx
        ├── context/           # Auth, Theme, Toast providers
        │   ├── AuthContext.jsx
        │   ├── ThemeContext.jsx
        │   └── ToastContext.jsx
        ├── components/        # Reusable UI
        │   ├── Navbar.jsx
        │   ├── Receipt.jsx
        │   ├── QRModal.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── Card.jsx
        │   └── admin/
        │       ├── AuditLog.jsx
        │       ├── RemoveUserModal.jsx
        │       ├── RentalInventory.jsx
        │       ├── ExerciseLibrary.jsx
        │       ├── RevenueChart.jsx
        │       ├── UserDetailModal.jsx
        │       └── CoachManagement.jsx
        └── pages/             # Route components
            ├── Home.jsx
            ├── Login.jsx
            ├── Register.jsx
            ├── Profile.jsx
            ├── Admin.jsx
            ├── Membership.jsx
            ├── Rentals.jsx
            ├── Recommendations.jsx
            ├── Workouts.jsx
            ├── Routines.jsx
            ├── Analytics.jsx
            ├── Exercises.jsx
            ├── VerifyPayment.jsx
            ├── MyCoach.jsx
            ├── Coach.jsx
            └── CoachClient.jsx
```
---
```bash
## 🚀 Getting Started (Local Development)

### Prerequisites

- **Node.js 18.11+** and npm
- **XAMPP** (MySQL + phpMyAdmin)
- **MongoDB Atlas** account (free tier)
- **Gmail account** with 2-Step Verification enabled (for SMTP App Password)

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- **Node.js 18+** and npm
- **XAMPP** (MySQL + phpMyAdmin)
- **MongoDB Atlas** account (free tier)
- **Gmail account** with 2-Step Verification enabled (for SMTP App Password)

### 1. Clone the Repository

git clone https://github.com/phantom-nightmare-code/CCSFEN1L-SOFTWARE-ENGINEERING-PROJECT.git
cd CCSFEN1L-SOFTWARE-ENGINEERING-PROJECT

### 2. Install Dependencies
# Backend
npm install

# Frontend
cd client
npm install
cd ..

### 3. Set Up Environment Variables
# Server
PORT=5000
NODE_ENV=development

# MySQL (XAMPP defaults)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=fitforge
MYSQL_SSL=false

# MongoDB Atlas
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/fitforge

# JWT
JWT_SECRET=<your-64-char-hex>
JWT_EXPIRES_IN=7d

# Gmail SMTP
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=<16-char-app-password>
EMAIL_CC_ADMIN=

# Google reCAPTCHA v2 Checkbox (signup)
RECAPTCHA_SECRET_KEY=<server-side-secret-key>

# Client URL
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

# In client/.env
VITE_RECAPTCHA_SITE_KEY=<public-site-key>

Create a reCAPTCHA v2 Checkbox site in the Google reCAPTCHA Admin Console and add `localhost` to its allowed domains for local development. Keep the secret key in the server `.env`; never expose it in a `VITE_` variable or client code. Copy the client variable into `client/.env`. Restart both servers after changing environment variables.
For production, set `CLIENT_URL` to your deployed frontend origin and set `CORS_ORIGINS` to the comma-separated list of frontend origins that should be allowed to call the API.
The client defaults to the published FitForge Render API in production; if you deploy the backend elsewhere, set the client build variable `VITE_API_URL` to the backend API base URL (including `/api`) in your frontend hosting settings.

### 4. Set Up the Database
1. Start MySQL in XAMPP Control Panel

2. Open phpMyAdmin (http://localhost/phpmyadmin)

3. Create a database named fitforge

4. Import the SQL migration files in `db/migrations/` in numeric order. For an existing database, run any migrations it has not applied yet, including `006_coach_feedback_threads.sql` for coach feedback replies and `007_coach_payments.sql` for coach payment records.

The Admin Panel's **Clear All Transactions** action permanently clears platform and coach payment records, memberships, rentals, and revenue metrics for all users. Reserved rental stock is restored; users, workouts, and rental inventory are retained.

### 5. Run the App
# Terminal 1 — Backend
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev

Open http://localhost:5173 in your browser.
