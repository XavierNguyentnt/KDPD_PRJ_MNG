-- KDPD: Migration – Thêm bảng notifications để thông báo cho nhân sự
-- Chạy sau khi bảng users, tasks, task_assignments đã tồn tại.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- task_assigned | task_due_soon | task_overdue
  task_id text REFERENCES public.tasks(id) ON DELETE CASCADE,
  task_assignment_id uuid REFERENCES public.task_assignments(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON public.notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_assignment_type
  ON public.notifications (user_id, task_assignment_id, type);

COMMENT ON TABLE public.notifications IS 'Thông báo cho nhân sự: task_assigned, task_due_soon, task_overdue.';
