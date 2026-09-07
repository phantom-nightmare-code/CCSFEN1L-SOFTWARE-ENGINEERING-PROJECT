# CCSFEN1L-SOFTWARE-ENGINEERING-PROJECT
Project Repository for CCSFEN1L (Software Engineering)
**NAME OF PROJECT: FITFORGE(GYM + EXERCISE WEBSITE)**
Folder Structure:

<img width="380" height="730" alt="image" src="https://github.com/user-attachments/assets/49487881-1011-48ae-bbca-db6a31bc644a" />


Prerequisites:

1. Node.js installed

2. XAMPP installed (MySQL service running)

3. VS Code

Step 1: Database Setup

Open XAMPP Control Panel and start MySQL.

Open phpMyAdmin (http://localhost/phpmyadmin), go to the SQL tab, and run the exact Schema SQL script provided above.

Step 2: Backend Setup

Open VS Code. In your root FitForge folder, create a file named .env and paste the following:

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=fitforge
PORT=5000

In the terminal, run: npm install (to install Express, MySQL2, CORS, dotenv, etc.)

Start the backend: node server.js (Leave this terminal open. You should see "Server running on port 5000").

Step 3: Frontend Setup

Open a new terminal tab in VS Code.

Change directory to the frontend: cd fitforge-frontend

Run: npm install (to install React, React Router, Axios, Recharts, etc.)

Run: npm start (Leave this terminal open. The app will open at http://localhost:3000).

Step 4: Using the App

Log Workout: Click "Log Workout". Select an exercise (e.g., "Bench Press"), type a Weight (e.g., 100) and Reps (e.g., 5), click "+ Add Set" to add another set, and press "Save Workout".

View History: Click "Workouts". You will see the card showing "Sep 7, 2026 - [Notes]" with all your sets.

Create Routine: Click "Routines", enter a name, and add exercises.

Dashboard: Click "Dashboard". If you have logged several workouts with increasing weights, you will see the charts update.


Needed Dependencies (follow in order)
Part 1: Backend Dependencies (Root FitForge folder)
Make sure your terminal is in the FitForge folder (where server.js and db.js are).

Run this command:
**npm install express cors dotenv mysql2**

Part 2: Frontend Dependencies (fitforge-frontend folder)
Navigate into the frontend folder by running **cd fitforge-frontend**

Run this command:
npm install react react-dom react-router-dom axios recharts react-scripts
(Note for React 19: If you get a peer dependency error when installing react-scripts, add --legacy-peer-deps to the end of the command, like this: npm install ... react-scripts --legacy-peer-deps).

3. The "Clean Install" Cheat Sheet
If you ever move this project to a new computer, clone the repository, or accidentally delete your node_modules folder, here is the exact sequence of commands to get everything working perfectly:

Sample:
Terminal 1 (Backend):
**cd C:\Users\James Adrian Castro\Documents\FitForge
npm install express cors dotenv mysql2
node server.js**

Terminal 2 (Frontend):
**cd C:\Users\James Adrian Castro\Documents\FitForge\fitforge-frontend
npm install react react-dom react-router-dom axios recharts react-scripts --legacy-peer-deps
npm start**

Schema needed:
CREATE DATABASE IF NOT EXISTS fitforge;
USE fitforge;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Exercises Table
CREATE TABLE IF NOT EXISTS exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- 3. Routines Table
CREATE TABLE IF NOT EXISTS routines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Routine Exercises Table
CREATE TABLE IF NOT EXISTS routine_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routine_id INT NOT NULL,
    exercise_id INT NOT NULL,
    default_sets INT DEFAULT 3,
    default_reps INT DEFAULT 10,
    default_weight DECIMAL(10,2) DEFAULT 0,
    order_index INT DEFAULT 0,
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- 5. Workouts Table
CREATE TABLE IF NOT EXISTS workouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    routine_id INT,
    workout_date DATE NOT NULL,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE SET NULL
);

-- 6. Workout Sets Table (Updated with set_number and is_pr)
CREATE TABLE IF NOT EXISTS workout_sets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workout_id INT NOT NULL,
    exercise_id INT NOT NULL,
    set_number INT DEFAULT 1,
    weight DECIMAL(10,2) NOT NULL,
    reps INT NOT NULL,
    is_pr BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- ==========================================
-- SEED DATA (REQUIRED for the app to work!)
-- ==========================================

-- Create a User with ID = 1 (Since your code hardcodes userId = 1)
INSERT INTO users (id, username, password) VALUES (1, 'demo', 'demo');

-- Add some exercises so the dropdown isn't empty
INSERT INTO exercises (name) VALUES ('Bench Press'), ('Squat'), ('Deadlift'), ('Overhead Press');

-- Add a default routine
INSERT INTO routines (user_id, name, description) VALUES (1, 'Push Day', 'Chest, Shoulders, and Triceps');


Features: (to be updated):
Current Implemented Features:

1. Dashboard (Frontend): Uses Recharts to display progress graphs, average 1RM, and personal records (PRs).

2. Routines (Frontend & Backend): Create, view, update, and delete workout routines. Supports adding multiple exercises with default sets, reps, and weights to a routine.

3. Log Workout (Frontend & Backend): Allows users to select an exercise (dropdown), input weight and reps, add multiple sets, add notes, and save the workout to the database.

4. Workout History (Frontend & Backend): Displays past workouts formatted in a clean card layout, showing dates and specific sets. It also shows a "PR" badge if the backend flags a set as a personal record.

5. Analytics API (Backend): Calculates estimated 1RM over time using the Brzycki formula, generates moving averages, and identifies recent PRs using advanced SQL (CTEs and Window functions).

6. Database Transactions: The backend uses transactions for inserting routines and workouts to ensure all-or-nothing data integrity.

Planned / Future Features (Next Steps):

1. JWT Authentication: Currently, userId is hardcoded to 1. The next major step is building Login/Register pages, issuing JSON Web Tokens (using your JWT_SECRET), and passing them from the frontend to the backend.

2. Frontend Styling & Responsiveness: The basic dark theme works, but you can later add Tailwind CSS or Material UI for a more polished look.

3. Enable detectAndUpdatePRs: The complex SQL query for auto-detecting PRs is currently commented out due to SQL strictness issues; you can optimize and re-enable it later.

4.  Profile (User) (Who uses the app)

5. Login Feature: (User account or admin) + Email

6. Admin page (All data of the whole website stored there + they can edit the features)

7. Password Hashing

8.  Homepage (about FitForge)

9.  Gym membership

10.  Cash payment integration (gcash, paymaya etc)

11.  gym rental (gym equipment (barbels etc)

12.  Fitforge Logo

TBA FOR FUTURE ANNOUNCEMENTS



