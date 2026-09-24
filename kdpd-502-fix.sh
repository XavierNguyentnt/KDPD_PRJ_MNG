#!/usr/bin/env bash
# ============================================================================
#  KDPD 502 Bad Gateway — Diagnostic + Auto-fix script (Ubuntu server)
#  Chức năng: Tự động kiểm tra 10+ nguyên nhân phổ biến nhất làm backend crash
#             sau khi update code, tự fix nếu có thể, cuối cùng in báo cáo tiếng Việt
#             MỤC TIÊU rõ ràng (nguyên nhân thật) để user báo lại hoặc fix thủ công.
#
#  Cách dùng (trên máy chủ Ubuntu):
#    1. Upload file này lên máy chủ (đặt cùng thư mục project), hoặc tạo file mới:
#         nano kdpd-502-fix.sh
#         → paste toàn bộ nội dung này, Ctrl+O lưu, Ctrl+X thoát
#    2. chmod +x kdpd-502-fix.sh
#    3. cd vào thư mục project (chứa package.json / server / client):
#         cd ~/Task-Project/KDPD_PRJ_MNG
#         sudo -u $(id -un) bash ./kdpd-502-fix.sh 2>&1 | tee kdpd-502-report.log
#    4. Chụp toàn bộ output màn hình hoặc nội dung file kdpd-502-report.log gửi lại
# ============================================================================
set -euo pipefail

# ---------- Colors ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'
ok()    { echo -e "  ${GREEN}✅ ${1}${NC}"; }
warn()  { echo -e "  ${AMBER}⚠️  ${1}${NC}"; }
fail()  { echo -e "  ${RED}❌ ${1}${NC}"; }
info()  { echo -e "  ${CYAN}ℹ︎  ${1}${NC}"; }
h2()    { echo ""; echo -e "${BOLD}${CYAN}─── ${1}${NC}"; }
title() { echo ""; echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}";
          echo -e "${BOLD}${CYAN} ${1}${NC}";
          echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"; }

# ---------- SCRIPT GLOBAL ----------
PROJECT_DIR="$(pwd)"
REPORT_FILE="kdpd-502-report.log"
FIXES_APPLIED=0
ISSUES_FOUND=0

# ---------- helpers ----------
ensure_in_project() {
  if [[ ! -f "package.json" ]] || [[ ! -d "server" ]] || [[ ! -d "client" ]]; then
    fail "KHÔNG ở đúng thư mục dự án! Hiện tại: $(pwd)"
    info "Yêu cầu: cd vào thư mục CHỨA package.json (thường là ~/Task-Project/KDPD_PRJ_MNG)."
    info "Sau đó chạy lại: bash ./kdpd-502-fix.sh"
    exit 1
  fi
  ok "Đang ở thư mục dự án đúng: $PROJECT_DIR"
}

detect_service_manager() {
  if command -v systemctl >/dev/null 2>&1; then
    # Kiểm tra service thông dụng
    for svc in kdpd kdpd-server kdpd-prj-mng node-app; do
      if systemctl list-unit-files --type=service --no-pager 2>/dev/null | grep -q "^${svc}\.service"; then
        SVC_MGR="systemd"
        SVC_NAME="$svc"
        ok "Phát hiện service systemd: $SVC_NAME"
        return
      fi
    done
  fi
  if command -v pm2 >/dev/null 2>&1; then
    if pm2 list 2>/dev/null | grep -q "kdpd\|KDPD"; then
      SVC_MGR="pm2"
      SVC_NAME="$(pm2 list 2>/dev/null | grep -i 'kdpd\|KDPD' | head -1 | awk '{print $4}')"
      ok "Phát hiện PM2 app: $SVC_NAME"
      return
    fi
  fi
  SVC_MGR="manual"
  SVC_NAME="?"
  warn "Không tìm thấy service systemd/pm2. Có thể bạn chạy app bằng nohup/tmux/npm start thủ công."
}

# ---------- Step 1 — Pre-checks ----------
title "BƯỚC 1/8 — Pre-checks"
ensure_in_project
detect_service_manager

