-- Tài khoản Admin: email admin@kdpd.local, mật khẩu Admin01092016@
-- Chạy trên Neon SQL Editor (tắt Explain/Analyze nếu bật).
-- Nếu email đã tồn tại sẽ cập nhật password_hash và role (ON CONFLICT).
-- Lưu ý: dùng $pwd$...$pwd$ (không dùng $$) để bcrypt hash giữ đúng ký tự $ đầu.

INSERT INTO users (
  email,
  password_hash,
  display_name,
  first_name,
  last_name,
  department,
  role,
  employee_group,
  is_active
) VALUES (
  'admin@kdpd.local',
  $pwd$$2b$10$Qw2yKYN4QZOOKU5LRpQABOGbTB1RKc0FGM9QoUNmgdnhQXPK2KWMO$pwd$,
  'admin',
  'Admin',
  'KDPD',
  'Ban Thư ký',
  'Admin',
  NULL,
  TRUE
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  updated_at = NOW();
