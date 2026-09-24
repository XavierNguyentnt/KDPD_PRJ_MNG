# G25: Chuẩn hóa Báo cáo & Xem danh sách Công việc theo Kỳ (Tháng / Quý / Năm)

## Problem Statement (Vấn đề)

Hiện tại hệ thống KDPD chỉ hỗ trợ lọc công việc theo:

**Điều này không đáp ứng yêu cầu nghiệp vụ báo cáo thực tế:**

## Users & Goals (Đối tượng & Mục tiêu)

| Đối tượng             | Mục tiêu                                                       |
| --------------------- | -------------------------------------------------------------- |
| Quản trị viên (Admin) | Xem báo cáo tổng thể toàn hệ thống theo kỳ; xuất báo cáo Excel |
| Trưởng nhóm (Manager) | Xem báo cáo công việc của nhóm theo tháng/quý/năm              |
| Nhân sự (Employee)    | Xem lại công việc của bản thân trong kỳ báo cáo quá khứ        |
| Thư ký hợp phần       | Báo cáo theo dõi công việc hợp phần theo kỳ                    |

## Non-Goals (Phạm vi không làm)

***

## Functional Requirements (Yêu cầu chức năng)

### FR-01: Bộ lọc kỳ báo cáo (Period Filter UI)

### FR-02: Logic xác định công việc thuộc kỳ báo cáo (Overlap Principle)

Mỗi công việc có khoảng thời gian thực hiện:

Một công việc **thuộc kỳ báo cáo** \[periodStart, periodEnd] KHI VÀ CHỈ KHI:

```
(TaskStartDate <= periodEnd)
AND
(
  (Công việc chưa hoàn thành)   // NOT (actualCompletedAt != null OR status === "Completed")
  OR
  (TaskCompletionDate >= periodStart)
)
```

Giải thích các trường hợp thực tế (theo Yêu cầu I→IV của tài liệu):

| Trường hợp                                  | Task Start | Task Complete | Kỳ báo cáo  | Kết quả                                                                                                                                           |
| ------------------------------------------- | ---------- | ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1: Phát sinh & hoàn thành trong kỳ          | 05/09/2026 | 20/09/2026    | T09/2026    | CÓ                                                                                                                                                |
| 2: Phát sinh trước, chưa hoàn thành         | 20/07/2026 | (chưa)        | T09/2026    | CÓ                                                                                                                                                |
| 3: Phát sinh trước, hoàn thành trong kỳ     | 20/08/2026 | 10/09/2026    | T09/2026    | CÓ                                                                                                                                                |
| 4a: Bắt đầu trong kỳ, hoàn thành sau kỳ     | 25/09/2026 | 05/10/2026    | T09/2026    | KHÔNG (Nếu tại thời điểm xem đã hoàn thành thì chỉ xuất hiện ở kỳ hoàn thành \[giống 4b], nếu chưa hoàn thành thì giống trường hợp số 2, và số 6) |
| 4b: Cùng task trên, hoàn thành trong kỳ sau | 25/09/2026 | 05/10/2026    | T10/2026    | CÓ                                                                                                                                                |
| 4c: Cùng task trên, sau khi hoàn thành      | 25/09/2026 | 05/10/2026    | T11/2026    | KHÔNG                                                                                                                                             |
| 5: Hoàn thành hoàn toàn trước kỳ            | 01/08/2026 | 15/08/2026    | T09/2026    | KHÔNG                                                                                                                                             |
| 6: Chưa hoàn thành, kéo dài nhiều kỳ        | 01/08/2026 | (chưa)        | T09/T10/T11 | CÓ HẾT                                                                                                                                           |

### FR-02.1: Hai chế độ xem báo cáo (2 Modes) & Mặc định mới (Cập nhật 25/09/2026)

| Tên chế độ | Mã mode | Mặc định | Giải thích |
|---|---|---|---|
| Theo kỳ thực hiện (Overlap) | `overlap` | ✅ **MẶC ĐỊNH** | Cách tính cũ: công việc span 2 kỳ (vd 25/09 → 05/10) xuất hiện CẢ T09 và T10 (giống 7 case bảng trên). Ưu tiên audit báo cáo không đổi theo thời gian + đánh giá phân bổ công sức |
| Theo kỳ hoàn thành (Completion) | `completion` | Tùy chọn | Cách tính mới ghi ở cột Kết quả TH4a: công việc **đã hoàn thành** → xuất hiện DUY NHẤT 1 lần ở kỳ có `actualCompletedAt` (vd 25/09 → 05/10, đã xong → KHÔNG ở T09, CHỈ CÓ ở T10). Công việc **chưa hoàn thành** → giống overlap (xuất hiện mọi kỳ start ≤ PE cho đến khi xong). Ưu tiên đánh giá hiệu quả cá nhân, đúng tiến độ / chậm tiến độ |