# ---------- Step 2 — Node + npm + file quyền ----------
title "BƯỚC 2/8 — Node.js, npm và quyền file"
NODE_OK=1
NODE_V=""
if command -v node >/dev/null 2>&1; then
  NODE_V="$(node -v)"
  NODE_MAJOR="${NODE_V%%.*}"
  NODE_MAJOR="${NODE_MAJOR#v}"
  if (( NODE_MAJOR >= 20 )); then
    ok "Node.js $NODE_V (≥ 20)"
  else
    fail "Node.js QUÁ CŨ: $NODE_V (cần ≥ 20). Hãy chạy: nvm install 20 && nvm use 20"
    NODE_OK=0; ISSUES_FOUND=$((ISSUES_FOUND+1))
  fi
else
  fail "Không tìm thấy lệnh 'node'. Hãy cài Node.js 20+ (apt install nodejs npm hoặc dùng nvm)."
  NODE_OK=0; ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

if command -v npm >/dev/null 2>&1; then
  ok "npm $(npm -v)"
else
  fail "Không tìm thấy lệnh 'npm'."; ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

if [[ -d "node_modules" ]]; then
  NM_SIZE=$(du -sh node_modules 2>/dev/null | awk '{print $1}')
  info "node_modules đã tồn tại (kích thước ~$NM_SIZE)"
else
  warn "Thư mục node_modules CHƯA TỒN TẠI → phải chạy 'npm ci' trước khi build."
  ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

# ---------- Step 3 — .env check (QUAN TRỌNG: CRLF bug Windows -> Linux) ----------
title "BƯỚC 3/8 — File .env (kiểm tra mã hóa CRLF Windows)"
if [[ -f ".env" ]]; then
  CRLF_COUNT=$(grep -cU $'\r' .env 2>/dev/null || echo "0")
  if [[ "$CRLF_COUNT" -gt 0 ]]; then
    fail "File .env DÙNG MÃ HÓA WINDOWS CRLF ($CRLF_COUNT dòng có ký tự \\r) → LỖI PARSE biến môi trường nghiêm trọng!"
    info "   → Ví dụ: PG_DUMP_PATH='C:\\Program...\\r' hoặc password sai, DATABASE_URL sai."
    ISSUES_FOUND=$((ISSUES_FOUND+1))
    if command -v dos2unix >/dev/null 2>&1; then
      info "   → AUTO FIX: chạy dos2unix .env"
      dos2unix -q .env && { ok "Đã convert .env sang LF (Unix) thành công."; FIXES_APPLIED=$((FIXES_APPLIED+1)); }
    else
      info "   → AUTO FIX: dùng sed xoá \\r (không cần dos2unix)"
      sed -i 's/\r$//' .env && { ok "Đã fix .env CRLF bằng sed."; FIXES_APPLIED=$((FIXES_APPLIED+1)); }
    fi
  else
    ok ".env dùng mã hóa Unix LF (đúng chuẩn)."
  fi

  # Kiểm tra các biến bắc buộc
  for VAR in DATABASE_URL PORT SESSION_SECRET; do
    if grep -Eq "^[[:space:]]*${VAR}=" .env 2>/dev/null; then
      ok "Biến môi trường $VAR có định nghĩa."
    else
      warn "BIẾN $VAR CHƯA ĐỊNH NGHĨA trong .env!"
      ISSUES_FOUND=$((ISSUES_FOUND+1))
    fi
  done
else
  fail "Không tìm thấy file .env ở thư mục project. App KHÔNG THỂ chạy được."
  info "   → Hãy sao chép mẫu từ file có sẵn hoặc tài liệu DEPLOY.md mục 4)."
  ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

