import type { Express } from "express";
import { z } from "zod";
import type { UserWithRolesAndGroups } from "@shared/schema";
import { requireAuth } from "../middleware";
import {
  buildGoogleCalendarAuthUrl,
  connectGoogleCalendarWithCode,
  createGoogleCalendarOAuthState,
  parseGoogleCalendarOAuthState,
  deleteGoogleCalendarEventsForAssignmentIds,
  disconnectGoogleCalendar,
  getGoogleCalendarSyncStatus,
  cleanupGoogleCalendarDuplicates,
  syncGoogleCalendarForTaskChange,
  syncGoogleCalendarForUser,
  updateGoogleCalendarSyncSettings,
} from "../google-calendar-sync";

export function registerGoogleCalendarRoutes(app: Express): void {
  app.get("/api/google-calendar/status", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as UserWithRolesAndGroups).id;
      res.json(await getGoogleCalendarSyncStatus(userId));
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to get status",
      });
    }
  });

  app.get("/api/google-calendar/connect", requireAuth, async (req, res) => {
    const clientId = (process.env.GOOGLE_CLIENT_ID ?? "").trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
    const redirectUri = (
      process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      process.env.GOOGLE_REDIRECT_URI ||
      ""
    ).trim();
    const missing: string[] = [];
    if (!clientId) missing.push("GOOGLE_CLIENT_ID");
    if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    if (!redirectUri) missing.push("GOOGLE_CALENDAR_REDIRECT_URI");
    if (redirectUri.includes("developers.google.com/oauthplayground")) {
      return res.status(400).json({
        message:
          "GOOGLE_CALENDAR_REDIRECT_URI không được dùng OAuth Playground. Hãy đặt về URL callback của chương trình: /api/google-calendar/oauth2/callback",
      });
    }
    if (missing.length > 0) {
      return res.status(503).json({
        message:
          "Google Calendar chưa được cấu hình. Thiếu: " + missing.join(", "),
      });
    }
    const returnToRaw =
      typeof req.query.returnTo === "string" ? req.query.returnTo : "/";
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//")
        ? returnToRaw
        : "/";
    const host = String(req.get("host") || "").trim();
    const appOrigin = host
      ? `${req.protocol}://${host}`.replace(/\/+$/, "")
      : "";
    const userId = (req.user as UserWithRolesAndGroups).id;
    const state = createGoogleCalendarOAuthState({
      userId,
      returnTo,
      appOrigin,
    });
    const url = buildGoogleCalendarAuthUrl({ state });
    if (!url) {
      return res.status(503).json({
        message:
          "Google Calendar chưa được cấu hình. Kiểm tra GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_CALENDAR_REDIRECT_URI và restart server.",
      });
    }
    return res.redirect(url);
  });

  app.get("/api/google-calendar/oauth2/callback", async (req, res) => {
    try {
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const parsed = state ? parseGoogleCalendarOAuthState(state) : null;
      if (!code || !parsed) {
        return res.status(400).json({ message: "Invalid OAuth state/code" });
      }
      await connectGoogleCalendarWithCode({ userId: parsed.userId, code });
      const safeReturnTo =
        parsed.returnTo.startsWith("/") && !parsed.returnTo.startsWith("//")
          ? parsed.returnTo
          : "/";
      const withFlag = safeReturnTo.includes("?")
        ? `${safeReturnTo}&gcal=connected`
        : `${safeReturnTo}?gcal=connected`;
      const dest = parsed.appOrigin
        ? `${parsed.appOrigin}${withFlag}`
        : withFlag;
      return res.redirect(dest);
    } catch (err) {
      return res.status(500).json({
        message: err instanceof Error ? err.message : "OAuth callback failed",
      });
    }
  });

  app.post("/api/google-calendar/settings", requireAuth, async (req, res) => {
    try {
      const input = z
        .object({
          syncEnabled: z.boolean().optional(),
          calendarId: z.string().optional(),
          syncDateField: z.enum(["dueDate", "receivedAt"]).optional(),
        })
        .parse(req.body);
      const userId = (req.user as UserWithRolesAndGroups).id;
      await updateGoogleCalendarSyncSettings({
        userId,
        syncEnabled: input.syncEnabled,
        calendarId: input.calendarId,
        syncDateField: input.syncDateField,
      });
      res.json(await getGoogleCalendarSyncStatus(userId));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to save settings",
      });
    }
  });

  app.post("/api/google-calendar/sync-now", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as UserWithRolesAndGroups).id;
      const status = await getGoogleCalendarSyncStatus(userId);
      if (!status.connected) {
        return res.status(400).json({
          message:
            "Chưa kết nối Google Calendar. Vui lòng bấm 'Kết nối Google Calendar' trước.",
        });
      }
      if (!status.syncEnabled) {
        return res.status(400).json({
          message:
            "Đồng bộ tự động đang tắt. Vui lòng bật 'Tự động đồng bộ' trước.",
        });
      }
      const summary = await syncGoogleCalendarForUser(userId);
      res.json(summary);
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to sync",
      });
    }
  });

  app.post("/api/google-calendar/cleanup", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as UserWithRolesAndGroups).id;
      const status = await getGoogleCalendarSyncStatus(userId);
      if (!status.connected) {
        return res.status(400).json({
          message:
            "Chưa kết nối Google Calendar. Vui lòng bấm 'Kết nối Google Calendar' trước.",
        });
      }
      const summary = await cleanupGoogleCalendarDuplicates(userId);
      res.json(summary);
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to cleanup",
      });
    }
  });

  app.post("/api/google-calendar/disconnect", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as UserWithRolesAndGroups).id;
      await disconnectGoogleCalendar(userId);
      res.json({ message: "OK" });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to disconnect",
      });
    }
  });
}
