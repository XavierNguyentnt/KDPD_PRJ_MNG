-- Migration: Add vote column to tasks table
-- vote: đánh giá của Người kiểm soát (tốt / khá / không tốt / không hoàn thành)
-- Chạy script này trong Neon SQL Editor (hoặc psql) trước khi dùng tính năng Đánh giá công việc.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS vote text;

COMMENT ON COLUMN public.tasks.vote IS 'Đánh giá công việc của Người kiểm soát: tot | kha | khong_tot | khong_hoan_thanh';

-- Kiểm tra cột đã tồn tại:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'vote';
