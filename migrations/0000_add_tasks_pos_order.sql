-- Migration 0000: Add pos_order column to tasks table (Kanban intra-column drag order)
-- Apply: psql $DATABASE_URL -f migrations/0000_add_tasks_pos_order.sql
-- Note: This is also auto-applied at server startup via ensureDbExtensions() ALTER TABLE ADD COLUMN IF NOT EXISTS

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pos_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_status_pos_order ON tasks (status, pos_order);