# ---------- Step 4 — dist build check ----------
title "BƯỚC 4/8 — Build artifacts (dist/)"
DIST_MISSING=0
if [[ -f "dist/index.cjs" ]]; then
  SIZE=$(stat -c%s dist/index.cjs 2>/dev/null || stat -f%z dist/index.cjs 2>/dev/null || echo "0")
  SIZE_H=$(du -h dist/index.cjs 2>/dev/null | awk '{print $1}')
  if (( SIZE > 10000 )); then  # > ~10KB
    ok "dist/index.cjs tồn tại, kích thước $SIZE_H ($SIZE bytes)."

    # Check xem file dist có chứa các hàm mới startBackupScheduler không?
    if grep -aq "startBackupScheduler\|restoreFromDumpUpsert\|isRestoreRunning" dist/index.cjs; then
      ok "dist/index.cjs CHỨA các hàm backup/restore engine MỚI (code mới đã build)."
    else
      fail "dist/index.cjs LÀ BẢN CŨ — KHÔNG CÓ hàm startBackupScheduler!"
      info "   → Nghĩa là BỎ QUA bước 'npm run build' sau khi git pull code mới."
      DIST_MISSING=1; ISSUES_FOUND=$((ISSUES_FOUND+1))
    fi
  else
    fail "dist/index.cjs QUÁ NHỎ ($SIZE bytes) — có thể build bị lỗi dở dang."
    DIST_MISSING=1; ISSUES_FOUND=$((ISSUES_FOUND+1))
  fi
else
  fail "File dist/index.cjs KHÔNG TỒN TẠI! Bạn CHƯA TỪNG chạy npm run build lần nào."
  DIST_MISSING=1; ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

if [[ -f "dist/public/index.html" ]]; then
  ok "dist/public/index.html (frontend build) tồn tại."
else
  warn "dist/public/index.html KHÔNG TỒN TẠI (frontend chưa build)."
  DIST_MISSING=1; ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

# ---------- Step 5 — Service log (tìm lỗi crash cuối cùng) ----------
title "BƯỚC 5/8 — Lịch sử crash service (QUAN TRỌNG NHẤT)"
case "$SVC_MGR" in
  systemd)
    if systemctl is-active --quiet "$SVC_NAME" 2>/dev/null; then
      ok "Service $SVC_NAME ĐANG CHẠY."
    else
      fail "Service $SVC_NAME KHÔNG CHẠY! (systemctl is-active = inactive/failed)."
      ISSUES_FOUND=$((ISSUES_FOUND+1))
    fi
    echo ""
    info "── journalctl 150 dòng LẦN CUỐI service $SVC_NAME (lọc dòng error/warn/fail/thuần cuối):"
    journalctl -u "$SVC_NAME" -n 150 --no-pager 2>/dev/null \
      | grep -iE "error|fail|warn|exception|cannot find|module not|unexpected token|syntaxerror|eaddrinuse|permission|econnrefused|spawn|pg_dump|restore" \
      | tail -40 || true
    echo ""
    info "── journalctl 40 dòng RAW cuối (để xem ngữ cảnh đầy đủ):"
    journalctl -u "$SVC_NAME" -n 40 --no-pager 2>/dev/null || true
    ;;
  pm2)
    info "PM2 logs (lệnh đầy đủ nếu cần: pm2 logs $SVC_NAME --lines 100 --nostream)"
    if command -v pm2 >/dev/null 2>&1; then
      pm2 logs "$SVC_NAME" --lines 60 --nostream 2>/dev/null || pm2 logs --lines 60 --nostream 2>/dev/null || true
    fi
    ;;
  manual)
    info "Chạy thủ công. Kiểm tra xem port 5000 có process nào đang chạy hay không (Step 6)."
    ;;
esac

# ---------- Step 6 — Port 5000 listener ----------
title "BƯỚC 6/8 — Kiểm tra Port 5000 và kết nối Nginx → upstream"
if command -v ss >/dev/null 2>&1; then
  LISTEN=$(ss -lntp 2>/dev/null | grep ':5000' || true)
  if [[ -n "$LISTEN" ]]; then
    ok "Có process LẮNG NGHE port 5000:"
    echo "    $LISTEN"
  else
    fail "PORT 5000 KHÔNG CÓ PROCESS NÀO LẮNG NGHE → Đây chính là lý do Nginx trả 502."
    info "   → Backend Node.js chưa start hoặc crash ngay lúc start."
    ISSUES_FOUND=$((ISSUES_FOUND+1))
  fi
fi

