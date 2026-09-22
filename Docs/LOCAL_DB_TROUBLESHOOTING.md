# KDPD_LOCAL — Xử Lý Lỗi Database & Dev Server (Windows Local)

> Tài liệu tổng hợp các lỗi gặp phải ngày 2026-09-22 trên môi trường local: PostgreSQL 18 port 5433, Windows, DB `kdpd_db`, user `kdpd_user`. Áp dụng cho máy đã cài cả PostgreSQL 17 và 18 cùng lúc.

---

## 0. Môi trường chuẩn (kiểm tra trước khi khắc phục bất cứ lỗi nào)

| Thành phần | Giá trị chuẩn | Cách kiểm tra |
|---|---|---|
| **Server DB** | PostgreSQL **18.x** (port 5433) | `services.msc` → dịch vụ `postgresql-x64-18` chạy |
| **Công cụ pg_dump / psql** | Phiên bản ≥ **18.x** | `"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" --version` |
| **User DB chính** | `kdpd_user` | `psql -U postgres -c "\du"` |
| **Password cả 2 user** | `Tnti01092016@` | Nhớ sync cả `.env` và `pgpass.conf` |
| **DATABASE_URL trong .env** | `postgresql://kdpd_user:Tnti01092016@@localhost:5433/kdpd_db` | File `.env` ở repo root |
| **pg_hba.conf** | `scram-sha-256` (bảo mật, không để `trust` lâu dài) | `C:\Program Files\PostgreSQL\18\data\pg_hba.conf` |
| **pgpass.conf** | Có (tiện cho backup/restore) | `%APPDATA%\postgresql\pgpass.conf` |
| **Ownership bảng/sequence** | `kdpd_user` (không còn bảng nào owner là `postgres`) | Truy vấn tại mục 5 |

> ⚠️ **Quan trọng nhất:** File `.env` **KHÔNG** được có ký tự xuống dòng CRLF (^M). Nếu nghi ngờ, xem [DB_BACKUP_AND_TRANSFER.md](./DB_BACKUP_AND_TRANSFER.md).

---

## 1. Lỗi "server version mismatch" khi Backup bằng pgAdmin

### 1.1 Triệu chứng
```
pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 18.4; pg_dump version: 17.x
```
Xảy ra khi pgAdmin 4 tự dùng `pg_dump.exe` đi kèm (phiên bản cũ hơn server).

### 1.2 Cách khắc phục nhanh (GUI)
1. pgAdmin 4 → **File → Preferences** (`Ctrl+Alt+P`)
2. **Paths → Binary paths**
3. Mục **PostgreSQL 18** → trỏ **Binary Path** đến:
   ```
   C:\Program Files\PostgreSQL\18\bin
   ```
4. **Save** → Đóng pgAdmin → Mở lại.

### 1.3 Cách khắc phục bằng Command Line (khuyến nghị, đáng tin hơn)
Mở PowerShell và chạy:

```powershell
# Backup dạng Custom (nén gzip, file nhẹ hơn)
New-Item -ItemType Directory -Force -Path "D:\Vincent\DEV\KDPD_PRJ_MNG\backups" | Out-Null
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
  --host 127.0.0.1 --port 5433 --username kdpd_user --dbname kdpd_db `
  -F c --no-owner --no-acl --compress=6 `
  -f "D:\Vincent\DEV\KDPD_PRJ_MNG\backups\kdpd_db_local_$(Get-Date -Format 'yyyyMMdd_HHmm').dump"
```

Nếu không gõ password mỗi lần, xem mục **7. Tạo pgpass.conf** bên dưới.

---

## 2. Lỗi "password authentication failed for user kdpd_user"

### 2.1 Triệu chứng
```
error: password authentication failed for user "kdpd_user"
code: '28P01', file: 'auth.c'
```
Xuất hiện khi chạy `npm run dev` (pool kết nối của `node-postgres` không đăng nhập được).

