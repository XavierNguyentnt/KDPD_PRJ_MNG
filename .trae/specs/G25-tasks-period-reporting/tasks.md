# G25 Tasks — Chuẩn hóa Báo cáo Công việc theo Kỳ

Mỗi task map vào ít nhất 1 Acceptance Criterion của spec.md.
Các task được sắp xếp theo thứ tự phụ thuộc: Helper utility → Type definitions → Filter logic → UI Controls → Export integration → Test & Verification.

---

## Task 1: Tạo helper utility shared cho Period Calculation & Overlap Logic
**File sẽ chỉnh sửa:**
- `client/src/lib/utils.ts` (hoặc tạo file mới `client/src/lib/task-period.ts` nếu utils.ts quá dài)

**Mô tả công việc:**
1. Tạo `export type ReportPeriodType = "all" | "month" | "quarter" | "year"`
2. Tạo `export type ReportPeriodValue = string` (định dạng: "all", "YYYY-MM" cho month, "YYYY-QN" cho quarter, "YYYY" cho year)
3. Tạo hàm **`getReportPeriodBounds(periodType, periodValue): { start: Date; end: Date; label: string }`**
   - Trả về start (Date, 00:00 local) và end (Date, 23:59:59 local của ngày cuối kỳ)
   - Example: `("month", "2026-09")` → `{ start: 2026-09-01 00:00, end: 2026-09-30 23:59:59, label: "Tháng 09/2026" }`
   - `("quarter", "2026-Q3")` → Q3 = tháng 7-9 → start: 2026-07-01, end: 2026-09-30
   - `("year", "2026")` → start: 2026-01-01, end: 2026-12-31
   - `("all", "all")` → `{ start: new Date(0), end: new Date(8640000000000000), label: "Tất cả" }` (min/max date an toàn)
4. Tạo hàm **`isTaskInReportPeriod(task, periodStart, periodEnd): boolean`**
   - Input: `task` là TaskWithAssignmentDetails (hoặc any object có `receivedAt`, `actualCompletedAt`, `status`, `createdAt`)
   - Bước 1: Xác định Task Start Date:
     - Ưu tiên `parseToLocalDate(task.receivedAt)` (dùng helper parseToLocalDate đã có trong utils.ts line 59)
     - Nếu null → fallback `parseToLocalDate(task.createdAt)`
     - Nếu vẫn null → trả về true (không đủ dữ liệu, giữ lại công việc để không mất dữ liệu)
   - Bước 2: Xác định Task Completion Date & trạng thái hoàn thành:
     - `completedDate = parseToLocalDate(task.actualCompletedAt)`
     - `isCompleted = completedDate != null || String(task.status || "").trim() === "Completed"`
   - Bước 3: Áp dụng logic overlap (phù hợp FR-02, AC-R02→R06):
     ```typescript
     const taskStartLtePeriodEnd: boolean = (taskStart == null) || (taskStart <= periodEnd_dateOnly);
     const taskEndGtePeriodStart: boolean = (!isCompleted) || (completedDate == null) || (completedDate >= periodStart_dateOnly);
     return taskStartLtePeriodEnd && taskEndGtePeriodStart;
     ```
   - QUAN TRỌNG: Tất cả so sánh phải dùng **date-only local** (sử dụng parseToLocalDate → so sánh theo `[y,m,d]` tuple hoặc timestamp của 00:00 local) để tránh lỗi timezone làm dịch ngày cuối tháng.
5. Tạo hàm helper **`generatePeriodOptions(tasks, currentDate): { months: PeriodOption[]; quarters: PeriodOption[]; years: PeriodOption[] }`**
   - Quét toàn bộ tasks để tìm min year (từ receivedAt sớm nhất / createdAt sớm nhất) và max year (đến actualCompletedAt muộn nhất / năm hiện tại + 1)
   - Tạo danh sách các lựa chọn cho selects UI
   - Mỗi PeriodOption = `{ value: string; label: string }`
6. Tạo hàm **`buildExportPeriodSuffix(periodType, periodValue): string`**
   - Trả về suffix cho filename Excel: ví dụ "Thang09_2026", "Quy3_2026", "Nam2026", "" (khi all)

