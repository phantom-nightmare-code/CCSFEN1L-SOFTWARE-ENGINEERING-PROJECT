-- ============================================================
-- FitForge extension — tailored to existing schema
-- Adds missing user columns + memberships/rentals tables
-- ============================================================

-- ---------- 1) Add missing user columns ----------
ALTER TABLE users
  ADD COLUMN role      ENUM('user','admin') DEFAULT 'user',
  ADD COLUMN full_name VARCHAR(255);

-- ---------- 2) Memberships ----------
CREATE TABLE IF NOT EXISTS memberships (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       ENUM('walk-in','monthly','yearly') NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE,
  status     ENUM('active','expired','cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_membership_user_status (user_id, status)
);

-- ---------- 3) Rental inventory ----------
CREATE TABLE IF NOT EXISTS rental_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  category    VARCHAR(100),
  description TEXT,
  hourly_rate DECIMAL(10,2) NOT NULL,
  stock       INT NOT NULL DEFAULT 0,
  image_url   VARCHAR(500),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- 4) Rental transactions ----------
CREATE TABLE IF NOT EXISTS rentals (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  item_id     INT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1,
  start_time  DATETIME NOT NULL,
  end_time    DATETIME,
  status      ENUM('reserved','active','returned','cancelled') DEFAULT 'reserved',
  total_cost  DECIMAL(10,2),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES rental_items(id),
  INDEX idx_rental_user_status (user_id, status)
);

-- ---------- 5) Seed rental inventory ----------
INSERT INTO rental_items (name, category, description, hourly_rate, stock) VALUES
  ('Olympic Barbell',       'Weights',   '20 kg competition bar',       50.00, 10),
  ('Power Rack',            'Racks',     'Adjustable squat/power rack', 120.00, 4),
  ('Dumbbell Set (5-50kg)', 'Weights',   'Full rubber hex set',         80.00, 6),
  ('Resistance Bands',      'Accessory', 'Set of 5 tension levels',     25.00, 20),
  ('Kettlebell (16kg)',     'Weights',   'Cast-iron kettlebell',        40.00, 12),
  ('Treadmill',             'Cardio',    'Commercial-grade treadmill', 150.00, 3);

-- ---------- 6) Optional: personal records (for PR tracking) ----------
CREATE TABLE IF NOT EXISTS personal_records (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  exercise_id  INT NOT NULL,
  best_1rm     DECIMAL(8,2) NOT NULL,
  achieved_at  DATE,
  UNIQUE KEY uq_user_exercise (user_id, exercise_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);