# Test thẳng backend qua localhost bỏ qua nginx
info "Test thẳng HTTP GET http://127.0.0.1:5000/login (bỏ qua Nginx):"
CURL_RES=$(curl -sS -o /dev/null -w "HTTP_CODE=%{http_code}  CONNECT=%{exitcode}\n" http://127.0.0.1:5000/login 2>&1 || true)
echo "    $CURL_RES"
if echo "$CURL_RES" | grep -qE "HTTP_CODE=2[0-9][0-9]|HTTP_CODE=30[0-9]"; then
  ok "Backend port 5000 trả HTTP 2xx/3xx → Backend KHỎE, lỗi nằm ở Nginx config (thường proxy_pass sai hoặc server_name sai)."
else
  fail "Backend port 5000 KHÔNG TRẢ LỜI → Lỗi backend (không start/crash)."
  ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

# Nginx status
if command -v nginx >/dev/null 2>&1; then
  if systemctl is-active --quiet nginx 2>/dev/null; then
    ok "Nginx đang chạy."
    info "Kiểm tra syntax nginx:"
    nginx_out=$(sudo -n nginx -t 2>&1 2>&1 || nginx -t 2>&1) || true
    echo "    $nginx_out"
  else
    warn "Nginx KHÔNG chạy! App không thể truy cập qua port 80 được."
    ISSUES_FOUND=$((ISSUES_FOUND+1))
  fi
fi

# ---------- Step 7 — NPM CI + BUILD AUTO-FIX (nếu cần hoặc user force) ----------
title "BƯỚC 7/8 — AUTO FIX: npm ci → npm run build → restart service"
FORCE_REBUILD="${FORCE_REBUILD:-0}"
SHOULD_REBUILD=0
if [[ "$DIST_MISSING" -eq 1 ]] || [[ ! -d "node_modules" ]]; then
  SHOULD_REBUILD=1
fi
if [[ "$FORCE_REBUILD" -eq 1 ]]; then
  SHOULD_REBUILD=1
fi

if [[ "$SHOULD_REBUILD" -eq 1 ]]; then
  h2 "AUTO FIX bắt đầu: npm ci → npm run build → restart"
  info "(Quá trình có thể mất 2–6 phút tùy tốc độ mạng/disk)"
  echo ""

  echo "── 7.1 npm ci (cập nhật dependencies) ──"
  if npm ci --no-audit --no-fund 2>&1; then
    ok "npm ci thành công."; FIXES_APPLIED=$((FIXES_APPLIED+1))
  else
    fail "npm ci THẤT BẠI! Xem lỗi chi tiết ngay trên màn hình (thường do thiếu build-essential hoặc python3)."
    ISSUES_FOUND=$((ISSUES_FOUND+1))
  fi

  echo ""
  echo "── 7.2 npm run build (client + server) ──"
  BUILD_START=$(date +%s)
  if npm run build 2>&1; then
    BUILD_END=$(date +%s); BUILD_SEC=$((BUILD_END-BUILD_START))
    ok "npm run build THÀNH CÔNG trong ${BUILD_SEC}s."
    FIXES_APPLIED=$((FIXES_APPLIED+1))
    # Verify hàm mới có sau build
    if grep -aq "startBackupScheduler\|isRestoreRunning" dist/index.cjs 2>/dev/null; then
      ok "dist/index.cjs SAU KHI BUILD đã chứa backup engine code mới."
    else
      warn "dist/index.cjs sau build KHÔNG tìm thấy startBackupScheduler (có thể minify đổi tên)."
    fi
  else
    BUILD_END=$(date +%s); BUILD_SEC=$((BUILD_END-BUILD_START))
    fail "npm run build THẤT BẠI sau ${BUILD_SEC}s! Xem lỗi chi tiết ngay trên màn hình."
    ISSUES_FOUND=$((ISSUES_FOUND+1))
    info "Lưu ý: Nếu build bị 'JavaScript heap out of memory' hãy chạy:"
    info "    export NODE_OPTIONS='--max-old-space-size=4096' ; npm run build"
  fi

  echo ""
  echo "── 7.3 Restart service $SVC_NAME ──"
  case "$SVC_MGR" in
    systemd)
      if sudo -n systemctl restart "$SVC_NAME" 2>/dev/null; then
        ok "systemctl restart $SVC_NAME OK."
        FIXES_APPLIED=$((FIXES_APPLIED+1))
      elif systemctl restart "$SVC_NAME" 2>&1; then
        ok "systemctl restart $SVC_NAME OK (chạy bằng user hiện tại)."
        FIXES_APPLIED=$((FIXES_APPLIED+1))
      else
        warn "Không restart được service $SVC_NAME. Hãy chạy thủ công:"
        echo "    sudo systemctl restart $SVC_NAME"
      fi
      ;;
    pm2)
      if command -v pm2 >/dev/null 2>&1; then
        pm2 restart "$SVC_NAME" 2>/dev/null && ok "pm2 restart $SVC_NAME OK." && FIXES_APPLIED=$((FIXES_APPLIED+1)) \
          || warn "pm2 restart $SVC_NAME thất bại."
      fi
      ;;
    manual)
      info "Chạy thủ công. Hãy kill process npm/node cũ rồi chạy 'npm start' trong tmux/nohup."
      ;;
  esac

  # Chờ 12s rồi kiểm tra lại trạng thái
  echo ""
  info "Chờ 12s để service start rồi kiểm tra lại..."
  sleep 12
  case "$SVC_MGR" in
    systemd)
      if systemctl is-active --quiet "$SVC_NAME" 2>/dev/null; then
        ok "Service $SVC_NAME VẪN chạy sau 12s → KHÔNG crash lặp."
      else
        fail "Service $SVC_NAME CRASH ngay sau restart (không chạy được > 12s)."
        ISSUES_FOUND=$((ISSUES_FOUND+1))
        info "   → Xem lỗi ngay bên dưới:"
        journalctl -u "$SVC_NAME" -n 35 --no-pager 2>/dev/null || true
      fi
      ;;
  esac
  CURL2=$(curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:5000/login 2>&1 || true)
  info "Test lại backend: $CURL2"
