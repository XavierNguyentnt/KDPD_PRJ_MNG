import type { Express } from "express";
import fs from "fs";
import { db } from "../db";
import { requireAuth } from "../middleware";
import {
  deleteBackupFile,
  getBackupDownloadPath,
  getLastRestoreStats,
  getRunLog,
  isBackupRunning,
  isRestoreRunning,
  listBackupFiles,
  loadBackupConfig,
  previewRestoreFromDump,
  requireAdmin,
  restoreFromDumpFull,
  restoreFromDumpUpsert,
  runBackup,
  saveBackupConfig,
} from "../backup";

function requireDb() {
  if (!db) {
    throw new Error("Database not configured. Set DATABASE_URL.");
  }
  return db;
}

export function registerBackupRoutes(app: Express): void {
  // Cấu hình backup
  app.get("/api/backup/config", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới xem cấu hình backup." });
      }
      res.json(loadBackupConfig());
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  });

  app.patch("/api/backup/config", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới cập nhật cấu hình backup." });
      }
      requireDb();
      const cfg = saveBackupConfig(req.body || {});
      res.json(cfg);
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Lỗi lưu cấu hình backup.",
      });
    }
  });

  // Danh sách file backup
  app.get("/api/backup/files", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới xem danh sách backup." });
      }
      res.json(await listBackupFiles());
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Lỗi liệt kê file backup.",
      });
    }
  });

  // Trạng thái backup đang chạy
  app.get("/api/backup/running", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới xem trạng thái backup." });
      }
      res.json({ running: isBackupRunning() });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  });

  // Lịch sử backup run log
  app.get("/api/backup/log", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới xem lịch sử backup." });
      }
      res.json(getRunLog().slice(0, 20));
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  });

  // Kích hoạt thủ công backup
  app.post("/api/backup/trigger", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới được chạy sao lưu DB." });
      }
      requireDb();
      if (isBackupRunning()) {
        return res.status(409).json({ message: "Một lượt sao lưu đang chạy, vui lòng đợi xong." });
      }
      const file = await runBackup("manual");
      res.json(file);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(
        "[routes:backup-trigger] 500 trigger backup LỖI:",
        errMsg,
        "\n  user=", (req.user as any)?.email || (req.user as any)?.id,
      );
      res.status(500).json({
        message: errMsg || "Sao lưu thất bại.",
        error: errMsg || "Sao lưu thất bại.",
      });
    }
  });

  // Xóa file backup
  app.delete("/api/backup/files/:filename", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới xoá file backup." });
      }
      const filename = Array.isArray(req.params.filename)
        ? String(req.params.filename[0])
        : String(req.params.filename);
      deleteBackupFile(filename);
      res.json({ message: "Đã xoá file backup.", filename });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  });

  // Tải file backup
  app.get("/api/backup/files/:filename/download", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới tải file backup." });
      }
      const filename = Array.isArray(req.params.filename)
        ? String(req.params.filename[0])
        : String(req.params.filename);
      const p = getBackupDownloadPath(filename);
      if (!fs.existsSync(p)) {
        return res.status(404).json({ message: `Không tìm thấy file backup ${filename}.` });
      }
      res.download(p, filename, (err) => {
        if (err) console.error("[backup] download lỗi:", err);
      });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  });

  // Trạng thái restore
  app.get("/api/restore/running", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới xem trạng thái khôi phục." });
      }
      res.json({
        running: isRestoreRunning(),
        lastStats: getLastRestoreStats(),
      });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  });

  // Xem trước khôi phục
  app.post("/api/backup/files/:filename/restore-preview", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới xem trước khôi phục." });
      }
      if (isRestoreRunning()) {
        return res.status(409).json({ message: "Một lượt khôi phục đang chạy, vui lòng đợi hoàn tất." });
      }
      const filename = Array.isArray(req.params.filename)
        ? String(req.params.filename[0])
        : String(req.params.filename);
      const stats = await previewRestoreFromDump(filename);
      res.json(stats);
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  });

  // Kích hoạt khôi phục
  app.post("/api/backup/files/:filename/restore", requireAuth, async (req, res) => {
    try {
      if (!requireAdmin(req as any)) {
        return res.status(403).json({ message: "Chỉ Admin mới kích hoạt khôi phục." });
      }
      if (isRestoreRunning()) {
        return res.status(409).json({ message: "Một lượt khôi phục đang chạy, vui lòng đợi hoàn tất." });
      }
      const filename = Array.isArray(req.params.filename)
        ? String(req.params.filename[0])
        : String(req.params.filename);
      const mode = (req.query.mode as string) === "full" ? "full" : "upsert";
      const statsPromise =
        mode === "full"
          ? restoreFromDumpFull(filename)
          : restoreFromDumpUpsert(filename);
      statsPromise.catch(() => {
        /* lỗi đã được log + cached trong _lastRestoreStats */
      });
      res.json({
        queued: true,
        mode,
        filename,
        running: isRestoreRunning(),
      });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  });
}