### 2.2 Nguyên nhân thường gặp (sau khi kiểm tra)
1. Password trong `.env` là placeholder `CHANGEME_STRONG_PASSWORD` hoặc không khớp password trong PostgreSQL
2. Role `kdpd_user` bị tắt quyền `LOGIN` (`rolcanlogin = f`)
3. PostgreSQL 18 vừa restart (trở về `scram-sha-256` từ chế độ `trust` mà bạn chưa đổi password đúng)

### 2.3 Quy trình Reset Password hoàn chỉnh (3 bước)

#### Bước 1 — Tạm thời cho phép đăng nhập không cần mật khẩu (trust auth)
1. Mở file:
   ```
   C:\Program Files\PostgreSQL\18\data\pg_hba.conf
   ```
2. Thay **tất cả** các dòng `scram-sha-256` thành `trust` (6 dòng trong mối TYPE host/local):
   ```
   local   all             all                                     trust
   host    all             all             127.0.0.1/32            trust
   host    all             all             ::1/128                 trust
   local   replication     all                                     trust
   host    replication     all             127.0.0.1/32            trust
   host    replication     all             ::1/128                 trust
   ```
3. `services.msc` → dịch vụ **`postgresql-x64-18`** → **Restart**.

#### Bước 2 — Đổi password role + bật LOGIN + gán quyền
Mở PowerShell, chạy:

```powershell
# Dung mat khau chuan cua project: Tnti01092016@
$newPwd = "Tnti01092016@"
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# 2a. Doi password postgres superadmin
& $psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$newPwd';"

# 2b. Neu kdpd_user chua co LOGIN hoac chua ton tai
& $psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -c "ALTER ROLE kdpd_user WITH LOGIN PASSWORD '$newPwd' CREATEDB;"

# 2c. GRANT quyen tren database
& $psql -h 127.0.0.1 -p 5433 -U postgres -d kdpd_db -c "GRANT ALL PRIVILEGES ON DATABASE kdpd_db TO kdpd_user;"
```

#### Bước 3 — Khôi phục scram-sha-256 (bảo mật)
1. Mở lại `pg_hba.conf` → đổi toàn bộ `trust` thành `scram-sha-256` (ngược lại bước 1)
2. **Restart lại dịch vụ `postgresql-x64-18`** trong `services.msc`.
3. Kiểm tra đăng nhập lại bằng:
   ```powershell
   $env:PGPASSWORD="Tnti01092016@"
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5433 -U kdpd_user -d kdpd_db -c "SELECT current_user, 'DANG NHAP OK';"
   ```
4. **Cập nhật `.env`** dòng đầu tiên:
   ```
   DATABASE_URL=postgresql://kdpd_user:Tnti01092016@@localhost:5433/kdpd_db
   ```

---

## 3. Lỗi "must be owner of table notifications" (code 42501)

### 3.1 Triệu chứng
```
Failed to ensure notifications.is_important column (optional): error: must be owner of table notifications
code: '42501', file: 'aclchk.c'
```
Xuất hiện trong `server/db.ts` khi function `ensureDbExtensions()` cố gắng `ALTER TABLE ... ADD COLUMN` mà user `kdpd_user` không phải owner của bảng đó.

### 3.2 Nguyên nhân
Các bảng trong `public`, `neon_auth`, `pgrst` bị owner là `postgres` (do khôi phục DB bằng user `postgres` trước đó) mà app chạy bằng `kdpd_user` → không có quyền `ALTER`.

### 3.3 Cách sửa toàn diện (chuyển owner 1 lần cho tất cả)
Tạo file `fix_owners.sql` tạm trong `backups\` (để tránh PowerShell escape `$$`):

```sql
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename, schemaname FROM pg_tables
    WHERE schemaname IN ('public','neon_auth','pgrst') AND tableowner <> 'kdpd_user'
  LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) || ' OWNER TO kdpd_user';
  END LOOP;
END $$;

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT sequence_name, sequence_schema FROM information_schema.sequences
    WHERE sequence_schema IN ('public','neon_auth','pgrst')
  LOOP
    EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_schema) || '.' || quote_ident(r.sequence_name) || ' OWNER TO kdpd_user';
  END LOOP;
END $$;