> **Giải trình 4a (cột Kết quả)**: Mô tả trong bảng trên (4a KHÔNG ở T09 khi đã hoàn thành) chính xác là hành vi của chế độ **Theo kỳ hoàn thành (completion)**. Chế độ mặc định overlap vẫn cho phép công việc xuất hiện ở T09 (đảm bảo đánh giá công sức người làm đã đầu tư thời gian vào tháng 09). Người dùng tự do chuyển đổi 2 chế độ bất cứ lúc nào qua Toggle UI.

### FR-02.2: Mặc định kỳ và Bộ lọc tương lai
- **Mặc định lần đầu vào app**: Loại kỳ = `Tháng` (`periodType = "month"`), Kỳ cụ thể = `Tháng hiện tại` (tính từ `new Date()` ở client, format `YYYY-MM0`). Người dùng có thể đổi loại/kỳ bất cứ lúc nào.
- **Bộ chọn kỳ KHÔNG chứa các kỳ TƯƠNG LAI**: Các kỳ (tháng / quý / năm) nào có ngày kết thúc `bounds.end > today` sẽ bị lọc bỏ khỏi `PeriodOptionsBundle`. Chỉ xem được từ quá khứ đến ngày hiện tại.

### FR-03: Không báo cáo lại công việc đã hoàn thành (No Post-Completion Leak)

### FR-04: Không trùng lặp công việc trong cùng kỳ (No Duplicate)

### FR-05: Cơ chế thống nhất cho Tháng / Quý / Năm

### FR-06: Khả năng xem báo cáo lịch sử (Historical Reporting)

### FR-07: Archived (Lưu trữ)

### FR-08: Export Excel (.XLSX) dùng chung logic dữ liệu

### FR-09: Xử lý trường hợp biên (Edge Cases)

***

## Non-Functional Requirements (Yêu cầu phi chức năng)

### NFR-01: Một nguồn logic duy nhất (Single Source of Truth)

### NFR-02: Tương thích ngược (Backward Compatibility)

### NFR-03: Hiệu suất và Build Delta

### NFR-04: Thiết kế UI nhất quán

***

## Constraints & Assumptions (Ràng buộc & Giả định)

### Constraints (Bắt buộc)

### Assumptions (Giả định được chấp nhận)

***

## Acceptance Criteria (Tiêu chí chấp nhận)

### AC Rules (Nhị phân - Đúng/Sai)

**AC-R01 — Period Filter UI tồn tại và hoạt động**

**AC-R02 — Logic Trường hợp 1 (phát sinh + hoàn thành trong kỳ)**

**AC-R03 — Logic Trường hợp 2 (phát sinh trước, chưa hoàn thành)**

**AC-R04 — Logic Trường hợp 3 (phát sinh trước, hoàn thành trong kỳ)**

**AC-R05 — Logic Trường hợp 4 (span 2 kỳ)**

**AC-R06 — Logic Trường hợp 5 (hoàn thành trước kỳ)**

**AC-R07 — Không duplicate trong cùng kỳ**

**AC-R08 — Quý và Năm dùng cùng logic Tháng**

**AC-R09 — Export Excel đồng bộ dữ liệu màn hình**

**AC-R10 — Xem báo cáo lịch sử tháng 05/2026**

**AC-R11 — Archived View toggle hoạt động**

**AC-R12 — Backward Compatibility: period="Tất cả" = hành vi cũ**

**AC-R13 — Timezone-safe (không bị shift ngày cuối tháng)**

**AC-R14 — Không thay đổi DB Schema**

**AC-R15 — Các filter cũ kết hợp AND với period filter**

***

### AC Rubrics (Chất lượng - Đánh giá thang điểm)

**AC-U01 — Workflow Fidelity (0-2) → Threshold ≥ 2**

**AC-U02 — Single Source of Truth (0-2) → Threshold ≥ 2**

**AC-U03 — Build & Lint Pass (0-2) → Threshold ≥ 2**

***

## Open Questions (Câu hỏi mở — Đã giải quyết dựa trên codebase)
