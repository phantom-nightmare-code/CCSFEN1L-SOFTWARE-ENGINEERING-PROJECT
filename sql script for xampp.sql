-- ============================================================
-- FitForge — Complete Database Schema
-- Drop and recreate with all features:
--   auth, workouts, routines, analytics, memberships,
--   rentals, payments, coach system
-- ============================================================

DROP DATABASE IF EXISTS fitforge;
CREATE DATABASE fitforge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fitforge;

-- ============================================================
-- 1) USERS
-- ============================================================
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255),
  birthday      DATE,
  role          ENUM('user','admin','coach') DEFAULT 'user',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 2) EXERCISES (library)
-- ============================================================
CREATE TABLE exercises (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  muscle_group VARCHAR(100),
  equipment    VARCHAR(100),
  description  TEXT,
  INDEX idx_ex_muscle (muscle_group)
) ENGINE=InnoDB;

-- ============================================================
-- 3) ROUTINES (planned workouts)
-- ============================================================
CREATE TABLE routines (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_routines_user (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- 4) ROUTINE EXERCISES (routine → exercises)
-- ============================================================
CREATE TABLE routine_exercises (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  routine_id  INT NOT NULL,
  exercise_id INT NOT NULL,
  `sets`      INT DEFAULT 3,
  reps        INT DEFAULT 10,
  order_index INT DEFAULT 0,
  FOREIGN KEY (routine_id)  REFERENCES routines(id)  ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
  INDEX idx_re_routine (routine_id)
) ENGINE=InnoDB;

-- ============================================================
-- 5) WORKOUTS (performed sessions)
-- ============================================================
CREATE TABLE workouts (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  name             VARCHAR(255),
  workout_date     DATE NOT NULL,
  notes            TEXT,
  duration_minutes INT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_workouts_user_date (user_id, workout_date)
) ENGINE=InnoDB;

-- ============================================================
-- 6) WORKOUT SETS (individual sets)
-- ============================================================
CREATE TABLE workout_sets (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  workout_id  INT NOT NULL,
  exercise_id INT NOT NULL,
  weight      DECIMAL(6,2),
  reps        INT,
  set_number  INT DEFAULT 1,
  FOREIGN KEY (workout_id)  REFERENCES workouts(id)  ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
  INDEX idx_ws_workout  (workout_id),
  INDEX idx_ws_exercise (exercise_id)
) ENGINE=InnoDB;

-- ============================================================
-- 7) PERSONAL RECORDS (auto-computed 1RMs)
-- ============================================================
CREATE TABLE personal_records (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  exercise_id  INT NOT NULL,
  best_1rm     DECIMAL(8,2) NOT NULL,
  achieved_at  DATE,
  UNIQUE KEY uq_user_exercise (user_id, exercise_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 8) MEMBERSHIPS
-- ============================================================
CREATE TABLE memberships (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       ENUM('walk-in','monthly','yearly') NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE,
  status     ENUM('active','expired','cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_membership_user_status (user_id, status)
) ENGINE=InnoDB;

-- ============================================================
-- 9) RENTAL ITEMS (gym equipment inventory)
-- ============================================================
CREATE TABLE rental_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  category    VARCHAR(100),
  description TEXT,
  hourly_rate DECIMAL(10,2) NOT NULL,
  stock       INT NOT NULL DEFAULT 0,
  image_url   VARCHAR(500),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rental_items_category (category)
) ENGINE=InnoDB;

-- ============================================================
-- 10) RENTALS (transactions)
-- ============================================================
CREATE TABLE rentals (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  item_id    INT NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  start_time DATETIME NOT NULL,
  end_time   DATETIME,
  status     ENUM('reserved','active','confirmed','hold','returned','cancelled','available')
             DEFAULT 'reserved',
  total_cost DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)        ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES rental_items(id),
  INDEX idx_rental_user_status (user_id, status),
  INDEX idx_rental_status      (status)
) ENGINE=InnoDB;

-- ============================================================
-- 11) COACH ↔ CLIENT assignments
-- ============================================================
CREATE TABLE coach_clients (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  coach_id    INT NOT NULL,
  client_id   INT NOT NULL,
  status      ENUM('active','inactive') DEFAULT 'active',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_coach_client (coach_id, client_id),
  FOREIGN KEY (coach_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_coach_clients_coach  (coach_id, status),
  INDEX idx_coach_clients_client (client_id, status)
) ENGINE=InnoDB;

-- ============================================================
-- 12) COACH FEEDBACK (coach → client notes)
-- ============================================================
CREATE TABLE coach_feedback (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  coach_id   INT NOT NULL,
  client_id  INT NOT NULL,
  workout_id INT NULL,
  subject    VARCHAR(255),
  content    TEXT NOT NULL,
  rating     TINYINT NULL,
  read_at    TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coach_id)   REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (client_id)  REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL,
  INDEX idx_feedback_client (client_id, created_at),
  INDEX idx_feedback_coach  (coach_id, created_at)
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- ============================================================

