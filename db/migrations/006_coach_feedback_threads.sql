-- ============================================================
-- FitForge migration 006 — Coach feedback threads
-- Adds close state, client replies, and feedback reactions.
-- Safe to re-run.
-- ============================================================

USE fitforge;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'coach_feedback'
    AND COLUMN_NAME = 'closed_at'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE coach_feedback ADD COLUMN closed_at TIMESTAMP NULL',
  'SELECT "coach_feedback.closed_at already exists" AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'coach_feedback'
    AND COLUMN_NAME = 'closed_by'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE coach_feedback ADD COLUMN closed_by INT NULL',
  'SELECT "coach_feedback.closed_by already exists" AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS coach_feedback_replies (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  feedback_id INT NOT NULL,
  author_id   INT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES coach_feedback(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_feedback_replies (feedback_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coach_feedback_reactions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  feedback_id INT NOT NULL,
  user_id     INT NOT NULL,
  emoji       VARCHAR(16) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_feedback_reaction (feedback_id, user_id, emoji),
  FOREIGN KEY (feedback_id) REFERENCES coach_feedback(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_feedback_reactions (feedback_id)
) ENGINE=InnoDB;
