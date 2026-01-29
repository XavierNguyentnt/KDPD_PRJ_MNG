-- =============================================================================
-- KDPD: Migration dữ liệu – Từ workflow (jsonb) sang task_assignments
-- Chạy SAU khi đã chạy KDPD_DB_migration_nn_tables.sql và bảng task_assignments đã tồn tại.
-- Chỉ chèn các dòng có thể map assignee (tên) → user_id qua users.display_name.
-- Có thể chạy nhiều lần: ON CONFLICT DO NOTHING.
-- =============================================================================

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
  u.id,
  stage->>'type',
  COALESCE((round_elem->>'roundNumber')::int, 1),
  (stage->>'startDate')::date,
  (stage->>'dueDate')::date,
  CASE
    WHEN stage->>'completedDate' IS NOT NULL AND (stage->>'completedDate') <> ''
    THEN (stage->>'completedDate')::timestamp with time zone
    ELSE NULL
  END,
  COALESCE(NULLIF(TRIM(stage->>'status'), ''), 'not_started'),
  COALESCE((stage->>'progress')::int, 0),
  NULLIF(TRIM(stage->>'notes'), '')
FROM public.tasks t
CROSS JOIN LATERAL jsonb_array_elements(t.workflow->'rounds') AS round_elem
CROSS JOIN LATERAL jsonb_array_elements(round_elem->'stages') AS stage
INNER JOIN public.users u ON u.display_name = TRIM(stage->>'assignee')
WHERE t.workflow IS NOT NULL
  AND jsonb_typeof(COALESCE(t.workflow->'rounds', '[]'::jsonb)) = 'array'
  AND stage->>'assignee' IS NOT NULL
  AND TRIM(stage->>'assignee') <> ''
ON CONFLICT (task_id, user_id, stage_type, round_number) DO NOTHING;
