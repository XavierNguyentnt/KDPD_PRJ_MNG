# Hướng dẫn Sao lưu và Chuyển Database PostgreSQL (kdpd_db)
## Máy chủ Ubuntu (SSH/tmux) ↔ Máy tính Windows

---

## 📋 Mục lục tra cứu nhanh

1. [Thông tin kết nối DB](#1-thông-tin-kết-nối-db)
2. [Xem file .env từ dòng lệnh](#2-xem-file-env-từ-dòng-lệnh)
3. [Kiểm tra & sửa lỗi ký tự .env (CRLF)](#3-kiểm-tra--sửa-lỗi-ký-tự-env-crlf)
4. [Sao lưu DB trên máy chủ Ubuntu](#4-sao-lưu-db-trên-máy-chủ-ubuntu)
5. [Restore DB từ backup](#5-restore-db-từ-backup)
6. [Backup tự động hàng đêm (Cron)](#6-backup-tự-động-hàng-đêm-cron)
7. [Sao chép backup từ Ubuntu → Windows](#7-sao-chép-backup-từ-ubuntu--windows)
8. [Kiểm tra file backup & troubleshooting](#8-kiểm-tra-file-backup--troubleshooting)
9. [Lệnh tắt (cheatsheet)](#9-lệnh-tắt-cheatsheet)

---

## 1) Thông tin kết nối DB

Đã xác minh trên máy chủ:

| Trường | Giá trị (Production) | Giá trị (Local dev) |
|---|---|---|
| Tên Database | `kdpd_db` | `kdpd_db` |
| Username | `kdpd_user` | `kdpd_user` |
| Host | `localhost` | `localhost` |
| Port | **`5432`** | `5433` |
| Connection string (full) | `postgresql://kdpd_user:CHANGEME_STRONG_PASSWORD@localhost:5432/kdpd_db` | Xem `.env` |

> **Lưu ý quan trọng:** Port trên server là `5432`, trên máy local là `5433`. Đừng nhầm lẫn khi restore giữa 2 môi trường.

---

## 2) Xem file .env từ dòng lệnh

Tất cả lệnh chạy **TRONG tmux/SSH** và thư mục project:

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
```

| Mục đích | Lệnh |
|---|---|
| Xem nhanh toàn bộ | `cat .env` |
| Xem có đánh số dòng | `cat -n .env` |
| Chỉ xem DATABASE_URL | `grep -E '^DATABASE_URL=' .env` |
| **Kiểm tra ký tự ẩn (CRLF `^M`)** | `cat -A .env \| head -10` |
| Xem bằng trình duyệt (cuộn được) | `less .env` (thoát = `q`) |
| Xem bằng editor (không lưu) | `nano .env` (thoát = `Ctrl+X` → `N`) |

**Cách ẩn mật khẩu khi xem (không lộ khi share màn hình):**

```bash
sed 's/:[^:]*@/:*****@/; s/=.*SECRET.*/=**HIDDEN**/; s/=.*PASSWORD.*/=**HIDDEN**/' .env
```

---

## 3) Kiểm tra & sửa lỗi ký tự .env (CRLF)

### 3.1 Phát hiện lỗi

Nếu `cat -A .env` thấy `^M$` ở cuối mỗi dòng → file bị xuống dòng kiểu Windows (CRLF), sẽ gây lỗi khi parse `DATABASE_URL`.

**Triệu chứng điển hình:**
```
FATAL: database "kdpd_db⏎" does not exist
```
(Tên DB bị dính ký tự xuống dòng hoặc khoảng trắng thừa.)

### 3.2 Khắc phục

```bash
# Chuyển CRLF → LF (an toàn, chạy nhiều lần không sao)
sed -i 's/\r$//' .env

# Xác nhận đã sửa (chỉ còn $ cuối dòng, không còn ^M$)
cat -A .env | head -5
```

### 3.3 Lấy DATABASE_URL "sạch" trong script

Dùng đoạn này để luôn có URL chuẩn (bất kể .env có CRLF hay không):

```bash
DB_URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '\r\n ')

# Kiểm tra debug
echo "DB_URL = [$DB_URL]"
# Phải thấy URL nằm gọn trong [ ] không có xuống dòng / khoảng trắng.
```

---

## 4) Sao lưu DB trên máy chủ Ubuntu

> Chạy **TRONG tmux/SSH** ở thư mục `~/Task-Project/KDPD_PRJ_MNG`

### 4.0 Chuẩn bị (một lần)

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
mkdir -p backups
DB_URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '\r\n ')
```

### 4.1 Test kết nối (luôn chạy trước khi backup)

```bash
psql "$DB_URL" -c "SELECT current_database() AS db, current_user AS usr, now();"
```

Nếu báo `database "kdpd_db" does not exist` → xem [Mục 4.4](#44-tạo-lại-db-nếu-bị-mất).

### 4.2 Backup dạng plain SQL (đọc được bằng text editor)

```bash
pg_dump "$DB_URL" \
  -F p \
  --no-owner --no-acl \
  --encoding=UTF8 \
  -f "backups/kdpd_db_$(date +%F_%H%M).sql"
```

- Kích thước file: thường lớn (chưa nén).
- Phù hợp khi cần mở xem nội dung hoặc chạy restore cho DB khác loại.

### 4.3 Backup dạng custom (NÉN) — ✅ KHUYẾN NGHỊ

```bash
pg_dump "$DB_URL" \
  -F c \
  --no-owner --no-acl \
  -f "backups/kdpd_db_$(date +%F_%H%M).dump"
```

- Kích thước: nhỏ hơn 5-10 lần so với `.sql`.
- Restore nhanh hơn (dùng `pg_restore`), hỗ trợ chọn lọc bảng restore.

### 4.4 Tạo lại DB nếu bị mất

Nếu `psql` báo DB không tồn tại:

```bash
# (Cần quyền sudo hoặc user postgres)
sudo -u postgres psql -c "CREATE USER IF NOT EXISTS kdpd_user WITH PASSWORD 'CHANGEME_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE kdpd_db OWNER kdpd_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE kdpd_db TO kdpd_user;"

# Kiểm tra
sudo -u postgres psql -c "\l" | grep kdpd
```

Sau đó restore dữ liệu từ backup cũ (Mục 5).

### 4.5 Xem danh sách file backup đã tạo

```bash
ls -lh backups/
# Xem file mới nhất:
ls -t backups/ | head -1
# In full path file mới nhất (dễ copy-paste sang lệnh khác):
realpath backups/$(ls -t backups/ | head -1)
```

---

## 5) Restore DB từ backup

### 5.1 Restore từ file `.sql` (plain)

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
DB_URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '\r\n ')

# 1) Ngắt mọi kết nối đang dùng DB
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='kdpd_db' AND pid <> pg_backend_pid();"

# 2) Xóa DB cũ + tạo lại sạch
sudo -u postgres psql -c "DROP DATABASE IF EXISTS kdpd_db;"
sudo -u postgres psql -c "CREATE DATABASE kdpd_db OWNER kdpd_user;"

# 3) Restore (log ra file để kiểm tra lỗi)
psql "$DB_URL" -f "backups/<TEN_FILE>.sql" 2>&1 | tee restore.log

# 4) Kiểm tra
tail -n 30 restore.log
```

### 5.2 Restore từ file `.dump` (custom)

**Cách A: Restore thẳng vào `kdpd_db` (DB phải sạch):**

```bash
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='kdpd_db' AND pid <> pg_backend_pid();"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS kdpd_db;"
sudo -u postgres psql -c "CREATE DATABASE kdpd_db OWNER kdpd_user;"

pg_restore -U kdpd_user -h localhost -p 5432 \
  -d kdpd_db --no-owner --no-acl \
  "backups/<TEN_FILE>.dump"
```

**Cách B: Restore vào DB tạm (để kiểm tra, không ghi đè DB đang chạy):**

```bash
createdb -U kdpd_user -h localhost -p 5432 kdpd_db_restore_test

pg_restore -U kdpd_user -h localhost -p 5432 \
  -d kdpd_db_restore_test --no-owner --no-acl \
  "backups/<TEN_FILE>.dump"

# Kiểm tra số bản ghi:
psql -U kdpd_user -h localhost -p 5432 -d kdpd_db_restore_test \
  -c "SELECT count(*) FROM users; SELECT count(*) FROM tasks;"
```

### 5.3 Kiểm tra sau restore

```bash
psql "$DB_URL" -c "\dt public.*"                         # Liệt kê bảng
psql "$DB_URL" -c "SELECT count(*) FROM users;"           # Số user
psql "$DB_URL" -c "SELECT count(*) FROM tasks;"           # Số công việc
psql "$DB_URL" -c "SELECT max(updated_at) FROM tasks;"    # Thời gian cập nhật gần nhất
```

---

## 6) Backup tự động hàng đêm (Cron)

### 6.1 Tạo script backup

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
mkdir -p scripts backups

cat > scripts/backup_db.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

DB_URL="$(grep -E '^DATABASE_URL=' "$PROJECT_DIR/.env" | cut -d= -f2- | tr -d '\r\n ')"

OUTFILE="$BACKUP_DIR/kdpd_db_$(date +%F_%H%M).dump"

pg_dump "$DB_URL" -F c --no-owner --no-acl -f "$OUTFILE"

# Xóa backup cũ hơn 14 NGÀY (tùy chỉnh số ngày ở dưới)
find "$BACKUP_DIR" -type f -name 'kdpd_db_*.dump' -mtime +14 -delete

echo "[$(date '+%F %T')] OK  $OUTFILE  ($(du -h "$OUTFILE" | cut -f1))" >> "$LOG_FILE"
EOF

chmod +x scripts/backup_db.sh
```

### 6.2 Test script chạy thủ công

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
./scripts/backup_db.sh
echo "--- Kết quả ---"
ls -lh backups/
tail -n 5 backups/backup.log
```

### 6.3 Đăng ký Cron (ví dụ chạy mỗi 01:30 sáng)

```bash
crontab -e
```

Thêm dòng sau vào cuối file (chỉnh đường dẫn cho đúng trên máy của bạn):

```cron
30 1 * * * /home/kdpd-project/Task-Project/KDPD_PRJ_MNG/scripts/backup_db.sh
```

### 6.4 Một số lịch trình phổ biến (chỉnh dòng cron)

| Lịch | Dòng cron |
|---|---|
| Hàng ngày 01:30 sáng | `30 1 * * *` |
| Hàng ngày 22:00 tối | `0 22 * * *` |
| Mỗi 6 tiếng / lần | `0 */6 * * *` |
| Hàng giờ (test nhanh) | `0 * * * *` |
| Thứ 2,4,6 lúc 23:00 | `0 23 * * 1,3,5` |

### 6.5 Quản lý Cron

```bash
crontab -l                          # Xem cron đang đăng ký
crontab -r                          # XÓA HẾT cron (cẩn thận)
tail -f ~/Task-Project/KDPD_PRJ_MNG/backups/backup.log   # Xem log backup
```

---

## 7) Sao chép backup từ Ubuntu → Windows

> Phần này chạy lệnh **TRÊN MÁY WINDOWS** (PowerShell / CMD mới), KHÔNG phải trong tmux/SSH.

### 7.0 Chuẩn bị: Lấy đường dẫn file backup mới nhất

Chạy **TRONG tmux/SSH** trước, để lấy full path file backup:

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
realpath backups/$(ls -t backups/ | head -1)
# Kết quả ví dụ:
# /home/kdpd-project/Task-Project/KDPD_PRJ_MNG/backups/kdpd_db_2026-09-22_1530.dump
```

Lấy IP máy chủ (cũng trong tmux/SSH):

```bash
# IP LAN (thường dùng cho mạng nội bộ)
hostname -I | awk '{print $1}'

# Hoặc IP public (nếu server datacenter/VPS)
curl -s ifconfig.me
```

### 7.1 Cách 1: `scp` trên PowerShell — ✅ DỄ NHẤT, KHÔNG CÀI GÌ THÊM

#### Sao chép 1 file:

```powershell
# Form:
# scp <user_linux>@<IP_SERVER>:</path/file/ubuntu>  "D:\path\luu\windows"

# Ví dụ thực tế (thay <IP_SERVER> và tên file backup cho đúng):
scp kdpd-project@<IP_SERVER>:/home/kdpd-project/Task-Project/KDPD_PRJ_MNG/backups/kdpd_db_2026-09-22_1530.dump  "D:\Vincent\DEV\KDPD_PRJ_MNG\attached_assets\"
```

#### Sao chép TOÀN BỘ thư mục backups (tất cả file):

```powershell
scp -r kdpd-project@<IP_SERVER>:/home/kdpd-project/Task-Project/KDPD_PRJ_MNG/backups  "D:\Vincent\DEV\KDPD_PRJ_MNG\attached_assets\server_backups"
```

#### Nếu dùng SSH key thay vì mật khẩu:

```powershell
scp -i "C:\Users\Admin\.ssh\id_rsa"  kdpd-project@<IP_SERVER>:/path/file  "D:\path\luu\"
```

### 7.2 Cách 2: `sftp` (tương tác, không nhớ lệnh nhiều)

```powershell
sftp kdpd-project@<IP_SERVER>
```

Sau khi vào prompt `sftp>`:

```sftp
cd /home/kdpd-project/Task-Project/KDPD_PRJ_MNG/backups
ls -lh                              # Xem file trên server

lcd "D:\Vincent\DEV\KDPD_PRJ_MNG\attached_assets"    # Đích trên Windows

# Tải 1 file
get kdpd_db_2026-09-22_1530.dump

# Hoặc tải tất cả file .dump
mget *.dump

# Thoát
quit
```

### 7.3 Cách 3: `rsync` (nhanh hơn cho file lớn & sync lần sau)

Yêu cầu: Windows có **Git Bash** / **WSL** hoặc cài `rsync`.

```bash
# Toàn bộ thư mục (chỉ sync phần thay đổi lần sau)
rsync -avzP kdpd-project@<IP_SERVER>:/home/kdpd-project/Task-Project/KDPD_PRJ_MNG/backups/  "D:/Vincent/DEV/KDPD_PRJ_MNG/attached_assets/server_backups/"
```

Tham số: `-a` giữ thuộc tính, `-v` chi tiết, `-z` nén truyền, `-P` thanh tiến trình + resume bị ngắt.

### 7.4 Cách 4: WinSCP (giao diện kéo thả)

1. Tải WinSCP miễn phí: https://winscp.net/
2. Điền thông tin kết nối:
   - **Protocol:** SFTP
   - **Host name:** `<IP_SERVER>`
   - **Port:** `22`
   - **User name:** `kdpd-project`
   - **Password:** mật khẩu SSH user này
3. Đăng nhập → **kéo thả** file từ cửa sổ phải (Linux) sang cửa sổ trái (Windows).

---

## 8) Kiểm tra file backup & Troubleshooting

### 8.1 Kiểm tra file .dump trên Windows sau khi chuyển

Nếu máy Windows đã có PostgreSQL client tools (`pg_restore`):

```powershell
# List các bảng trong file backup (không restore, chỉ xem)
pg_restore -l "D:\Vincent\DEV\KDPD_PRJ_MNG\attached_assets\kdpd_db_xxxxx.dump" | head -n 50

# Kiểm tra file không bị hỏng (tính checksum)
Get-FileHash "D:\Vincent\DEV\KDPD_PRJ_MNG\attached_assets\kdpd_db_xxxxx.dump" -Algorithm SHA256
```

(Trên Linux cũng tính SHA256 tương ứng rồi đối chiếu xem file truyền đi có đúng không.)

### 8.2 Lỗi thường gặp

| Lỗi / Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `database "kdpd_db\r" does not exist` | .env có CRLF (ký tự `^M`) | `sed -i 's/\r$//' .env` (Mục 3.2) |
| `Permission denied` khi `pg_dump` | User DB không có quyền SELECT | Đăng nhập `postgres` và `GRANT SELECT ON ALL TABLES IN SCHEMA public TO kdpd_user;` |
| `scp: Connection timed out` | Firewall chặn port 22 hoặc sai IP | Kiểm tra `sudo ufw allow 22` trên server, kiểm tra IP đúng |
| `pg_dump: server version mismatch` | pg_dump cũ hơn PostgreSQL server | Cài PostgreSQL client 17 trên máy chạy lệnh |
| Cron chạy nhưng không có file | cron không load `.env` đúng đường dẫn | Trong script dùng `realpath` + trỏ tuyệt đối tới .env (như Mục 6.1 đã làm) |
| Backup .dump không mở được bằng notepad | Bình thường, `.dump` là binary nén | Dùng `pg_restore -l <file>` để xem danh sách bảng |

---

## 9) Lệnh tắt (Cheatsheet)

### 🐧 Trên Linux (tmux/SSH)

```bash
# Vào thư mục project
cd ~/Task-Project/KDPD_PRJ_MNG

# 1. Xem DATABASE_URL
grep -E '^DATABASE_URL=' .env

# 2. Backup ngay (custom nén)
mkdir -p backups
DB_URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '\r\n ')
pg_dump "$DB_URL" -F c --no-owner --no-acl -f "backups/kdpd_db_$(date +%F_%H%M).dump"

# 3. In ra full path file mới nhất để copy sang Windows
realpath backups/$(ls -t backups/ | head -1)
hostname -I | awk '{print $1}'
```

### 🪟 Trên Windows (PowerShell)

```powershell
# Sao chép file backup mới nhất (thay <IP_SERVER> và <TEN_FILE>)
scp kdpd-project@<IP_SERVER>:/home/kdpd-project/Task-Project/KDPD_PRJ_MNG/backups/<TEN_FILE>.dump  "D:\Vincent\DEV\KDPD_PRJ_MNG\attached_assets\"
```

### 🔄 Quy trình chuẩn đề xuất (hàng ngày / trước khi cập nhật code)

1. Vào SSH + thư mục project
2. `DB_URL=...` + `pg_dump ...` (backup trước)
3. `realpath backups/...` lấy đường dẫn file mới
4. Mở PowerShell trên Windows → `scp ...` chuyển file về
5. Xác nhận file đủ dung lượng → an toàn cập nhật code / thay đổi DB

---

*Tài liệu này tổng hợp từ hướng dẫn thực tế trên máy chủ production KDPD_PRJ_MNG. Mọi thắc mắc xem thêm các tài liệu gốc trong `Docs/DEPLOY.md`, `Docs/NEON_SETUP.md`.*
