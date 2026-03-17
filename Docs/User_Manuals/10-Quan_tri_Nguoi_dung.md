# 10. Quản trị người dùng (Admin)

Trang **Quản lý người dùng** chỉ dành cho tài khoản có quyền **Admin**. Tại đây Admin có thể:

- Tạo người dùng mới.
- Cập nhật thông tin người dùng (họ tên hiển thị, phòng ban…).
- Gán **Vai trò (Roles)** và **Nhóm nhân sự (Groups)**.
- Đổi mật khẩu cho người dùng.
- Kích hoạt/vô hiệu hoá tài khoản.
- Gán **Tên Hợp phần** cho vai trò “Thư ký hợp phần” (nếu áp dụng).

## 1) Truy cập trang

1. Đăng nhập bằng tài khoản Admin.
2. Trên menu trái, bấm **Quản lý người dùng**.

## 2) Danh sách người dùng

Trong danh sách, bạn thường thấy:

- Email, Họ tên hiển thị, Phòng ban
- Vai trò (Roles)
- Nhóm nhân sự (Groups)
- Trạng thái kích hoạt (Active/Inactive)
- Các thao tác nhanh (Sửa, Đổi mật khẩu…)

## 3) Thêm người dùng mới

1. Bấm **Thêm người dùng**.
2. Điền thông tin:
   - **Email** (bắt buộc)
   - **Họ tên hiển thị** (bắt buộc)
   - (Tuỳ chọn) First name / Last name / Phòng ban
   - **Vai trò (nhiều)**: chọn 1 hoặc nhiều role phù hợp
   - **Nhóm nhân sự (nhiều)**: chọn 1 hoặc nhiều group phù hợp
3. Trường hợp gán vai trò **Thư ký hợp phần**:
   - Chọn thêm **Tên Hợp phần** (có thể nhiều) để giới hạn phạm vi dữ liệu Thư ký làm việc.
4. Bấm **Tạo người dùng** để lưu vào DB.

## 4) Sửa thông tin người dùng

1. Trong danh sách, bấm **Sửa** tại người dùng cần cập nhật.
2. Cập nhật các trường mong muốn:
   - Họ tên hiển thị, phòng ban, trạng thái kích hoạt
   - Vai trò / nhóm nhân sự
   - (Nếu có) Tên Hợp phần cho vai trò Thư ký hợp phần
3. Bấm **Lưu vào DB** để ghi thay đổi.

## 5) Đổi mật khẩu cho người dùng

1. Chọn **Đổi mật khẩu** ở dòng người dùng.
2. Nhập:
   - **Mật khẩu mới** (tối thiểu 6 ký tự)
   - Xác nhận mật khẩu mới
3. Bấm **Lưu mật khẩu**.

## 6) Vô hiệu hoá / kích hoạt tài khoản

- Trong phần chỉnh sửa người dùng, bật/tắt trạng thái **isActive** (kích hoạt).
- Khi bị vô hiệu hoá, người dùng có thể không đăng nhập được hoặc bị hạn chế truy cập tuỳ cấu hình hệ thống.