**Task-local Test Requirements:**
- TR-R01 (rule): Unit test `getReportPeriodBounds("month", "2026-09")` trả về start=Sep 1 và end=Sep 30 (cùng năm).
- TR-R02 (rule): Unit test `getReportPeriodBounds("quarter", "2026-Q3")` → start=Jul 1, end=Sep 30.
- TR-R03 (rule): Unit test AC-R02 case (T09 task A): receivedAt=2026-09-05, actualCompletedAt=2026-09-20 → true.
- TR-R04 (rule): Unit test AC-R05 case span 2 kỳ task C (25/09→05/10): T09=true, T10=true, T11=false.
- TR-R05 (rule): Unit test AC-R06 case task E (01/08→15/08, kỳ T09): false.
- TR-R06 (rule): Unit test AC-R13 timezone-safe case: actualCompletedAt = timestamp equivalent to `2026-09-30T23:30:00+07:00` (GMT+7), kỳ T09 → isTaskInReportPeriod = true.
- TR-R07 (rubric): Mức độ DRY = 2 nếu helper được viết gọn < 200 lines total, không duplicate logic giữa các helper. 1 nếu dễ hiểu nhưng hơi dài 300 lines. 0 nếu khó hiểu / có logic duplicate.

**Phụ thuộc:** Không có (task gốc, đầu tiên)

**Priority:** High

**Status:** pending

---

## Task 2: Mở rộng TaskFilterState và cập nhật applyTaskFilters()
**File sẽ chỉnh sửa:**
- `client/src/components/task-filters.tsx`

**Mô tả công việc:**
1. Thêm 2 field mới vào interface `TaskFilterState`:
   ```typescript
   periodType: ReportPeriodType;   // "all" | "month" | "quarter" | "year"
   periodValue: ReportPeriodValue; // "all", "2026-09", "2026-Q3", "2026"
   ```
2. Cập nhật `DEFAULT_FILTERS`:
   - `periodType: "all"`
   - `periodValue: "all"`
3. Cập nhật function `getDefaultTaskFilters()` trả về 2 field mới.
4. Cập nhật function `applyTaskFilters(tasks, filters, works)`:
   - **SAU KHI** áp dụng tất cả filter cũ (staff, status, year...) và **TRƯỚC KHI** return `list`:
   - Nếu `filters.periodType !== "all"`:
     - Gọi `const { start, end } = getReportPeriodBounds(filters.periodType, filters.periodValue)`
     - Gọi `list = list.filter(t => isTaskInReportPeriod(t, start, end))`
   - (Optional optimization): Thêm reference comment // AC-R02→R06, FR-02 tại đây để dễ trace
5. Cập nhật `activeFilterCount` (dòng 227-238):
   - Tăng count lên 1 nếu `periodType !== "all" && periodValue !== "all"`

**Task-local Test Requirements:**
- TR-R08 (rule): `getDefaultTaskFilters().periodType === "all"` và `.periodValue === "all"`.
- TR-R09 (rule): Với filters `{ periodType:"month", periodValue:"2026-09" }`, applyTaskFilters trên 10 tasks mẫu (5 thuộc T09, 5 không) → trả về đúng 5.
- TR-R10 (rule): AC-R12 backward compatibility: Với period=all → `applyTaskFilters` result === (kết quả của bản cũ trước khi merge, cùng input) về mặt count.
- TR-R11 (rule): AC-R15 kết hợp AND: period=T09 + status=Completed → chỉ trả về task T09-có-status-Completed.

**Phụ thuộc:** Task 1 (helper functions phải tồn tại).

**Priority:** High

**Status:** pending

---

## Task 3: Thêm Period Filter UI Controls vào TaskFilters component
**File sẽ chỉnh sửa:**
- `client/src/components/task-filters.tsx`

**Mô tả công việc:**
1. Import các helper từ Task 1 vào component.
2. Tạo options cho selects (dùng helper `generatePeriodOptions(tasks, new Date())`):
   - Cần nhận `tasks` (toàn bộ tasks chưa filter) làm prop mới **HOẶC** nhận `periodOptions` làm prop (tốt hơn: pass periodOptions từ page cha để tránh tính toán lại nhiều lần).
3. Sửa props `TaskFiltersProps` thêm 1 trong 2:
   - **Tốt nhất (zero-blast-radius, inject qua prop)**: Thêm `periodOptions?: { months: PeriodOption[]; quarters: PeriodOption[]; years: PeriodOption[] }` làm optional prop; nếu không có thì tự compute từ tasks list (nếu tasks cũng không có thì fallback = chỉ năm hiện tại).
