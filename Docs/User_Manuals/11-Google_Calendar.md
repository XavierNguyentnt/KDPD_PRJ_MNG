# 11. Google Calendar: Đồng bộ & Nhúng

Hệ thống hỗ trợ 2 nhu cầu liên quan Google Calendar:

- **Nhúng (Embed)**: hiển thị Google Calendar ngay trong màn hình “Lịch” của hệ thống.
- **Đồng bộ (Sync)**: đẩy các mốc công việc lên Google Calendar để theo dõi bằng lịch cá nhân.

## 1) Mở màn hình Lịch trong hệ thống

1. Vào **Dashboard**.
2. Trong khu vực danh sách công việc, chọn chế độ xem **Lịch**.
3. Ở màn hình Lịch:
   - Chọn **Tháng / Tuần / Ngày**.
   - Chọn **Theo hạn (Due)** hoặc **Ngày nhận (Received)** để đổi cách hiển thị công việc trên lịch.

## 2) Nhúng (Embed) Google Calendar vào hệ thống

Nhúng không cần đăng nhập Google trong hệ thống, chỉ cần một **liên kết nhúng (embed link)**.

### 2.1) Lấy liên kết nhúng từ Google Calendar

1. Mở Google Calendar trên web.
2. Ở cột trái, trong phần “My calendars”, chọn đúng lịch muốn nhúng.
3. Vào **Settings and sharing** của lịch đó.
4. Tìm mục **Integrate calendar**:
   - Sao chép **Embed code** (mã nhúng).
   - Lấy phần URL trong thuộc tính `src="..."` (đây là link nhúng).

Gợi ý:

- Link nhúng thường có dạng `https://calendar.google.com/calendar/embed?...`

### 2.2) Dán và lưu liên kết nhúng trong hệ thống

1. Ở màn hình **Lịch** của hệ thống, tìm khối **Google Calendar**.
2. Chọn tab **Nhúng**.
3. Dán liên kết nhúng vào ô nhập và bấm **Lưu**.
4. Nếu hợp lệ, lịch Google sẽ hiển thị ngay bên dưới dạng iframe.

Lưu ý:

- Liên kết nhúng được lưu theo **trình duyệt** (localStorage). Nếu đổi máy/trình duyệt hoặc xoá dữ liệu trình duyệt, bạn cần dán lại.
- Nếu lịch Google bị “trống”, kiểm tra quyền chia sẻ (lịch có thể đang để riêng tư).

## 3) Mở Google Calendar nhanh

Trong khối **Google Calendar**, tab **Mở** hỗ trợ:

- **Mở Google Calendar**: mở Google Calendar ở tab mới.
- **Mở đúng ngày đang chọn**: nếu bạn đang chọn một ngày trong lịch hệ thống, nút này sẽ mở đúng ngày đó trên Google Calendar.

## 4) Đồng bộ (Sync) công việc lên Google Calendar

Đồng bộ giúp tạo/sửa/xoá các sự kiện Google Calendar tương ứng với công việc được giao cho bạn.

### 4.1) Điều kiện để đồng bộ hoạt động

- Hệ thống phải được Admin cấu hình Google OAuth (nếu chưa, bạn sẽ không kết nối được).
- Bạn cần có tài khoản Google và đăng nhập trên màn hình ủy quyền của Google.

Nếu bấm “Kết nối Google Calendar” mà báo “Google Calendar chưa được cấu hình”, hãy liên hệ Admin.

### 4.2) Kết nối Google Calendar

1. Ở màn hình **Lịch** của hệ thống, mở khối **Google Calendar**.
2. Chọn tab **Đồng bộ**.
3. Bấm **Kết nối Google Calendar**.
4. Trình duyệt chuyển sang trang Google để cấp quyền. Chọn tài khoản Google và bấm cho phép.
5. Sau khi thành công, hệ thống quay lại và hiển thị trạng thái **Đã kết nối**.

### 4.3) Bật/tắt tự động đồng bộ

1. Trong tab **Đồng bộ**, tại dòng **Đã kết nối**, bật công tắc để bật **đồng bộ tự động**.
2. Nếu tắt công tắc, hệ thống sẽ không đồng bộ khi bạn bấm “Đồng bộ”.

### 4.4) Chọn lịch đích (calendarId)

Trong tab **Đồng bộ** có trường:

- **Lịch đích (calendarId)**: mặc định `primary`.

Gợi ý tìm Calendar ID (khi bạn muốn đồng bộ vào một lịch khác):

1. Mở Google Calendar.
2. Vào **Settings and sharing** của lịch cần đồng bộ.
3. Trong **Integrate calendar**, copy **Calendar ID** và dán vào hệ thống, rồi bấm **Lưu**.

### 4.5) Đồng bộ ngay (thủ công)

1. Đảm bảo đã **kết nối** và đã **bật tự động đồng bộ**.
2. Bấm **Đồng bộ**.
3. Hệ thống thực hiện đồng bộ và có thể hiển thị thông báo kết quả.

Lưu ý về dữ liệu được đồng bộ:

- Mỗi công việc có thể sinh sự kiện “all-day” theo **ngày hạn** của phần việc được giao.
- Nếu một phần việc không có ngày hạn, hệ thống có thể bỏ qua khi đồng bộ.

### 4.6) Dọn trùng (Cleanup)

Nếu bạn thấy sự kiện bị trùng (do đồng bộ nhiều lần/khác lịch), dùng nút:

- **Dọn**: hệ thống sẽ quét và xoá các sự kiện trùng, đồng thời làm sạch liên kết cũ.

### 4.7) Ngắt kết nối

- Bấm **Ngắt kết nối** để:
  - Xoá liên kết Google Calendar khỏi tài khoản hệ thống.
  - Gỡ các sự kiện Google Calendar do hệ thống tạo (theo cơ chế dọn liên kết).

## 5) Tạo sự kiện Google Calendar từ một công việc (mở nhanh)

Trong màn hình Lịch của hệ thống, ở danh sách công việc theo ngày, có nút **mở Google Calendar** (biểu tượng mở tab mới).

- Khi bấm, trình duyệt mở Google Calendar kèm thông tin sự kiện gợi ý (tiêu đề, mô tả).
- Bạn có thể chỉnh sửa và lưu sự kiện trên Google Calendar (đây là thao tác thủ công, khác với đồng bộ).

