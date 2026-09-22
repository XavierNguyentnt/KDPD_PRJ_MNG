---
name: kdpd-db-backup-transfer
description: Huong dan sao luu, restore va chuyen file backup PostgreSQL kdpd_db tu may chu Ubuntu (SSH/tmux) sang Windows. Su dung khi user yeu cau backup DB, restore DB, chuyen file backup sang Windows, dat lich cron backup, xem hoac sua loi .env (ky tu CRLF). Khong dung cho MySQL hoac cac database khac.
---

# KDPD — Sao lưu & Chuyển Database (Ubuntu ↔ Windows)

Skill này dành riêng cho project KDPD_PRJ_MNG, DB PostgreSQL `kdpd_db`, user `kdpd_user`.

## 1. Hồi âm nhanh

| Trường | Giá trị production |
|---|---|
| Tên DB | `kdpd_db` |
| User DB | `kdpd_user` |
| Host/Port | `localhost:5432` (server), `localhost:5433` (local) |
| Thư mục project trên server | `~/Task-Project/KDPD_PRJ_MNG` |
| Thư mục backup trên server | `backups/` |
| File tài liệu chi tiết | `Docs/DB_BACKUP_AND_TRANSFER.md` trong repo |

## 2. Thứ tự thao tác đề xuất

Khi user yêu cầu backup / chuyển DB, thực hiện theo trình tự sau. Chi tiết dài xem tại
[references/DB_BACKUP_AND_TRANSFER.md](./references/DB_BACKUP_AND_TRANSFER.md) (copy nội dung
của file docs gốc vào đây để agent đọc offline).

**Bước 1 — Đảm bảo .env sạch ký tự ẩn.**
Trên server (tmux/SSH):

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
sed -i 's/\r$//' .env
DB_URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '\r\n ')
echo "DB_URL = [$DB_URL]"
```

**Bước 2 — Test kết nối + backup dạng custom (nén).**

```bash
psql "$DB_URL" -c "SELECT current_database(), current_user;"
mkdir -p backups
pg_dump "$DB_URL" -F c --no-owner --no-acl -f "backups/kdpd_db_$(date +%F_%H%M).dump"
ls -lh backups/
```

**Bước 3 — Lấy thông tin cần cho lệnh chuyển file (trên server).**

```bash
realpath backups/$(ls -t backups/ | head -1)   # full path file backup mới nhất
hostname -I | awk '{print $1}'                  # IP LAN server
```

**Bước 4 — Chuyển file sang Windows (chạy lệnh trên PowerShell của Windows, không phải tmux).**

```powershell
scp kdpd-project@<IP_SERVER>:<PATH_FILE_SERVER>  "D:\Vincent\DEV\KDPD_PRJ_MNG\attached_assets\"
```

**Bước 5 — (Nếu cần) Khôi phục lại DB hoặc đăng ký cron tự động.**

Xem mục 5 (Restore) và mục 6 (Cron) trong file references.

## 3. Lỗi thường gặp & cách sửa

| Lỗi | Cách sửa |
|---|---|
| `database "kdpd_db\r" does not exist` | `.env` có CRLF → `sed -i 's/\r$//' .env` |
| `scp: Connection timed out` | Firewall chặn 22 hoặc sai IP → `sudo ufw allow 22` |
| `pg_dump version mismatch` | Cài pg_dump phiên bản ≥ server (khuyến nghị 17) |
| DB không tồn tại | `sudo -u postgres psql -c "CREATE DATABASE kdpd_db OWNER kdpd_user;"` |

## 4. Đừng quên

- Luôn backup **trước khi** cập nhật schema / restore.
- Mọi đường dẫn trên Windows trong lệnh `scp`/`rsync` nên đặt trong dấu `"..."` nếu có khoảng trắng.
- Tham khảo `Docs/DEPLOY.md` (mục 8) và `Docs/NEON_SETUP.md` (mục 7) khi cần thêm ngữ cảnh.
