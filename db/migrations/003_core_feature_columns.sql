-- ============================================================
-- FitForge migration 003 — Core feature columns
-- Adds columns and tables required for workout tracking,
-- routines, analytics, and the exercise library.
-- Safe to re-run: each ALTER is guarded by an existence check.
-- ============================================================

USE fitforge;

-- ------------------------------------------------------------
-- 1) personal_records (needed for Analytics + PR detection)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personal_records (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  exercise_id  INT NOT NULL,
  best_1rm     DECIMAL(8,2) NOT NULL,
  achieved_at  DATE,
  UNIQUE KEY uq_user_exercise (user_id, exercise_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2) workouts.name
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'workouts'
    AND COLUMN_NAME  = 'name'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE workouts ADD COLUMN name VARCHAR(255)',
  'SELECT "workouts.name already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 3) workouts.notes
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'workouts'
    AND COLUMN_NAME  = 'notes'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE workouts ADD COLUMN notes TEXT',
  'SELECT "workouts.notes already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 4) workouts.duration_minutes
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'workouts'
    AND COLUMN_NAME  = 'duration_minutes'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE workouts ADD COLUMN duration_minutes INT',
  'SELECT "workouts.duration_minutes already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 5) routines.description
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'routines'
    AND COLUMN_NAME  = 'description'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE routines ADD COLUMN description TEXT',
  'SELECT "routines.description already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 6) routine_exercises.order_index
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'routine_exercises'
    AND COLUMN_NAME  = 'order_index'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE routine_exercises ADD COLUMN order_index INT DEFAULT 0',
  'SELECT "routine_exercises.order_index already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 7) workout_sets.set_number
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'workout_sets'
    AND COLUMN_NAME  = 'set_number'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE workout_sets ADD COLUMN set_number INT DEFAULT 1',
  'SELECT "workout_sets.set_number already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 8) exercises.equipment
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'exercises'
    AND COLUMN_NAME  = 'equipment'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE exercises ADD COLUMN equipment VARCHAR(100)',
  'SELECT "exercises.equipment already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 9) exercises.muscle_group
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'exercises'
    AND COLUMN_NAME  = 'muscle_group'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE exercises ADD COLUMN muscle_group VARCHAR(100)',
  'SELECT "exercises.muscle_group already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 10) exercises.description
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'exercises'
    AND COLUMN_NAME  = 'description'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE exercises ADD COLUMN description TEXT',
  'SELECT "exercises.description already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;