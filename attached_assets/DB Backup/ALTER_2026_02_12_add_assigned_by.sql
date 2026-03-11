BEGIN;

ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS assigned_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_assignments_assigned_by_fkey'
  ) THEN
    ALTER TABLE task_assignments
      ADD CONSTRAINT task_assignments_assigned_by_fkey
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS task_assignments_assigned_by_idx
  ON task_assignments (assigned_by);

COMMIT;
