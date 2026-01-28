-- Seed users từ contacts.csv
-- Mật khẩu mặc định: 123456 (bcrypt). department: Ban Thư ký. role, employee_group: NULL (điền sau).
--
-- LƯU Ý Neon: Nếu SQL Editor tự bật "Explain" / "Analyze", hãy TẮT để chỉ chạy INSERT.
-- Chạy từng khối (từ INSERT đến ;) nếu cần.

-- Hash bcrypt cho "123456" (dùng $pwd$...$pwd$ để giữ đúng ký tự $ đầu, tránh lỗi như $$...$$)
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
) VALUES
  ('anhtm@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Ánh Trần Minh', 'Ánh', 'Trần Minh', 'Ban Thư ký', NULL, NULL, TRUE),
  ('chauvm.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Châu Vũ Minh', 'Châu', 'Vũ Minh', 'Ban Thư ký', NULL, NULL, TRUE),
  ('nghiemdung.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Dung Nghiêm Thuỳ', 'Dung', 'Nghiêm Thuỳ', 'Ban Thư ký', NULL, NULL, TRUE),
  ('dungna.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Dung Ngô Ánh', 'Dung', 'Ngô Ánh', 'Ban Thư ký', NULL, NULL, TRUE),
  ('giangngtv.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Giang Nguyễn Thị Vân', 'Giang', 'Nguyễn Thị Vân', 'Ban Thư ký', NULL, NULL, TRUE),
  ('duongvanha.nhanvan@gmail.com', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Hà Dương Văn', 'Hà', 'Dương Văn', 'Ban Thư ký', NULL, NULL, TRUE),
  ('hadv@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Hà Dương Văn', 'Hà', 'Dương Văn', 'Ban Thư ký', NULL, NULL, TRUE),
  ('ngochant.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Hà Nguyễn Ngọc', 'Hà', 'Nguyễn Ngọc', 'Ban Thư ký', NULL, NULL, TRUE),
  ('hieuhn@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Hiếu Hoàng Ngọc', 'Hiếu', 'Hoàng Ngọc', 'Ban Thư ký', NULL, NULL, TRUE),
  ('hoailtm@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Hoài Lê Thị Minh', 'Hoài', 'Lê Thị Minh', 'Ban Thư ký', NULL, NULL, TRUE),
  ('hoangvq.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Hoàng Vũ Quốc', 'Hoàng', 'Vũ Quốc', 'Ban Thư ký', NULL, NULL, TRUE),
  ('vuhuongvtnt@gmail.com', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Hương Vũ Thị', 'Hương', 'Vũ Thị', 'Ban Thư ký', NULL, NULL, TRUE),
  ('tankhai283@gmail.com', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Khải Trần Tấn', 'Khải', 'Trần Tấn', 'Ban Thư ký', NULL, NULL, TRUE),
  ('linhntt.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Linh Nguyễn Thị Thuỳ', 'Linh', 'Nguyễn Thị Thuỳ', 'Ban Thư ký', NULL, NULL, TRUE),
  ('maint.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Mai Nghiêm Thị', 'Mai', 'Nghiêm Thị', 'Ban Thư ký', NULL, NULL, TRUE),
  ('ngatt.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Ngà Trần Thanh', 'Ngà', 'Trần Thanh', 'Ban Thư ký', NULL, NULL, TRUE),
  ('nguyendh.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Nguyên Dương Hương', 'Nguyên', 'Dương Hương', 'Ban Thư ký', NULL, NULL, TRUE),
  ('nhungkp.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Nhung Kiều Phương', 'Nhung', 'Kiều Phương', 'Ban Thư ký', NULL, NULL, TRUE),
  ('votuoanh.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Oanh Võ Thị Tú', 'Oanh', 'Võ Thị Tú', 'Ban Thư ký', NULL, NULL, TRUE),
  ('quyentt.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Quyến Trần Tất', 'Quyến', 'Trần Tất', 'Ban Thư ký', NULL, NULL, TRUE),
  ('sonld@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Sơn Lê Đình', 'Sơn', 'Lê Đình', 'Ban Thư ký', NULL, NULL, TRUE),
  ('thanhctk.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Thành Cung Thị Kim', 'Thành', 'Cung Thị Kim', 'Ban Thư ký', NULL, NULL, TRUE),
  ('thaodp.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Thảo Đào Phương', 'Thảo', 'Đào Phương', 'Ban Thư ký', NULL, NULL, TRUE),
  ('thinc@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Thi Nguyễn Cẩm', 'Thi', 'Nguyễn Cẩm', 'Ban Thư ký', NULL, NULL, TRUE),
  ('tienntt.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Tiên Nguyễn Thị Thuỷ', 'Tiên', 'Nguyễn Thị Thuỷ', 'Ban Thư ký', NULL, NULL, TRUE),
  ('trangnl.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Trang Nguyễn Linh', 'Trang', 'Nguyễn Linh', 'Ban Thư ký', NULL, NULL, TRUE),
  ('vinhnv.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Vinh Nguyễn Viết', 'Vinh', 'Nguyễn Viết', 'Ban Thư ký', NULL, NULL, TRUE),
  ('haiyenle.vtnt@vnu.edu.vn', $pwd$$2b$10$O4Jjv1nVbWcv16O3MHuvb.3QjaxAg/P6MqxsVXni4eWh05rq6ArlS$pwd$, 'Yến Lê Thị Hải', 'Yến', 'Lê Thị Hải', 'Ban Thư ký', NULL, NULL, TRUE)
ON CONFLICT (email) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  department = EXCLUDED.department,
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active;
