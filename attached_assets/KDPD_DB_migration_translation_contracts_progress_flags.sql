-- Extend translation_contracts for progress tracking (boolean completion flags)
ALTER TABLE public.translation_contracts
  ADD COLUMN IF NOT EXISTS progress_check_date date,
  ADD COLUMN IF NOT EXISTS expert_review_date date,
  ADD COLUMN IF NOT EXISTS project_acceptance_date date,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS cancelled_at date,
  ADD COLUMN IF NOT EXISTS proofreading_in_progress boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS proofreading_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS editing_in_progress boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS editing_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS print_transfer_date date,
  ADD COLUMN IF NOT EXISTS published_date date;

ALTER TABLE public.translation_contracts
  DROP COLUMN IF EXISTS proofreading_completed_date,
  DROP COLUMN IF EXISTS editing_completed_date;
