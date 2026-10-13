# CCSFEN1L-SOFTWARE-ENGINEERING-PROJECT
Project Repository for CCSFEN1L (Software Engineering)
**NAME OF PROJECT: FITFORGE(GYM + EXERCISE WEBSITE)** <br> <br>
# FitForge 💪
Access the app here:
https://fitforge-gym-and-track.netlify.app/
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

<br>
<br>
FitForge Logo:
<br>
<br>
<img width="757" height="685" alt="logo" src="https://github.com/user-attachments/assets/80525ab6-58b5-4248-a652-662bc1863d85" />


```bash

#FOLDER STRUCTURE:

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
│   └── mongo/                 # Mongoose schemas (ActivityLog, PaymentLog, AdminMetric)
│
├── services/
│   ├── activityLogger.js      # Logs user actions to MongoDB
│   ├── prDetection.js         # Epley 1RM computation + PR updates
│   ├── recommendation.js      # Recommends exercises for neglected muscle groups
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
        ├── components/        # Navbar, Receipt, QRModal, etc.
        └── pages/             # Route components