4. Tạo 2 control UI mới (đặt trong cùng `flex-wrap` row với StatusControl, StaffControl):
   - **PeriodType Select**: "Loại kỳ" với 4 options:
     - `all` → "Tất cả"
     - `month` → "Tháng"
     - `quarter` → "Quý"
     - `year` → "Năm"
   - **PeriodValue Select**: "Kỳ" → nội dung options thay đổi động theo periodType:
     - periodType="all": 1 option "Tất cả kỳ"
     - periodType="month": hiển thị months options (Tháng 01/2026, ...)
     - periodType="quarter": hiển thị quarters options (Quý I/2026, ...)
     - periodType="year": hiển thị years options (Năm 2025, ...)
   - **Tương tác:** Khi thay đổi periodType → tự động reset periodValue = giá trị mặc định hợp lý (kỳ gần nhất, ví dụ tháng hiện tại, quý hiện tại, năm hiện tại).
5. Style các selects giống hệt StatusControl (đồng bộ class `w-full sm:w-[170px] h-9 bg-background`, font size...).
6. Thêm periodType/periodValue vào "Clear filters" button (dòng 646): khi xoá lọc → set period = all/all.
7. Đảm bảo trên mobile: các controls tự wrap thành nhiều hàng (đã có `flex-col sm:flex-row sm:flex-wrap` ở root).

**Task-local Test Requirements:**
- TR-R12 (rule - AC-R01): Screenshot cv-chung.tsx page với 2 selects mới "Loại kỳ" và "Kỳ" hiển thị cùng hàng với Status / Staff.
- TR-R13 (rule): Chọn Loại kỳ = "Quý" → Kỳ select hiển thị options "Quý I/2026"... "Quý IV/2026" (không còn option tháng).
- TR-R14 (rule): Chọn Loại kỳ = "Tất cả" → Kỳ select disabled HOẶC chỉ có 1 option "Tất cả kỳ".
- TR-R15 (rubric AC-U01-Workflow): Đồng bộ UI = 2 nếu tất cả controls period có style giống hệt StatusControl (cùng kích thước, cùng spacing, cùng font). 1 nếu khác nhỏ về spacing. 0 nếu style khác hẳn.

**Phụ thuộc:** Task 2.

**Priority:** High

**Status:** pending

---

## Task 4: Bổ sung Archived View Toggle + Badges thống kê
**File sẽ chỉnh sửa:**
- `client/src/components/task-filters.tsx` (hoặc tạo prop nhận `includeArchived` từ page cha)
- Hoặc `client/src/hooks/use-task-list-controls.ts` (nếu file này quản lý state filter)

**Mô tả công việc:**
1. **Lưu ý quan trọng**: Hiện tại `useTasks({ includeArchived })` ở cấp độ React Query hook đã hỗ trợ `includeArchived`. Ta không đổi API mà thêm UI-level toggle:
2. Thêm 1 control dạng ToggleGroup hoặc 3 badges clickable (tương tự badges thống kê theo yêu cầu project_memory):
   - Badge 1: "Đang hoạt động" → mặc định active = tasks không phải Archived, và (actualCompletedAt nằm trong kỳ đang xem HOẶC chưa hoàn thành)
   - Badge 2: "Đã lưu trữ" → tasks có status="Archived" HOẶC (actualCompletedAt < periodStart và period ≠ all)
   - Badge 3: "Tất cả" → gộp cả 2 nhóm trên
   - Visual active state = `ring-2 ring-primary/30` (theo project_memory rule)
3. Badges có vai trò clickable filter toggle. Nhấn badge → cuộn (scroll) tự động xuống khu vực bảng dữ liệu.
4. Add `role="button"`, `tabIndex={0}`, handler Enter/Space cho accessibility (theo project_memory rule).
5. Updated `applyTaskFilters` hoặc thêm logic bên ngoài để lọc theo archived view. Logic phân loại "UI-level archived" (KHÔNG write DB):
   - UI condition = `isTaskStatusArchived(status) || (period !== "all" && actualCompletedAt != null && completedDate < periodStart)`

