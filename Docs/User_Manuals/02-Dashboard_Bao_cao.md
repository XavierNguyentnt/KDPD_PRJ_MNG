# 02. Dashboard & Báo cáo

Dashboard là trang tổng quan giúp bạn:

- Xem nhanh tình hình công việc (thống kê theo trạng thái/nhóm).
- Lọc nhanh theo **nhóm**, **năm nhận việc**, **trạng thái**, **nhân sự**.
- Chuyển chế độ hiển thị **Bảng / Kanban / Lịch**.

## 1) Điều hướng và các nút chung

- **Menu trái**: Dashboard, Công việc chung, Biên tập, Thiết kế, CNTT, Thư ký hợp phần (nếu có), Nhóm, Quản lý người dùng (Admin).
- **Thanh trên** (góc phải):
  - **Ngôn ngữ**: chọn Tiếng Việt / English.
  - **Giao diện**: Sáng (Light) / Tối (Dark).
  - **Chuông thông báo**: số lượng thông báo chưa đọc.
  - **Tài khoản**: xem thông tin/đổi mật khẩu, đăng xuất.

## 2) Khu vực tổng quan (báo cáo nhanh)

Dashboard hiển thị các khối thống kê và biểu đồ:

- **Badge thống kê** (có thể bấm): Tổng công việc, Hoàn thành, Đang tiến hành, Quá hạn, Không hoàn thành…
- **Thống kê theo trạng thái**: hiển thị theo nhóm trạng thái (Not Started/In Progress/Completed/Pending/Cancelled).
- **Thống kê theo nhóm**: tổng hợp số lượng theo Group.
- **Xu hướng theo thời gian**: chọn khoảng thời gian (Ngày/Tuần/Tháng/Quý/Năm) để xem xu hướng.

### Lọc bằng badge (lọc “báo cáo”)

- Bấm vào một **badge** để lọc danh sách công việc theo badge đó.
- Bấm lại badge đang chọn để **bỏ lọc**.

Ví dụ:

- Bấm badge “Quá hạn” để xem nhanh các công việc đang In Progress nhưng đã quá hạn.
- Bấm badge “Không hoàn thành” để xem các công việc bị đánh giá “Không hoàn thành”.

## 3) Danh sách công việc (Task List)

### 3.1) Các bộ lọc nhanh

Trong khối danh sách công việc, bạn có thể dùng:

- **Tìm kiếm**: nhập từ khóa để tìm theo tiêu đề, mô tả, người thực hiện, nhóm.
- **Nhóm (Group)**: chọn nhóm cụ thể hoặc “Tất cả”.
- **Năm nhận việc**: lọc theo năm của ngày “nhận việc” (nếu có dữ liệu).
- **Trạng thái (Status)**: Not Started/In Progress/Completed/Pending/Cancelled.
- **Lọc theo nhân sự**: bấm badge nhân sự để lọc theo tên người thực hiện (có thể chọn nhiều).
- **Bao gồm lưu trữ**: bật/tắt để có bao gồm các công việc đã lưu trữ.

### 3.2) Chuyển chế độ xem

- **Bảng**: hiển thị dạng bảng có cột; phù hợp sắp xếp theo cột.
- **Bảng Kanban**: kéo thả theo cột trạng thái (tuỳ thiết kế từng nhóm; nếu có).
- **Lịch**: xem công việc theo lịch (dựa trên ngày hạn/đầu mốc thời gian).

### 3.3) Sắp xếp

Ở chế độ **Bảng**, bấm vào **tiêu đề cột** để sắp xếp tăng/giảm.

Một số cột thường dùng:

- Ngày nhận việc, Ngày hạn, Ngày hoàn thành
- Trạng thái, Ưu tiên, Tiến độ
- Tiêu đề, Nhóm, Người thực hiện

### 3.4) Mở chi tiết công việc

- Bấm vào một dòng/công việc để mở **cửa sổ chi tiết**.
- Trong cửa sổ chi tiết, tuỳ quyền mà bạn có thể:
  - Xem thông tin
  - Chỉnh sửa
  - Cập nhật tiến độ/ngày hoàn thành (theo phân quyền)

### 3.5) Tạo công việc mới (Admin/Manager)

- Bấm **Tạo mới** để mở form tạo công việc.
- Điền thông tin và lưu.

## 4) Gợi ý sử dụng để xem báo cáo nhanh

- Muốn xem “tổng quan theo nhóm”: dùng badge “Theo nhóm” và lọc “Nhóm”.
- Muốn xem “tiến độ theo nhân sự”: dùng badge nhân sự (Filter by staff) và kết hợp status = In Progress.
- Muốn rà soát công việc quá hạn: lọc status = In Progress và bấm badge “Quá hạn” (nếu có).
- Muốn chỉ xem công việc “không hoàn thành”: lọc theo badge “Không hoàn thành” hoặc theo bộ lọc “Đánh giá” ở từng trang nhóm.