else
  info "Không cần rebuild (dist + node_modules đã OK). Nếu muốn BUILD LẠI buộc, chạy:"
  echo "    FORCE_REBUILD=1 bash ./kdpd-502-fix.sh"
fi

# ---------- Step 8 — Final report ----------
title "BƯỚC 8/8 — TỔNG KẾT BÁO CÁO CUỐI CÙNG"
echo ""
echo -e "  ${BOLD}Thư mục dự án   :${NC}  $PROJECT_DIR"
echo -e "  ${BOLD}Service manager :${NC}  $SVC_MGR / $SVC_NAME"
echo -e "  ${BOLD}Vấn đề tìm thấy:${NC}  ${RED}$ISSUES_FOUND${NC} vấn đề"
echo -e "  ${BOLD}Đã tự fix      :${NC}  ${GREEN}$FIXES_APPLIED${NC} hành động"
echo ""

# Tóm tắt 3 nguyên nhân PHỔ BIẾN NHẤT và giải pháp
if (( ISSUES_FOUND == 0 )) && (( FIXES_APPLIED == 0 )); then
  echo -e "${GREEN}${BOLD}✓ KHÔNG TÌM THẤY VẤN ĐỀ NÀO.${NC} App có vẻ khỏe mạnh."
  info "Hãy kiểm tra URL 'http://task.kdpd.local/' trên browser hard refresh Ctrl+Shift+R."
  info "Nếu vẫn thấy lỗi, hãy paste output FULL của script này vào chat."
elif (( FIXES_APPLIED > 0 )); then
  echo -e "${GREEN}${BOLD}✓ ĐÃ TỰ FIX $FIXES_APPLIED/${ISSUES_FOUND} vấn đề.${NC}"
  info "Bây giờ hãy hard refresh browser Ctrl+Shift+R và truy cập lại."
  info "Nếu vẫn 502 → các nguyên nhân còn lại thường là:"
  echo "    1. Nginx config proxy_pass sai hoặc chưa reload."
  echo "    2. .env DATABASE_URL sai thông tin (user/password/port/DB name)."
  echo "    3. PostgreSQL local KHÔNG chạy: kiểm tra 'sudo systemctl status postgresql'."
else
  fail "KHÔNG tự động fix được hết. Hãy xem các lỗi ở bước 5 (log crash) và gửi output FULL script này cho dev."
fi

echo ""
info "TẤT CẢ OUTPUT đã được lưu vào file: $REPORT_FILE"
info "Để xem lại sau: cat $REPORT_FILE"
