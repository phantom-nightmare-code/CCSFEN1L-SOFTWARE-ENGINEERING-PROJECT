-- ============================================================
-- FitForge migration 004 — Routine exercise columns
-- Adds target sets and reps to routine_exercises so routines
-- can specify how many sets/reps the user should aim for.
-- Safe to re-run.
-- ============================================================

USE fitforge;

-- ------------------------------------------------------------
-- 1) routine_exercises.sets
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'routine_exercises'
    AND COLUMN_NAME  = 'sets'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE routine_exercises ADD COLUMN `sets` INT DEFAULT 3',
  'SELECT "routine_exercises.sets already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2) routine_exercises.reps
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'fitforge'
    AND TABLE_NAME   = 'routine_exercises'
    AND COLUMN_NAME  = 'reps'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE routine_exercises ADD COLUMN reps INT DEFAULT 10',
  'SELECT "routine_exercises.reps already exists" AS note'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;