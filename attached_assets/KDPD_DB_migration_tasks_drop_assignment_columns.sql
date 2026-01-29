-- =============================================================================
-- KDPD: Migration – Chuyển trường gán việc từ tasks sang task_assignments
-- Các trường assignee_id, assignee, role, start_date, due_date, actual_completed_at
-- thuộc về quan hệ user-task (task_assignments), không còn ở bảng tasks.
--
-- Chạy SAU khi đã chạy KDPD_DB_migration_nn_tables.sql và (tùy chọn) 
-- KDPD_DB_migrate_workflow_to_assignments.sql.
-- Thứ tự: (1) Backfill task_assignments từ tasks chưa có assignment, (2) DROP cột.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Backfill task_assignments từ tasks (tasks có assignee_id nhưng chưa có dòng trong task_assignments)
-- stage_type = 'primary' cho gán việc đơn (từ cột assignee_id cũ)
-- -----------------------------------------------------------------------------
INSERT INTO public.task_assignments (
  task_id,
  user_id,
  stage_type,
  round_number,
  received_at,
  due_date,
  completed_at,
  status,
  progress,
  notes
)
SELECT
  t.id,
  t.assignee_id,
  'primary',
  1,
  CASE WHEN t.start_date IS NOT NULL AND t.start_date <> '' THEN (t.start_date::text)::date ELSE NULL END,
  CASE WHEN t.due_date IS NOT NULL AND t.due_date <> '' THEN (t.due_date::text)::date ELSE NULL END,
  t.actual_completed_at,
  CASE
    WHEN t.actual_completed_at IS NOT NULL THEN 'completed'
    WHEN t.status ILIKE '%progress%' THEN 'in_progress'
    WHEN t.status ILIKE 'completed%' THEN 'completed'
    ELSE 'not_started'
  END,
  COALESCE(t.progress, 0),
  NULL
FROM public.tasks t
WHERE t.assignee_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.task_assignments a
    WHERE a.task_id = t.id AND a.stage_type = 'primary' AND a.round_number = 1
  )
ON CONFLICT (task_id, user_id, stage_type, round_number) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Xóa các cột gán việc khỏi bảng tasks (dữ liệu đã chuyển sang task_assignments)
-- -----------------------------------------------------------------------------
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assignee_id;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assignee;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS role;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS start_date;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS due_date;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS actual_completed_at;

COMMENT ON TABLE public.tasks IS 'Công việc (chỉ thông tin task-level). Người giao, ngày nhận/hoàn thành: bảng task_assignments.';
