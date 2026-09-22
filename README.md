# CCSFEN1L-SOFTWARE-ENGINEERING-PROJECT
Project Repository for CCSFEN1L (Software Engineering)
**NAME OF PROJECT: FITFORGE(GYM + EXERCISE WEBSITE)** <br> <br>
**The Migration part is also the schema used in XAMPP; you can run it manually in phpMyAdmin via XAMPP. You no longer need to run it. If you run the schema in the sql script for xampp.sql, treat the migration part as static source code after you complete the instructions here. If you have any further questions, feel free to reach out to me. Thanks. <br> <br>
Please read the Fitforge-Manual.pdf for precise instructions and kindly read the FitForge-Features.pdf for a complete explanation of the features mentioned below:
<br>
<br>
Folder Structure (Follow as is; do not change anything):**

```
FitForge/
├── .env                                Environment variables (not committed)
├── .env.example                        Template with placeholder values
├── .gitignore                          Excludes node_modules, .env, etc.
├── package.json                        Backend dependencies & scripts
├── server.js                           Express entry point
│
├── db/
│   ├── mysql.js                        MySQL connection pool
│   ├── mongo.js                        MongoDB connection (Mongoose)
│   └── migrations/
│       ├── 001_extend_schema.sql
│       ├── 002_fitforge_extension.sql
│       ├── 003_core_feature_columns.sql
│       ├── 004_routine_columns.sql
│       └── 005_coach_feature.sql
│
├── middleware/
│   └── auth.js                         authenticate, requireAdmin, requireCoach
│
├── models/
│   └── mongo/
│       ├── ActivityLog.js              Every user event
│       ├── PaymentLog.js               Payments with flexible details
│       └── AdminMetric.js              Daily aggregated counters
│
├── services/
│   ├── activityLogger.js               Writes to MongoDB on every action
│   ├── prDetection.js                  Epley 1RM computation + PR update
│   ├── recommendation.js               Suggests neglected muscle groups
│   └── mailer.js                       Gmail SMTP, QR emails, result emails
│
├── routes/
│   ├── auth.js                         Register, login, me, update profile
│   ├── admin.js                        All admin endpoints (26 routes)
│   ├── coaches.js                      Coach-facing endpoints
│   ├── myCoach.js                      Client-facing endpoints
│   ├── memberships.js                  Membership CRUD
│   ├── payments.js                     Payment creation, QR, verify, resend
│   ├── rentals.js                      Rental transactions
│   ├── recommendations.js              Workout recommendations
│   ├── routines.js                     Routine CRUD
│   ├── workouts.js                     Workout logging with PR detection
│   ├── analytics.js                    Volume, PRs, muscle balance
│   └── exercises.js                    Exercise library
│
└── client/
    ├── index.html                      HTML entry point
    ├── package.json                    Frontend dependencies
    ├── vite.config.js                  Vite + Tailwind v4 plugin
    ├── public/
    │   └── logo.png                    Static logo asset
    └── src/
        ├── index.jsx                   React entry point
        ├── index.css                   Tailwind imports + dark mode variant
        ├── api.js                      Axios instance with interceptors
        ├── App.jsx                     Root component + route definitions
        │
        ├── context/
        │   ├── AuthContext.jsx         User session + JWT management
        │   ├── ThemeContext.jsx        Light/dark mode toggle
        │   └── ToastContext.jsx        Global toast notifications
        │
        ├── components/
        │   ├── Navbar.jsx              Role-aware navigation bar
        │   ├── ProtectedRoute.jsx      Auth guards (Protected, Admin, Coach)
        │   ├── Card.jsx                Reusable card component
        │   ├── Receipt.jsx             Payment receipt modal
        │   ├── QRModal.jsx             QR display + email resend
        │   └── admin/
        │       ├── RentalInventory.jsx Full CRUD for rental items
        │       ├── ExerciseLibrary.jsx Full CRUD for exercises
        │       ├── RevenueChart.jsx    Daily/method/purpose revenue charts
        │       ├── UserDetailModal.jsx Full user drill-down modal
        │       └── CoachManagement.jsx Coach assignment interface
        │
        └── pages/
            ├── Home.jsx                Homepage with About section
            ├── Login.jsx               Login form
            ├── Register.jsx            Registration form
            ├── Profile.jsx             User profile with memberships & receipts
            ├── Admin.jsx               Admin dashboard (10 tabs)
            ├── Membership.jsx          Subscription plans & payment
            ├── Rentals.jsx             Equipment rental catalog
            ├── Recommendations.jsx     Suggested exercises
            ├── Workouts.jsx            Workout logging & history
            ├── Routines.jsx            Routine builder
            ├── Analytics.jsx           Volume, PRs, muscle balance charts
            ├── Exercises.jsx           Exercise library browser
            ├── VerifyPayment.jsx       Public QR verification page
            ├── MyCoach.jsx             Client's view of coach feedback
            ├── Coach.jsx               Coach dashboard
            └── CoachClient.jsx         Client detail + send feedback
```

<br>
<br>
FitForge Logo:
<br>
<br>
<img width="757" height="685" alt="logo" src="https://github.com/user-attachments/assets/80525ab6-58b5-4248-a652-662bc1863d85" />


**PRE-REQUISITES:**
Node.js installed (v18 or higher recommended)

XAMPP installed — MAKE SURE MySQL and Apache services are running

MongoDB Atlas account (free tier) — for payments, activity logs, and analytics rollups

Gmail account with 2-Step Verification enabled — for sending payment QR codes and receipts

VS Code (or any code editor)


Step 1: Database Setup (MySQL)
Open XAMPP Control Panel and start MySQL and Apache.

Open phpMyAdmin (http://localhost/phpmyadmin), click the SQL tab, and run the full schema script provided (sql script for xampp.sql).

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

Implemented Features:
1. Authentication & Accounts

2. Workout Tracking

3. Routine Builder

4. Analytics Dashboard

5. Exercise Library

6. Membership System

7. Payment Processing

8. Equipment Rentals

9. Personal Coaching

10. Admin Dashboard

11. User Interface

12. Backend Systems

13. Data Model

**TBA FOR FUTURE ANNOUNCEMENTS**



