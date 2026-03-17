# 04. Biên tập

Trang **Biên tập** dùng để quản lý công việc biên tập theo workflow (BTV 1 → BTV 2 → Người đọc duyệt) và theo dõi tiến độ theo từng tác phẩm.

## 1) Truy cập trang

- Trên menu trái, bấm **Biên tập** (chỉ hiện khi tài khoản có quyền nhóm Biên tập hoặc là Admin/Manager).

## 2) Tab “Công việc biên tập”

### 2.1) Thao tác nhanh

- **Bao gồm lưu trữ**: bật/tắt để xem cả công việc đã lưu trữ.
- **Tạo mới** (Admin/Manager): tạo công việc biên tập mới.
- **Tìm kiếm**: tìm theo tiêu đề/mô tả/nhân sự/tác phẩm/hợp phần (tuỳ dữ liệu).
- **Chuyển chế độ xem**: Bảng / Kanban.
- **Xuất Excel**: tải danh sách theo bộ lọc hiện tại.

### 2.2) Bộ lọc (Filter)

Ngoài các bộ lọc cơ bản, Biên tập thường dùng:

- **Nhân sự**: lọc theo người được giao trong các giai đoạn (BTV 1/BTV 2/Đọc duyệt).
- **Hợp phần** và **Giai đoạn**: dựa trên “tác phẩm/tài liệu dịch thuật” được liên kết.
- **Trạng thái**: Not Started/In Progress/Completed/Pending/Cancelled.
- **Năm nhận việc**: lọc theo năm của ngày nhận việc.
- **Đánh giá**: lọc theo đánh giá (nếu công việc có trường đánh giá).
- **Loại bông (Round type)**: lọc theo loại bông của workflow (ví dụ: Tiền biên tập, Bông thô, Bông 1…).
- **Từ ngày / Đến ngày**: lọc theo **ngày hạn**.

### 2.3) Sắp xếp (Sort)

- Ở chế độ **Bảng**, bấm tiêu đề cột để sắp xếp.
- Với công việc Biên tập, cột “Nhân sự” có thể hiển thị theo từng giai đoạn (BTV 1/BTV 2/Đọc duyệt) kèm trạng thái stage.

## 3) Tạo công việc biên tập (Admin/Manager)

1. Bấm **Tạo mới**.
2. Chọn/nhập thông tin cơ bản:
   - **Tiêu đề**
   - **Nhóm (Group)**: “Biên tập”
3. Liên kết **Tài liệu dịch thuật (tác phẩm)**:
   - Chọn **Tên tài liệu dịch thuật**.
   - Hệ thống hiển thị **Hợp phần**, **Giai đoạn** (chỉ đọc).
   - Nếu có dữ liệu hợp đồng hiệu đính gắn với tác phẩm, hệ thống có thể hiển thị **Số trang tài liệu cần biên tập** (chỉ đọc).
4. Thiết lập workflow Biên tập:
   - Chọn **Loại bông (Round type)** theo quy ước.
   - Gán nhân sự cho các stage: **BTV 1**, **BTV 2**, **Người đọc duyệt**.
   - Nhập các mốc thời gian theo stage (tuỳ cấu hình):
     - Ngày nhận
     - Ngày dự kiến
     - Ngày hoàn thành
     - Trạng thái stage
     - Lý do tạm dừng/hủy (nếu có)
5. Bấm **Tạo/Cập nhật** để lưu.

## 4) Cập nhật tiến độ/hoàn thành theo giai đoạn

Trong cửa sổ chi tiết công việc:

- Mỗi stage (BTV 1/BTV 2/Đọc duyệt) có trạng thái riêng.
- Thao tác thường gặp:
  - Khi bắt đầu làm: chuyển stage sang **Đang tiến hành**.
  - Khi hoàn tất: nhập **Ngày hoàn thành**, chuyển stage sang **Hoàn thành**.
  - Khi tạm dừng: chuyển stage sang **Tạm dừng** và nhập lý do (nếu có).

Lưu ý: quyền sửa có thể giới hạn theo vai trò và/hoặc theo nhân sự được gán.

## 5) Tab “Theo dõi tiến độ theo tác phẩm”

Tab này gom nhóm công việc theo **tác phẩm** để theo dõi bức tranh tổng thể.

Các thao tác thường có:

- **Tìm kiếm** theo tên tác phẩm.
- **Lọc** theo hợp phần/giai đoạn, mức tiến độ, đánh giá, nhân sự…
- **Phân trang** để xem danh sách tác phẩm theo trang.
- Bấm **Xem** để mở chi tiết các vòng (round) và tiến độ từng vòng cho một tác phẩm.

## 6) Xuất Excel

- Bấm **Xuất Excel** ở tab “Công việc biên tập” để tải danh sách theo bộ lọc.

