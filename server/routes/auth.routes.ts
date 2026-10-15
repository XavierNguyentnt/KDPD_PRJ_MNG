import type { Express } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { api } from "@shared/routes";
import type { User } from "@shared/schema";
import { UserRole } from "@shared/schema";
import { pool } from "../db";
import * as dbStorage from "../db-storage";
import { passport } from "../auth";
import { requireAuth, requireRole, rateLimit } from "../middleware";
import { sendPasswordResetEmail } from "../email";
import { sanitizeUser, generateStrongPassword } from "./shared";

export function registerAuthRoutes(app: Express): void {
  const loginRateLimit = rateLimit({
    windowMs: 60_000,
    max: 10,
    keyPrefix: "auth:login",
  });
  const verifyPasswordRateLimit = rateLimit({
    windowMs: 60_000,
    max: 10,
    keyPrefix: "auth:verifyPassword",
  });
  const changePasswordRateLimit = rateLimit({
    windowMs: 60_000,
    max: 5,
    keyPrefix: "auth:changePassword",
  });
  const forgotPasswordRateLimit = rateLimit({
    windowMs: 60_000,
    max: 5,
    keyPrefix: "auth:forgotPassword",
  });

  // Đăng nhập
  app.post(api.auth.login.path, loginRateLimit, (req, res, next) => {
    const input = api.auth.login.input.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({
        message: input.error.errors[0].message,
        field: input.error.errors[0].path.join("."),
      });
    }
    passport.authenticate(
      "local",
      (
        err: unknown,
        user: Express.User | false,
        info?: { message?: string },
      ) => {
        if (err) {
          return res.status(500).json({
            message: err instanceof Error ? err.message : "Login failed",
          });
        }
        if (!user) {
          return res
            .status(401)
            .json({ message: info?.message ?? "Invalid email or password" });
        }
        const regenerate = (cb: () => void) => {
          const fn = (req as any).session?.regenerate;
          if (typeof fn === "function") {
            fn.call((req as any).session, cb);
          } else {
            cb();
          }
        };
        regenerate(() => {
          req.login(user, (loginErr) => {
            if (loginErr) {
              return res.status(500).json({ message: loginErr.message });
            }
            return res.json(sanitizeUser(user as User));
          });
        });
      },
    )(req, res, next);
  });

  // Quên mật khẩu
  app.post(
    api.auth.forgotPassword.path,
    forgotPasswordRateLimit,
    async (req, res) => {
      try {
        const body = api.auth.forgotPassword.input.parse(req.body);
        const email = body.email.toLowerCase().trim();
        const u = await dbStorage.getUserByEmail(email);
        if (u?.email && u.isActive) {
          const temporaryPassword = generateStrongPassword(8);
          const hash = await bcrypt.hash(temporaryPassword, 10);
          await dbStorage.updateUser(u.id, { passwordHash: hash });
          await sendPasswordResetEmail({
            to: u.email,
            recipientName: u.displayName ?? null,
            temporaryPassword,
          });
        }
        return res.json({
          message:
            "Nếu email tồn tại trong hệ thống, mật khẩu mới đã được gửi đến email đó.",
        });
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
        return res.status(500).json({
          message: err instanceof Error ? err.message : "Failed",
        });
      }
    },
  );

  // Đăng xuất
  app.post(api.auth.logout.path, requireAuth, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out" });
    });
  });

  // Thông tin user hiện tại
  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(200).json(null);
    }
    res.json(sanitizeUser(req.user as User));
  });

  // Xác thực mật khẩu cũ
  app.post(
    api.auth.verifyPassword.path,
    requireAuth,
    verifyPasswordRateLimit,
    async (req, res) => {
      try {
        const body = api.auth.verifyPassword.input.parse(req.body);
        const userId = (req.user as User).id;
        const u = await dbStorage.getUserById(userId);
        if (!u) return res.status(404).json({ message: "User not found" });
        const ok = await bcrypt.compare(
          body.currentPassword,
          u.passwordHash || "",
        );
        if (!ok)
          return res
            .status(400)
            .json({ message: "Mật khẩu hiện tại không đúng" });
        return res.json({ valid: true });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        return res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );

  // Đổi mật khẩu
  app.post(
    api.auth.changePassword.path,
    requireAuth,
    changePasswordRateLimit,
    async (req, res) => {
      try {
        const body = api.auth.changePassword.input.parse(req.body);
        const userId = (req.user as User).id;
        const u = await dbStorage.getUserById(userId);
        if (!u) return res.status(404).json({ message: "User not found" });
        const ok = await bcrypt.compare(
          body.currentPassword,
          u.passwordHash || "",
        );
        if (!ok)
          return res
            .status(400)
            .json({ message: "Mật khẩu hiện tại không đúng" });
        const hash = await bcrypt.hash(body.newPassword, 10);
        await dbStorage.updateUser(userId, { passwordHash: hash });
        return res.json({ message: "Đổi mật khẩu thành công" });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        return res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );

  // Dev only: gán lại hash đúng cho mật khẩu 123456 (seed users) - có bảo vệ
  if (process.env.NODE_ENV === "development" && pool) {
    app.post(
      "/api/dev/fix-password-hashes",
      requireAuth,
      requireRole(UserRole.ADMIN),
      async (req, res) => {
        const remoteIp = req.socket.remoteAddress || "";
        const isLocalIp =
          remoteIp === "127.0.0.1" ||
          remoteIp === "::1" ||
          remoteIp === "::ffff:127.0.0.1";
        if (!isLocalIp) {
          return res.status(403).json({
            message: "Forbidden: Endpoint only accessible from localhost",
          });
        }
        try {
          const hashFor123456 = await bcrypt.hash("123456", 10);
          const r = await pool!.query(
            "UPDATE users SET password_hash = $1 WHERE email != $2",
            [hashFor123456, "admin@kdpd.local"],
          );
          const updated = r.rowCount ?? 0;
          console.log(
            "[dev] fix-password-hashes: set password 123456 for",
            updated,
            "user(s) (excluding admin)",
          );
          return res.json({ message: "OK", updated });
        } catch (err) {
          console.error("[dev] fix-password-hashes error:", err);
          return res
            .status(500)
            .json({ message: err instanceof Error ? err.message : "Failed" });
        }
      },
    );
  }
}
