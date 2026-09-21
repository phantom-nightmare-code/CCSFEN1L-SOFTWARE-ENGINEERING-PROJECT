# CCSFEN1L-SOFTWARE-ENGINEERING-PROJECT
Project Repository for CCSFEN1L (Software Engineering)
**NAME OF PROJECT: FITFORGE(GYM + EXERCISE WEBSITE)**
<br>
<br>
Folder Structure:

```
FitForge/
│
├── ⚙️ CONFIG & ROOT FILES
│   ├── .env                       # Environment variables (DB credentials, JWT secrets, SMTP)
│   ├── .env.example               # Configuration template for developers
│   ├── .gitignore                 # Excludes node_modules, .env, build outputs
│   ├── package.json               # Server dependencies (Express, Mongoose, MySQL2, Nodemailer)
│   ├── server.js                  # Express application entry point & server setup
│   └── README.md                  # Project overview, setup, and execution instructions
│
├── 🗄️ DATABASE (`/db`)
│   ├── mysql.js                   # MySQL connection pool setup (mysql2)
│   ├── mongo.js                   # MongoDB connection client (Mongoose)
│   └── migrations/                # Version-controlled relational database migrations
│       ├── 001_extend_schema.sql          # Initial schema expansions
│       ├── 002_fitforge_extension.sql     # Core domain tables (Users, Memberships, Rentals)
│       ├── 003_core_feature_columns.sql   # Additions for tracking & analytics
│       ├── 004_routine_columns.sql        # Exercise & workout routine tables
│       └── 005_coach_feature.sql          # Coach-to-client relation tables
│
├── 🛡️ MIDDLEWARE (`/middleware`)
│   └── auth.js                    # Auth guards (JWT authentication, requireAdmin, requireCoach)
│
├── 📄 MONGO SCHEMAS & MODELS (`/models/mongo`)
│   ├── ActivityLog.js             # High-throughput event audit logging schema
│   ├── PaymentLog.js              # Semi-structured payment payloads & metadata
│   └── AdminMetric.js             # Pre-aggregated daily system metrics snapshot schema
│
├── ⚙️ BACKEND SERVICES & LOGIC (`/services`)
│   ├── activityLogger.js          # Writes user interaction events directly to MongoDB
│   ├── prDetection.js             # Epley 1RM formula processing & PR tracking engine
│   ├── recommendation.js          # Volume analysis algorithm for muscle balance suggestions
│   └── mailer.js                  # SMTP mail service (Gmail integration, receipt & QR emails)
│
├── 🚦 API ROUTES & ENDPOINTS (`/routes`)
│   ├── auth.js                    # POST /register, POST /login, GET /me, PUT /profile
│   ├── admin.js                   # Management dashboard logic (26 administrative REST routes)
│   ├── coaches.js                 # Coach actions (managing clients, providing feedback)
│   ├── myCoach.js                 # Client actions (viewing coach notes & assigned plans)
│   ├── memberships.js             # Subscription tier management & enrollment
│   ├── payments.js                # Payment creation, QR code generation, verification & receipts
│   ├── rentals.js                 # Equipment checkout and return transactions
│   ├── recommendations.js        # Dynamic muscle balance recommendation routes
│   ├── routines.js                # User routine creation and management CRUD
│   ├── workouts.js                # Workout logging, history & automated PR computation
│   ├── analytics.js               # Performance data aggregation (Volume, PRs, Muscle distribution)
│   └── exercises.js               # Global exercise catalog lookup endpoints
│
└── 🖥️ FRONTEND CLIENT (`/client`)
    ├── index.html                 # Main HTML DOM root element
    ├── package.json               # Frontend dependencies (React, Axios, Vite, Tailwind v4)
    ├── vite.config.js             # Vite builder configuration with Tailwind v4 plugin
    ├── public/
    │   └── logo.png               # Application branding assets
    └── src/                       # React source application code
        ├── index.jsx              # React DOM entry point
        ├── index.css              # Global styles, Tailwind directives & dark mode overrides
        ├── api.js                 # Centralized Axios client instance with JWT auto-inject interceptors
        ├── App.jsx                # Application root component with React Router mapping
        │
        ├── 🔑 STATE MANAGEMENT (`src/context`)
        │   ├── AuthContext.jsx    # User session state, JWT tokens & active user permissions
        │   ├── ThemeContext.jsx   # Light/Dark mode state management
        │   └── ToastContext.jsx   # App-wide floating alert notifications
        │
        ├── 🧱 UI COMPONENTS (`src/components`)
        │   ├── Navbar.jsx         # Dynamic navigation bar tailored by active user role
        │   ├── ProtectedRoute.jsx # Route authentication & authorization guards
        │   ├── Card.jsx           # Reusable container wrapper component
        │   ├── Receipt.jsx        # Printable payment transaction summary modal
        │   ├── QRModal.jsx        # Payment QR code renderer & resend trigger
        │   └── admin/             # Dedicated admin widgets
        │       ├── RentalInventory.jsx  # Equipment tracking CRUD interface
        │       ├── ExerciseLibrary.jsx  # Global exercise catalog manager
        │       ├── RevenueChart.jsx     # Visual financial breakdown (Method/Purpose/Date)
        │       ├── UserDetailModal.jsx  # Full user audit & account management modal
        │       └── CoachManagement.jsx  # Client-to-coach assignment console
        │
        └── 📱 PAGE VIEWS (`src/pages`)
            ├── Home.jsx           # Public landing page with service overview
            ├── Login.jsx          # Authentication login form
            ├── Register.jsx       # Account registration screen
            ├── Profile.jsx        # User account dashboard (Membership history & receipts)
            ├── Admin.jsx          # Central management console (10 tabbed sub-interfaces)
            ├── Membership.jsx     # Subscription plan browser & payment flow
            ├── Rentals.jsx        # Gear rental catalog & checkout system
            ├── Recommendations.jsx Dynamic exercise recommendation feedback
            ├── Workouts.jsx       # Daily workout logger & history viewer
            ├── Routines.jsx       # Custom workout plan builder
            ├── Analytics.jsx      # Personal progress graphs (Volume, PRs, balance charts)
            ├── Exercises.jsx      # Searchable exercise database viewer
            ├── VerifyPayment.jsx  # Public QR code payment confirmation page
            ├── MyCoach.jsx        # Client portal for feedback from assigned coach
            ├── Coach.jsx          # Coach dashboard listing active assigned clients
            └── CoachClient.jsx    # Client analysis view & message submission for coaches

```


