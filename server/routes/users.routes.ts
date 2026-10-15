import type { Express } from "express";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { z } from "zod";
import multer from "multer";
import { api } from "@shared/routes";
import { UserRole, type User } from "@shared/schema";
import { db } from "../db";
import * as dbStorage from "../db-storage";
import { requireAuth, requireRole, rateLimit } from "../middleware";
import { sanitizeUser } from "./shared";

function requireDb() {
  if (!db) {
    throw new Error(
      "Database not configured. Set DATABASE_URL for users/contracts/documents API.",
    );
  }
}

export function registerUsersRoutes(app: Express): void {
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const avatarsDir = path.join(uploadsDir, "avatars");

  const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
  });

  const avatarUploadRateLimit = rateLimit({
    windowMs: 60_000,
    max: 10,
    keyPrefix: "users:uploadAvatar",
  });

  const isValidImageUpload = (buffer: Buffer, ext: string): boolean => {
    if (!buffer || buffer.length < 12) return false;
    if (ext === ".jpg") {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (ext === ".png") {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }
    if (ext === ".webp") {
      const riff = buffer.toString("ascii", 0, 4) === "RIFF";
      const webp = buffer.toString("ascii", 8, 12) === "WEBP";
      return riff && webp;
    }
    return false;
  };

  // Danh sách users
  app.get(api.users.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      const list = await dbStorage.getUsersWithRolesAndGroups();
      res.json(list.map(sanitizeUser));
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      console.error("Error fetching users:", err);
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to fetch users",
      });
    }
  });

  // Danh sách nhân sự lọc cho công việc
  app.get(
    api.users.listTaskFilterStaff.path,
    requireAuth,
    async (_req, res) => {
      try {
        requireDb();
        const norm = (s: string) =>
          s
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, "")
            .trim();
        const deptKey = norm("Ban thư ký");
        const thuKyHpCodeKey = "prj_secretary";
        const thuKyHpNameKey = norm("Thư ký hợp phần");
        const list = await dbStorage.getUsersWithRolesAndGroups();
        const filtered = list.filter((u) => {
          const hasPassword =
            typeof (u as any).passwordHash === "string" &&
            String((u as any).passwordHash).trim() !== "";
          const dept = typeof u.department === "string" ? u.department : "";
          const isActive = Boolean((u as any).isActive);
          const roles = Array.isArray((u as any).roles) ? (u as any).roles : [];
          const isPartner = roles.some(
            (r: any) =>
              (r && typeof r.code === "string" && r.code.toLowerCase() === "partner") ||
              (r && typeof r.name === "string" &&
                r.name
                  .normalize("NFKD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .replace(/\s+/g, "")
                  .trim()
                  .includes("doitac")),
          );
          const hasThuKyHopPhanRole = roles.some(
            (r: any) =>
              (r && typeof r.code === "string" && String(r.code).toLowerCase() === thuKyHpCodeKey) ||
              (r && typeof r.name === "string" && norm(r.name) === thuKyHpNameKey),
          );
          return (
            hasPassword &&
            norm(dept) === deptKey &&
            isActive &&
            !isPartner &&
            hasThuKyHopPhanRole
          );
        });
        res.json(filtered.map(sanitizeUser));
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        console.error("Error fetching task-filter staff:", err);
        res.status(500).json({
          message:
            err instanceof Error ? err.message : "Failed to fetch staff users",
        });
      }
    },
  );

  // Avatar download
  app.get(api.users.avatar.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const user = await dbStorage.getUserById(id);
      if (!user) {
        res.setHeader("Cache-Control", "public, max-age=600");
        return res
          .status(404)
          .type("image/svg+xml")
          .send(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><title/></svg>',
          );
      }
      if (!user.avatarPath) {
        res.setHeader("Cache-Control", "private, max-age=600");
        return res.status(204).end();
      }
      const fileName = path.basename(String(user.avatarPath));
      const abs = path.join(avatarsDir, fileName);
      if (
        !fs.existsSync(abs) ||
        !fs.statSync(abs, { throwIfNoEntry: false })?.isFile()
      ) {
        res.setHeader("Cache-Control", "private, max-age=600");
        return res.status(204).end();
      }
      res.setHeader("Cache-Control", "private, max-age=3600");
      return res.sendFile(abs, (err) => {
        if (err) {
          if (String((err as any)?.code || "").toUpperCase() === "ENOENT") {
            res.setHeader("Cache-Control", "private, max-age=600");
            return res.status(204).end();
          }
          return res.status(500).json({
            message:
              err instanceof Error ? err.message : "Failed to read avatar",
          });
        }
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      return res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to fetch avatar",
      });
    }
  });

  // Chi tiết user
  app.get(api.users.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const user = await dbStorage.getUserByIdWithRolesAndGroups(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(sanitizeUser(user));
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to fetch user",
      });
    }
  });

  // Avatar upload
  app.post(
    api.users.uploadAvatar.path,
    requireAuth,
    avatarUploadRateLimit,
    (req, res, next) => {
      avatarUpload.single("file")(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            message: err instanceof Error ? err.message : "File upload error",
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        requireDb();
        const userId = (req.user as User).id;
        const file = (req as any).file as
          | undefined
          | { buffer: Buffer; mimetype: string };
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        const mime = String(file.mimetype || "")
          .toLowerCase()
          .trim();
        const extByMime: Record<string, string> = {
          "image/jpeg": ".jpg",
          "image/jpg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
        };
        const ext = extByMime[mime];
        if (!ext) {
          return res.status(400).json({
            message: "Chỉ hỗ trợ ảnh JPG/PNG/WEBP",
          });
        }
        if (!isValidImageUpload(file.buffer, ext)) {
          return res.status(400).json({
            message: "File ảnh không hợp lệ",
          });
        }

        await mkdir(avatarsDir, { recursive: true });
        const existing = await dbStorage.getUserById(userId);
        if (existing?.avatarPath) {
          const oldFileName = path.basename(String(existing.avatarPath));
          await unlink(path.join(avatarsDir, oldFileName)).catch(() => {});
        }
        const fileName = `${userId}-${Date.now()}-${randomUUID()}${ext}`;
        await writeFile(path.join(avatarsDir, fileName), file.buffer);
        await dbStorage.updateUser(userId, {
          avatarPath: `avatars/${fileName}`,
        });
        const updated = await dbStorage.getUserByIdWithRolesAndGroups(userId);
        return res.json({
          message: "Cập nhật ảnh đại diện thành công",
          user: updated ? sanitizeUser(updated) : null,
          avatarPath: `avatars/${fileName}`,
        });
      } catch (err) {
        console.error("Upload avatar error:", err);
        return res.status(500).json({
          message:
            err instanceof Error ? err.message : "Upload avatar failed",
        });
      }
    },
  );

  // Tạo user
  app.post(
    api.users.create.path,
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (req, res) => {
      try {
        requireDb();
        const body = (req.body || {}) as Record<string, any>;
        const { password, roleId, roleIds, groupIds } = body;
        const userData = api.users.create.input.parse(req.body);
        const user = await dbStorage.createUser(userData);
        if (password) {
          const hash = await bcrypt.hash(password, 10);
          await dbStorage.updateUser(user.id, { passwordHash: hash });
        }
        const rolesToAssign =
          roleIds && roleIds.length > 0
            ? roleIds
            : roleId
              ? [roleId]
              : [];
        if (rolesToAssign.length > 0) {
          await dbStorage.setUserRoles(user.id, rolesToAssign);
        }
        if (groupIds && groupIds.length > 0) {
          await dbStorage.setUserGroups(user.id, groupIds);
        }
        const created = await dbStorage.getUserByIdWithRolesAndGroups(user.id);
        res.json(sanitizeUser(created ?? user));
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join("."),
          });
        }
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        const msg = err instanceof Error ? err.message : "";
        if (
          msg.includes("duplicate key") ||
          msg.includes("users_email_unique")
        ) {
          return res
            .status(400)
            .json({ message: "Email này đã được sử dụng.", field: "email" });
        }
        console.error("Error creating user:", err);
        res.status(500).json({
          message: err instanceof Error ? err.message : "Failed to create user",
        });
      }
    },
  );

  // Cập nhật user
  app.patch(
    api.users.update.path,
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const body = (req.body || {}) as Record<string, any>;
        const { password, roleId, roleIds, groupIds } = body;
        const userData = api.users.update.input.parse(req.body);
        if (Object.keys(userData).length > 0) {
          await dbStorage.updateUser(id, userData);
        }
        if (password) {
          const hash = await bcrypt.hash(password, 10);
          await dbStorage.updateUser(id, { passwordHash: hash });
        }
        const rolesToSet =
          roleIds !== undefined
            ? roleIds
            : roleId !== undefined
              ? roleId
                ? [roleId]
                : []
              : undefined;
        if (rolesToSet !== undefined) {
          await dbStorage.setUserRoles(id, rolesToSet);
        }
        if (groupIds !== undefined) {
          await dbStorage.setUserGroups(id, groupIds);
        }
        const user = await dbStorage.getUserByIdWithRolesAndGroups(id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(sanitizeUser(user));
      } catch (err) {
        console.error("PATCH /api/users/:id error:", err);
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join("."),
          });
        }
        if (err instanceof Error && err.message.includes("not found")) {
          return res.status(404).json({ message: err.message });
        }
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        const message =
          err instanceof Error ? err.message : "Failed to update user";
        res.status(500).json({ message });
      }
    },
  );

  // Cập nhật mật khẩu bởi Admin
  app.patch(
    "/api/users/:id/password",
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const body = z
          .object({
            newPassword: z
              .string()
              .min(8, "Mật khẩu tối thiểu 8 ký tự")
              .refine((v) => /[A-Z]/.test(v), "Mật khẩu phải có chữ hoa (A-Z)")
              .refine(
                (v) => /[a-z]/.test(v),
                "Mật khẩu phải có chữ thường (a-z)",
              )
              .refine((v) => /[0-9]/.test(v), "Mật khẩu phải có số (0-9)")
              .refine(
                (v) => /[^A-Za-z0-9]/.test(v),
                "Mật khẩu phải có ký tự đặc biệt",
              ),
          })
          .parse(req.body);
        const hash = await bcrypt.hash(body.newPassword, 10);
        const user = await dbStorage.updateUser(id, { passwordHash: hash });
        res.json(sanitizeUser(user));
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join("."),
          });
        }
        if (err instanceof Error && err.message.includes("not found")) {
          return res.status(404).json({ message: err.message });
        }
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        res.status(500).json({
          message:
            err instanceof Error ? err.message : "Failed to update password",
        });
      }
    },
  );

  // Xóa user
  app.delete(
    api.users.delete.path,
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        await dbStorage.deleteUser(id);
        res.json({ message: "User deleted successfully" });
      } catch (err) {
        if (err instanceof Error && err.message.includes("not found")) {
          return res.status(404).json({ message: err.message });
        }
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        res.status(500).json({
          message: err instanceof Error ? err.message : "Failed to delete user",
        });
      }
    },
  );
}