GRANT ALL ON SCHEMA public, neon_auth, pgrst TO kdpd_user;
GRANT ALL ON ALL TABLES IN SCHEMA public, neon_auth, pgrst TO kdpd_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public, neon_auth, pgrst TO kdpd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public, neon_auth, pgrst GRANT ALL ON TABLES TO kdpd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public, neon_auth, pgrst GRANT ALL ON SEQUENCES TO kdpd_user;
```

Sau đó chạy lệnh PowerShell:
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5433 -U postgres -d kdpd_db `
  -f "D:\Vincent\DEV\KDPD_PRJ_MNG\backups\fix_owners.sql"
```

### 3.4 Kiểm tra lại (sau khi chạy)
```sql
SELECT count(*) AS so_bang_chua_owner_kdpd_user
FROM pg_tables
WHERE schemaname IN ('public','neon_auth','pgrst') AND tableowner <> 'kdpd_user';
```
→ Phải trả về **0** (tức không còn bảng nào owner sai).

---

## 4. Lỗi "EADDRINUSE: address already in use :::5000" khi chạy npm run dev

### 4.1 Triệu chứng
```
Error: listen EADDRINUSE: address already in use ::1:5000
```
Do process `node.exe` của lần chạy trước đó chưa bị kill (đặc biệt khi terminal bị crash hoặc Ctrl+C không truyền đúng).

### 4.2 Cách sửa
PowerShell:
```powershell
# Tim process dang giu port 5000
$conns = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$pids  = $conns.OwningProcess | Sort-Object -Unique
foreach ($p in $pids) {
    Get-Process -Id $p | Format-Table Id, ProcessName, Path
    Stop-Process -Id $p -Force
    Write-Host "Da kill PID $p"
}
Start-Sleep 2; Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue # Phai tra ve null
```

Nếu không kill được, mở **Task Manager** → tab **Details** → tìm `node.exe` → End Task thủ công.

---

## 5. Kiểm tra toàn diện hệ thống DB (trước mỗi lần chạy dev)

Copy toàn bộ đoạn này vào PowerShell để xác nhận mọi thứ ổn:

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
Write-Host "====================================================="
Write-Host "KDPD LOCAL - Health Check DB (PostgreSQL 18 :5433)"
Write-Host "====================================================="

Write-Host "`n1. Phien ban pg_dump (phai >= 18.x):"
& $psql --version
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" --version

Write-Host "`n2. Dang nhap kdpd_user (qua pgpass.conf) - phai OK:"
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
& $psql -h 127.0.0.1 -p 5433 -U kdpd_user -d kdpd_db -c "SELECT current_user, current_database();"

Write-Host "`n3. Dang nhap SAU mat khau kdpd_user - phai FAILED:"
$env:PGPASSWORD = "wrong_pass_xyz"
& $psql -h 127.0.0.1 -p 5433 -U kdpd_user -d kdpd_db -c "SELECT 1;" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Host "[LOI] SAI PASSWORD VAN DANG NHAP DUOC -> kiem tra pg_hba.conf (co the dang trust)" } else { Write-Host "[OK] SAI mat khau -> bi tu choi (scram-sha-256 hoat dong)" }
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host "`n4. Role kdpd_user LOGIN + CREATEDB:"
& $psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -c "SELECT rolname, rolcanlogin, rolcreatedb FROM pg_roles WHERE rolname='kdpd_user';"

Write-Host "`n5. So bang co owner <> kdpd_user (phai = 0):"
& $psql -h 127.0.0.1 -p 5433 -U postgres -d kdpd_db -c "SELECT count(*) AS so_bang_sai_owner FROM pg_tables WHERE schemaname IN ('public','neon_auth','pgrst') AND tableowner <> 'kdpd_user';"

Write-Host "`n6. pg_hba.conf METHOD hien tai (phai thay scram-sha-256 nhieu, it trust):"
Get-Content "C:\Program Files\PostgreSQL\18\data\pg_hba.conf" | Select-String -Pattern "^host|^local" | Select-Object -First 10

Write-Host "`n7. DATABASE_URL trong .env (kiem tra manual password) :"
Get-Content "D:\Vincent\DEV\KDPD_PRJ_MNG\.env" | Select-Object -First 3

