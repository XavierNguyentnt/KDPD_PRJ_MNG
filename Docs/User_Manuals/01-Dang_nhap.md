# 01. Đăng nhập / Đăng xuất

## 1) Truy cập hệ thống

- Mở trình duyệt và truy cập địa chỉ hệ thống do Admin cung cấp (mặc định môi trường dev: `http://localhost:5000`).
- Màn hình **Đăng nhập** hiển thị 2 trường:
  - **Email**
  - **Mật khẩu**

## 2) Đăng nhập

1. Nhập **Email** tài khoản.
2. Nhập **Mật khẩu**.
3. Bấm **Đăng nhập**.
4. Nếu hợp lệ, hệ thống chuyển vào **Dashboard**.

## 3) Đăng xuất

1. Ở góc trên bên phải, bấm vào khu vực **Avatar / Tên người dùng**.
2. Chọn **Đăng xuất**.

## 4) Lỗi thường gặp và cách xử lý

### 4.1) Sai email hoặc mật khẩu

- Dấu hiệu: hiển thị thông báo lỗi ngay trên form đăng nhập.
- Cách xử lý:
  - Kiểm tra lại email (không thừa khoảng trắng).
  - Thử gõ lại mật khẩu (lưu ý in hoa/thường).
  - Nếu quên mật khẩu: liên hệ Admin để được cấp lại.

### 4.2) Không thấy menu theo nhóm (Biên tập/Thiết kế/CNTT/Thư ký hợp phần)

- Nguyên nhân: tài khoản chưa được gán **Group** hoặc **Role** tương ứng.
- Cách xử lý: liên hệ Admin để kiểm tra mục **Quản lý người dùng** và gán quyền.

### 4.3) Trang “Thư ký hợp phần” báo “Chưa được gán hợp phần”

- Nguyên nhân: tài khoản “Thư ký hợp phần” chưa được gán **Hợp phần** (component) phụ trách.
- Cách xử lý: liên hệ Admin để gán hợp phần trong trang **Quản lý người dùng**.

