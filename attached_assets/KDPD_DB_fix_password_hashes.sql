-- Sửa password_hash bị thiếu ký tự $ đầu (do seed dùng $$...$$ trong PostgreSQL).
-- Chạy một lần trên Neon SQL Editor sau khi đã có users từ seed cũ.
-- Chỉ sửa các dòng có hash bắt đầu bằng "2b$10$" (chưa có $ đầu).

UPDATE users
SET password_hash = '$' || password_hash
WHERE password_hash LIKE '2b$10$%' AND password_hash NOT LIKE '$2b$%';