**Task-local Test Requirements:**
- TR-R16 (rule - AC-R11): Toggle "Đã lưu trữ" OFF → task E (completed Aug 15, xem kỳ T09) không hiển thị. Toggle ON → hiển thị.
- TR-R17 (rule): Click badge "Tất cả" → active state xuất hiện (ring-2), `scrollIntoView` bảng dữ liệu được trigger (có thể kiểm tra bằng console log hoặc manual test).
- TR-R18 (rule): Accessibility: archived badge element có `role="button"` và `tabIndex={0}`.

**Phụ thuộc:** Task 3.

**Priority:** Medium

**Status:** pending

---

## Task 5: Integrate Period Filter vào TẤT CẢ các trang nghiệp vụ
**File sẽ chỉnh sửa:**
- `client/src/pages/cv-chung.tsx`
- `client/src/pages/bien-tap.tsx`
- `client/src/pages/cntt.tsx`
- `client/src/pages/thiet-ke.tsx`
- `client/src/pages/thu-ky-hop-phan.tsx` (4 tabs: Tasks / Works / Contracts — chỉ các tab có TaskTable)
- `client/src/pages/admin-dashboard.tsx` (tab Tổng quan)
- `client/src/pages/dashboard.tsx`
- `client/src/pages/team.tsx`

**Mô tả công việc cho mỗi trang:**
1. Tính `periodOptions` từ tasks list (gọi helper `generatePeriodOptions(tasks_data, new Date())`)
2. Pass `periodOptions={...}` làm prop mới cho `<TaskFilters>` component
3. Đảm bảo các trang quản lý state filter đúng cách (nếu dùng `useState<TaskFilterState>` → phải bao gồm 2 field mới)
4. Kiểm tra logic `const filteredTasks = applyTaskFilters(tasks, filters, works)` vẫn đúng (type-safe)
5. Các trang dùng `use-task-list-controls.ts` hook → cập nhật hook đó trước để state filter bao gồm 2 field mới

**Task-local Test Requirements:**
- TR-R19 (rule - AC-U01-Workflow fidelity): Đếm số trang có period filter UI = chính xác 8 trang (nếu team.tsx không dùng TaskTable thì 7 vẫn chấp nhận được, cần ghi note).
- TR-R20 (rule): Mỗi trang, chọn kỳ T09/2026 → filteredTasks count thay đổi phù hợp (không còn hiển thị công việc hoàn thành trước T09 khi toggle "Đang hoạt động").
- TR-R21 (rubric): Zero page-specific logic = 2 nếu tất cả 8 trang chỉ thêm prop periodOptions ≤ 10 lines thay đổi mỗi trang. 1 nếu 1 trang phải custom nhiều. 0 nếu có trang tự build period filter khác.

**Phụ thuộc:** Task 3 + Task 4.

**Priority:** High

**Status:** pending

---

## Task 6: Đồng bộ Period vào Export Excel Filename & Data
**File sẽ chỉnh sửa:**
- `client/src/lib/utils.ts` (function `exportTasksToWorkbook` và `buildExportPrefix`)
- Tất cả các trang trigger export Excel (để pass period info vào fileNameSuffix)

**Mô tả công việc:**
1. Cập nhật `buildExportPrefix()` hoặc tạo wrapper `buildExportPrefixWithPeriod(periodType, periodValue)`:
   - Ví dụ: current prefix = `KDPD_CongViec_20260925` (date today)
   - New suffix when period active: `KDPD_CongViec_Thang09_2026_20260925.xlsx`
   - Dùng helper `buildExportPeriodSuffix` từ Task 1.
2. Đảm bảo **100% callsite exportTasksToWorkbook** truyền đúng `filteredTasks` (đã qua period filter) → điều này đúng theo kiến trúc hiện tại vì filteredTasks luôn được tạo trước rồi mới pass vào export function. Nhưng cần double-check từng trang (thu-ky-hop-phan.tsx có 4 chỗ export, lines 1725/1919/2052/2168).
3. Tùy chọn: Thêm 1 row header comment / summary vào Excel ghi rõ "Báo cáo kỳ: Tháng 09/2026" (tối ưu UX người đọc báo cáo offline).

**Task-local Test Requirements:**
- TR-R22 (rule - AC-R09): Chọn kỳ=T09/2026, bảng có N=5 dòng → click Export → mở file Excel = exactly 5 rows data, filename có pattern `*Thang09_2026*.xlsx`.
- TR-R23 (rule): Khi period=all → filename không chứa Tháng/Quy/Năm (giữ nguyên hành vi cũ).

**Phụ thuộc:** Task 5.

