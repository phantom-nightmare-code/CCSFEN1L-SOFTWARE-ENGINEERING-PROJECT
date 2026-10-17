-- ============================================================
-- FitForge migration 007 — Coach payment records
-- Ensures coach payments used by coach dashboards and admin
-- transaction clearing are present in MySQL.
-- Safe to re-run.
-- ============================================================

USE fitforge;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'coach_hourly_rate'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN coach_hourly_rate DECIMAL(10,2) NULL',
  'SELECT "users.coach_hourly_rate already exists" AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS coach_payments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  member_id         INT NOT NULL,
  coach_id          INT NOT NULL,
  hours             DECIMAL(6,2) NOT NULL,
  rate              DECIMAL(10,2) NOT NULL,
  amount            DECIMAL(10,2) NOT NULL,
  method            VARCHAR(32) NOT NULL,
  status            ENUM('pending','paid','refunded') NOT NULL DEFAULT 'pending',
  session_date      DATE NULL,
  notes             TEXT NULL,
  reference         VARCHAR(100) NOT NULL UNIQUE,
  verification_token VARCHAR(128) NULL,
  user_confirmed_at TIMESTAMP NULL,
  verified_at       TIMESTAMP NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_coach_payments_member (member_id, created_at),
  INDEX idx_coach_payments_coach (coach_id, status, created_at)
) ENGINE=InnoDB;