Prerequisites
Node.js installed (v18 or higher recommended)

XAMPP installed — MAKE SURE MySQL and Apache services are running

MongoDB Atlas account (free tier) — for payments, activity logs, and analytics rollups

Gmail account with 2-Step Verification enabled — for sending payment QR codes and receipts

VS Code (or any code editor)


Step 1: Database Setup (MySQL)
Open XAMPP Control Panel and start MySQL.

Open phpMyAdmin (http://localhost/phpmyadmin), click the SQL tab, and run the full schema script provided at the bottom of this document.

Verify: In phpMyAdmin, click fitforge in the left sidebar — you should see 12 tables:

users, exercises, routines, routine_exercises

workouts, workout_sets, personal_records

memberships, rental_items, rentals

coach_clients, coach_feedback

**Step 2: MongoDB Atlas Setup**
Sign up at https://cloud.mongodb.com (free M0 cluster).

Create a database user (Database Access → Add New User):

Username: fitforge_user

Password: something strong (alphanumeric only — avoid special characters)

Role: Read and write to any database

Whitelist your IP (Network Access → Add IP Address → Add Current IP).

Tip: Use 0.0.0.0/0 for development if your home IP changes often.

Get your connection string:

Click Connect on your cluster → Drivers → Node.js

Copy the string (looks like mongodb+srv://fitforge_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority)

Replace <password> with your actual password

Insert /fitforge before the ? — e.g., .../fitforge?retryWrites=true...


Step 3: Gmail App Password Setup
1. Go to https://myaccount.google.com/security

2. Enable 2-Step Verification (required).

3. Go to https://myaccount.google.com/apppasswords

4. Create a new app password — name it "FitForge Mailer".

5. Copy the 16-character password (remove spaces).


Step 4: Backend Setup
1. Open VS Code. In your root FitForge folder, create a file named .env and paste:

PORT=5000
NODE_ENV=development

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=fitforge

MONGO_URI=mongodb+srv://fitforge_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/fitforge?retryWrites=true&w=majority

JWT_SECRET=your_64_char_random_hex_string_here
JWT_EXPIRES_IN=7d

EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_CC_ADMIN=

CLIENT_URL=http://localhost:5173

In the terminal, run:
npm install

Start the backend:
npm run dev

Leave this terminal open. You should see:
🚀 FitForge API on :5000
✅ MySQL connected
✅ MongoDB connected

Step 5: Frontend Setup
Open a new terminal tab in VS Code.

Navigate to the client folder:
cd client

Install dependencies:
npm install

Start the frontend:
npm run dev
Leave this terminal open. The app opens at http://localhost:5173

Step 6: Create Your First Admin
Option A — Register then promote (easiest):

Go to http://localhost:5173/register and create an account.

Open phpMyAdmin → fitforge → SQL tab and run:
UPDATE users SET role='admin' WHERE email='admin@fitforge.local';
Log out and log back in — the Admin tab appears in the navbar.

Step 7: Using the App
As a regular user:

Log Workout: Click "Log a workout" → enter name, date → add sets (select exercise, weight, reps) → Save. If a new record is set, a toast confirms "N new PR(s)!"

View History: Click "Workouts" → expand any workout to see all sets.

Build Routines: Click "Routines" → "+ New routine" → name it, add exercises with target sets/reps → Save. Click "Start" on any routine to launch a workout.

Analytics: Click "Analytics" → volume chart, muscle balance pie, and PR table update automatically. Use range selector for 7/30/90/365 days.

Exercise Library: Click "Exercises" → filter by muscle group or equipment, search by name.

Membership: Click "Membership" → pick a plan → choose payment method. Cash/Card activate instantly. GCash/Maya/Bank trigger a QR code emailed to you.

Rentals: Click "Rentals" → pick equipment → reserve for 2 hours → return when done.

My Coach: If assigned to a coach, click "My Coach" → see all feedback with unread badges.

Profile: Click "Profile" → edit name/username/birthday, view membership expiry countdown, transactions with receipts, and active rentals.

As a coach:

Click Coach in the navbar → see all assigned clients as cards.

Click a client → view their workout history, PRs, and membership status.

Send feedback with subject, content, optional star rating, and workout attachment.

As an admin:

Click Admin → 10 tabs available:

PROFILE — your admin card + all users grid

STATS — user counts, login chart, daily revenue, payment breakdown

USERS — role management (promote to coach, reset to user)

ACTIVITY — MongoDB activity feed

PAYMENTS — all payments with revenue KPIs and receipts

PENDING — verify/reject/resend QR payment emails

TRANSACTIONS — change membership and rental statuses with auto-refund

COACHES — assign coaches to clients

INVENTORY — full CRUD for rental equipment

EXERCISES — full CRUD for the exercise library

Needed Dependencies (install in order)
Part 1: Backend Dependencies (root FitForge folder)
Make sure your terminal is in the FitForge root (where server.js lives). Run:
npm install express cors cookie-parser dotenv mysql2 mongoose jsonwebtoken bcryptjs nodemailer qrcode

For auto-restart during development (recommended):
npm install --save-dev nodemon

Part 2: Frontend Dependencies (client folder)
Navigate into the client folder:
cd client

run:
npm install react react-dom react-router-dom axios recharts
npm install --save-dev vite @vitejs/plugin-react tailwindcss @tailwindcss/vite postcss


Before starting — make sure:

XAMPP MySQL is running

.env file exists in the project root with all variables filled in

MongoDB Atlas IP whitelist includes your current IP