-- ---------- Exercise library (42 exercises) ----------
INSERT INTO exercises (name, muscle_group, equipment, description) VALUES
  -- Chest
  ('Bench Press',          'Chest',     'Barbell',    'Flat barbell press'),
  ('Incline Bench Press',  'Chest',     'Barbell',    'Incline barbell press'),
  ('Decline Bench Press',  'Chest',     'Barbell',    'Decline barbell press'),
  ('Dumbbell Fly',         'Chest',     'Dumbbell',   'Flat dumbbell fly'),
  ('Push-up',              'Chest',     'Bodyweight', 'Standard push-up'),
  ('Cable Crossover',      'Chest',     'Cable',      'High-to-low cable fly'),
  -- Back
  ('Deadlift',             'Back',      'Barbell',    'Conventional deadlift'),
  ('Barbell Row',          'Back',      'Barbell',    'Bent-over row'),
  ('Pull-up',              'Back',      'Bodyweight', 'Overhand grip'),
  ('Chin-up',              'Back',      'Bodyweight', 'Underhand grip'),
  ('Lat Pulldown',         'Back',      'Cable',      'Wide-grip pulldown'),
  ('Seated Cable Row',     'Back',      'Cable',      'Horizontal row'),
  ('T-Bar Row',            'Back',      'Barbell',    'Chest-supported row'),
  -- Legs
  ('Back Squat',           'Legs',      'Barbell',    'High-bar back squat'),
  ('Front Squat',          'Legs',      'Barbell',    'Front-rack squat'),
  ('Romanian Deadlift',    'Legs',      'Barbell',    'Hip-hinge RDL'),
  ('Leg Press',            'Legs',      'Machine',    '45-degree leg press'),
  ('Leg Extension',        'Legs',      'Machine',    'Quad isolation'),
  ('Leg Curl',             'Legs',      'Machine',    'Hamstring isolation'),
  ('Walking Lunge',        'Legs',      'Dumbbell',   'Dumbbell walking lunge'),
  ('Calf Raise',           'Legs',      'Machine',    'Standing calf raise'),
  ('Hip Thrust',           'Legs',      'Barbell',    'Glute bridge thrust'),
  -- Shoulders
  ('Overhead Press',       'Shoulders', 'Barbell',    'Standing strict press'),
  ('Seated Dumbbell Press','Shoulders', 'Dumbbell',   'Seated shoulder press'),
  ('Lateral Raise',        'Shoulders', 'Dumbbell',   'Side delt raise'),
  ('Front Raise',          'Shoulders', 'Dumbbell',   'Front delt raise'),
  ('Rear Delt Fly',        'Shoulders', 'Dumbbell',   'Bent-over rear delt'),
  ('Face Pull',            'Shoulders', 'Cable',      'Rope face pull'),
  ('Arnold Press',         'Shoulders', 'Dumbbell',   'Rotating shoulder press'),
  -- Arms
  ('Barbell Curl',         'Arms',      'Barbell',    'Standing bicep curl'),
  ('Dumbbell Curl',        'Arms',      'Dumbbell',   'Alternating curl'),
  ('Hammer Curl',          'Arms',      'Dumbbell',   'Neutral-grip curl'),
  ('Preacher Curl',        'Arms',      'Barbell',    'Preacher bench curl'),
  ('Tricep Pushdown',      'Arms',      'Cable',      'Rope/cable pushdown'),
  ('Overhead Tricep Ext',  'Arms',      'Dumbbell',   'Overhead extension'),
  ('Skull Crusher',        'Arms',      'Barbell',    'Lying tricep extension'),
  ('Close-Grip Bench',     'Arms',      'Barbell',    'Narrow bench press'),
  ('Dips',                 'Arms',      'Bodyweight', 'Tricep dips'),
  -- Core
  ('Plank',                'Core',      'Bodyweight', 'Forearm plank'),
  ('Hanging Leg Raise',    'Core',      'Bodyweight', 'Hanging raise'),
  ('Cable Crunch',         'Core',      'Cable',      'Kneeling cable crunch'),
  ('Russian Twist',        'Core',      'Bodyweight', 'Rotational twist'),
  ('Ab Wheel',             'Core',      'Accessory',  'Rollout');

-- ---------- Rental inventory (8 items) ----------
INSERT INTO rental_items (name, category, description, hourly_rate, stock) VALUES
  ('Olympic Barbell',       'Weights',   '20 kg competition bar',       50.00, 10),
  ('Power Rack',            'Racks',     'Adjustable squat/power rack', 120.00, 4),
  ('Dumbbell Set (5-50kg)', 'Weights',   'Full rubber hex set',         80.00, 6),
  ('Resistance Bands',      'Accessory', 'Set of 5 tension levels',     25.00, 20),
  ('Kettlebell (16kg)',     'Weights',   'Cast-iron kettlebell',        40.00, 12),
  ('Treadmill',             'Cardio',    'Commercial-grade treadmill', 150.00, 3),
  ('Rowing Machine',        'Cardio',    'Concept2 Model D',           130.00, 2),
  ('Cable Machine',         'Machine',   'Dual-pulley adjustable',     140.00, 2);

-- ============================================================
-- Done
-- ============================================================