**Priority:** High

**Status:** pending

---

## Task 7: Cập nhật hook use-task-list-controls.ts (nếu cần)
**File sẽ chỉnh sửa:**
- `client/src/hooks/use-task-list-controls.ts`
- Các hook liên quan: `use-thu-ky-tasks-tab.ts`

**Mô tả công việc:**
1. Nếu hook này khởi tạo default filter state → đảm bảo bao gồm 2 field mới `periodType="all"` và `periodValue="all"`.
2. Nếu hook này export `clearFilters()` → cập nhật để reset period về all/all.

**Task-local Test Requirements:**
- TR-R24 (rule): Clear filters action trả period về all/all.
- TR-R25 (rule): TypeScript compile check (tsc --noEmit) = 0 error type.

**Phụ thuộc:** Task 2.

**Priority:** Medium

**Status:** pending

---

## Task 8: Viết Test Cases (Unit / Manual Verification)
**File tạo mới (nếu phù hợp):**
- Không tự tạo file test nếu project không có thư mục tests.
- Thay vào đó, ghi rõ Test Cases trong Completion Evidence của mỗi task và thực hiện manual test + build check.

**Mô tả công việc:**
1. Thực thi tất cả các test case bắt buộc từ tài liệu gốc (Section XVI, dòng 294-312):
   | STT | Bắt đầu | Hoàn thành | Kỳ báo cáo | Kết quả mong |
   |---|---|---|---|---|
   | 1 | 05/09 | 20/09 | T09 | Có |
   | 2 | 20/08 | 10/09 | T09 | Có |
   | 3 | 25/09 | 05/10 | T09 | Có |
   | 4 | 25/09 | 05/10 | T10 | Có |
   | 5 | 25/09 | 05/10 | T11 | Không |
   | 6 | 01/08 | chưa | T09 | Có |
   | 7 | 01/08 | chưa | T10 | Có |
   | 8 | 01/08 | 15/08 | T09 | Không |
   | 9 | 01/06 | 05/07 | Q3 | Có |
   | 10 | 01/05 | 15/06 | Q3 | Không |
2. Chạy `npm run build` và ghi nhận kết quả.
3. Chạy `npx tsc --noEmit` và ghi nhận kết quả.
4. Optional: Run Lighthouse audit cho trang cv-chung.tsx nếu có thể.

**Task-local Test Requirements:**
- TR-R26 (rule - AC-U02-Build): `npm run build` completed with exit code 0.
- TR-R27 (rule): `npx tsc --noEmit` exit code 0 (strict mode).
- TR-R28 (rule): 10/10 test cases bảng trên passed all.
- TR-R29 (rubric AC-U03): Build delta JS = 2 nếu Δ ≤ 2%. 1 nếu Δ 2-5%. 0 nếu > 5%.

**Phụ thuộc:** Tất cả tasks 1→7 phải completed.

**Priority:** High

**Status:** pending

---

## Task 9: Verification Gate & Tài liệu hóa thay đổi
**Output:**
- Ghi clear "Completion Evidence" (bằng tiếng Việt) cho mỗi task.
- Tổng hợp thành file **KẾT QUẢ THAY ĐỔI.md** (theo Yêu cầu mục XVIII):
  1. Tóm tắt thay đổi (Frontend, Backend, Database, Excel, Archived)
  2. Danh sách FILE đã chỉnh sửa (absolute paths)
  3. Giải thích logic lọc công việc bằng ví dụ
  4. Báo cáo vấn đề còn tồn tại (nếu có)
  5. Kết quả test/build

**Task-local Test Requirements:**
- TR-R30 (rule): Document được tạo và chứa chính xác 5 mục trên.

**Phụ thuộc:** Task 8.

**Priority:** Medium

**Status:** pending

---

## Tổng quan Dependency Graph
```
Task 1 (Helpers) ──┐
                    ▼
Task 7 (Hook) ────► Task 2 (Filter State + Logic)
                           │
                           ▼
                     Task 3 (UI Controls) ────► Task 4 (Archived Toggle)
                                                   │
                                                   ▼
                                             Task 5 (Page Integrations)
                                                   │
                                                   ▼
                                             Task 6 (Excel Export Sync)
                                                   │
                                                   ▼
                                             Task 8 (Test Cases + Build)
                                                   │
                                                   ▼
                                             Task 9 (Documentation)
```