Write-Host "====================================================="
Write-Host "Health Check Done."
Write-Host "====================================================="
```

---

## 6. Chuỗi thao tác chuẩn "Start buổi làm việc"

> Mỗi khi ngồi vào máy làm việc, chạy đúng trình tự này để tránh bug:

1. ✅ **Mở services.msc** → Xác nhận 2 dịch vụ chạy:
   - `postgresql-x64-17` (tạm thời không cần, server 18 mới là local)
   - `postgresql-x64-18` → Status **Running**
2. ✅ Chạy **Health Check** ở mục 5 trên. Nếu có điểm nào không qua → xử lý theo mục tương ứng.
3. ✅ **Mở Terminal PowerShell** → cd vào project:
   ```powershell
   cd D:\Vincent\DEV\KDPD_PRJ_MNG
   npm run dev
   ```
4. ✅ Đợi thấy dòng `serving on port 5000` rồi mới mở trình duyệt: [http://localhost:5000/](http://localhost:5000/)
5. ✅ Nếu cần backup DB: dùng lệnh Command Line ở mục **1.3** (không dùng pgAdmin GUI để tránh version mismatch).

---

## 7. Tạo pgpass.conf (1 lần, để không gõ password mỗi lần)

Mở PowerShell chạy:
```powershell
$pgDir = "$env:APPDATA\postgresql"
New-Item -ItemType Directory -Force -Path $pgDir | Out-Null
$pgpass = Join-Path $pgDir "pgpass.conf"
@"
# KDPD_PRJ_MNG - PostgreSQL 18 local port 5433
localhost:5433:kdpd_db:kdpd_user:Tnti01092016@
127.0.0.1:5433:kdpd_db:kdpd_user:Tnti01092016@
::1:5433:kdpd_db:kdpd_user:Tnti01092016@
localhost:5433:postgres:postgres:Tnti01092016@
127.0.0.1:5433:postgres:postgres:Tnti01092016@
::1:5433:postgres:postgres:Tnti01092016@
localhost:5433:kdpd_db:postgres:Tnti01092016@
127.0.0.1:5433:kdpd_db:postgres:Tnti01092016@
"@ | Set-Content -Path $pgpass -Encoding ASCII -Force
Write-Host "✅ Da tao: $pgpass"
```
> Định dạng mỗi dòng: `host:port:database:username:password`

---

## 8. Khi đổi mật khẩu DB (lưu ý 4 nơi phải sync cùng lúc)

Nếu sau này bạn đổi password `Tnti01092016@` thành mật khẩu khác, phải cập nhật **đồng loạt 4 file/vị trí sau**:

| # | Vị trí | Cập nhật |
|---|---|---|
| 1 | PostgreSQL Role (`kdpd_user`) | `ALTER ROLE kdpd_user WITH PASSWORD '<mới>'` |
| 2 | PostgreSQL Role (`postgres`) | `ALTER USER postgres WITH PASSWORD '<mới>'` |
| 3 | `.env` trong project | `DATABASE_URL=postgresql://kdpd_user:<mới>@localhost:5433/kdpd_db` |
| 4 | `pgpass.conf` | Tất cả các dòng kết thúc bằng `:<mới>` |

Nếu quên 1 trong 4 → lập tức gặp lỗi `28P01 password authentication failed`.

---

## 9. Tài liệu liên quan

- [DB_BACKUP_AND_TRANSFER.md](./DB_BACKUP_AND_TRANSFER.md) — Backup trên server Ubuntu, scp sang Windows, cron tự động.
- [DEPLOY.md](./DEPLOY.md) — Mục 8: cấu hình deploy production.
- [NEON_SETUP.md](./NEON_SETUP.md) — Mục 7: Neon DB và DATABASE_URL mẫu.
- [QUICK_SETUP.md](./QUICK_SETUP.md) — Các bước dựng môi trường lần đầu.

---
_Document version 1.0 | Cập nhật 2026-09-22 | Tương thích PostgreSQL 18.x / Windows 11 / Node 24_
