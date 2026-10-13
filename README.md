# CCSFEN1L-SOFTWARE-ENGINEERING-PROJECT
Project Repository for CCSFEN1L (Software Engineering)
**NAME OF PROJECT: FITFORGE(GYM + EXERCISE WEBSITE)** <br> <br>
# FitForge 💪

> **Your move, your progress.**

FitForge is a full-stack gym management and workout tracking platform that brings together workout logging, routine building, analytics, membership management, equipment rentals, and personal coaching into a single, modern web application.

[![Live Demo](https://img.shields.io/badge/Live_Demo-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://fitforge-gym-and-track.netlify.app)
[![Backend API](https://img.shields.io/badge/Backend_API-4A90E2?style=for-the-badge&logo=render&logoColor=white)](https://fitforge-backend-wey2.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)

---

## 📖 About

FitForge is a gym companion built for people who take their training seriously. Most fitness apps do one thing well — but FitForge brings every part of your fitness journey into a single platform: from the moment you walk in the door, through every rep and set, to the analytics that tell you what's working.

### ✨ Key Features

- **🔐 Authentication & Accounts** — Register, login, JWT sessions, and three user roles (user, coach, admin).
- **🏋️ Workout Tracking** — Log workouts with sets, reps, and weight. Automatic PR detection using the Epley 1RM formula.
- **📋 Routine Builder** — Create reusable workout templates and launch them in one click.
- **📊 Analytics Dashboard** — Volume charts, muscle balance pies, and a full personal records table.
- **💳 Membership System** — Walk-in, monthly, and yearly plans with expiry tracking and auto-refund on cancellation.
- **💸 Payment Processing** — GCash, Maya, bank transfer, card, and cash. QR code verification for digital payments via email.
- **🏋️ Equipment Rentals** — Hourly reservations with live stock tracking and automatic receipts.
- **🎯 Personal Coaching** — Coach-client assignments, detailed feedback with ratings, and unread badges.
- **🛡️ Admin Dashboard** — 10 tabs for complete control over users, payments, memberships, rentals, inventory, and coaching.
- **🌗 User Interface** — Dark/light mode, responsive layout, toast notifications, and role-aware navigation.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express |
| **Frontend** | React 18, React Router, Recharts, Vite |
| **Styling** | Tailwind CSS v4 |
| **Primary Database** | MySQL 8 (Aiven) |
| **Secondary Database** | MongoDB Atlas |
| **Authentication** | JWT, bcrypt |
| **Email** | Nodemailer, Gmail SMTP |
| **QR Codes** | `qrcode` npm library |
| **Deployment** | Netlify (frontend), Render (backend) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- Node.js 18+ and npm
- XAMPP (MySQL)
- MongoDB Atlas account (free tier)
- Gmail account with 2-Step Verification enabled (for SMTP)

### 1. Clone the Repository

```bash
git clone https://github.com/phantom-nightmare-code/CCSFEN1L-SOFTWARE-ENGINEERING-PROJECT.git
cd CCSFEN1L-SOFTWARE-ENGINEERING-PROJECT
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

Access the app here:
https://fitforge-gym-and-track.netlify.app/


