-- Thêm cột kinh phí viết bài tổng quan (overview_value) và kinh phí dịch thuật (translation_value)
-- cho bảng translation_contracts.
-- overview_value: do người dùng nhập, NULLABLE.
-- translation_value: đơn giá * số trang dự tính (có thể tính ở UI/backend), NULLABLE.

ALTER TABLE public.translation_contracts
  ADD COLUMN IF NOT EXISTS overview_value numeric(15, 2),
  ADD COLUMN IF NOT EXISTS translation_value numeric(15, 2);

COMMENT ON COLUMN public.translation_contracts.overview_value IS 'Kinh phí viết bài tổng quan (người dùng nhập)';
COMMENT ON COLUMN public.translation_contracts.translation_value IS 'Kinh phí dịch thuật = đơn giá * số trang dự tính';
