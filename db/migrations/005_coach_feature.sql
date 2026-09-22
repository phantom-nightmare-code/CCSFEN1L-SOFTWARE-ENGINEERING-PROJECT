-- ============================================================
-- FitForge migration 005 — Coach feature
-- Adds the coach role, coach ↔ client assignments, and
-- coach feedback notes.
-- Safe to re-run for the tables; the enum ALTER is idempotent.
-- ============================================================

USE fitforge;

-- ------------------------------------------------------------
-- 1) Extend users.role enum to include 'coach'
-- ------------------------------------------------------------
ALTER TABLE users MODIFY COLUMN role
  ENUM('user','admin','coach') DEFAULT 'user';

-- ------------------------------------------------------------
-- 2) coach_clients — who coaches whom
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coach_clients (
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

-- ------------------------------------------------------------
-- 3) coach_feedback — coach notes to clients
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coach_feedback (
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