import type { Express } from "express";
import { z } from "zod";
import { api } from "@shared/routes";
import type { UserWithRolesAndGroups } from "@shared/schema";
import { db } from "../db";
import * as dbStorage from "../db-storage";
import { requireAuth } from "../middleware";
import { getPublicKey as getPushPublicKey } from "../push";

export function registerNotificationRoutes(app: Express): void {
  // Lấy số lượng thông báo chưa đọc
  app.get(api.notifications.unreadCount.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.json({ count: 0 });
      const userId = (req.user as UserWithRolesAndGroups).id;
      const count = await dbStorage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (err) {
      console.error("Error fetching unread notifications count:", err);
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to fetch notifications",
      });
    }
  });

  // Push Notification Public Key
  app.get(api.push.publicKey.path, requireAuth, async (_req, res) => {
    try {
      const publicKey = getPushPublicKey();
      res.json({ publicKey });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to get key",
      });
    }
  });

  // Subscribe Web Push
  app.post(api.push.subscribe.path, requireAuth, async (req, res) => {
    try {
      const userId = (req.user as UserWithRolesAndGroups).id;
      const input = api.push.subscribe.input.parse(req.body);
      await dbStorage.upsertPushSubscription(userId, {
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      });
      res.json({ message: "Subscribed" });
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.errors[0].message
          : err instanceof Error
            ? err.message
            : "Failed to subscribe";
      res.status(400).json({ message });
    }
  });

  // Unsubscribe Web Push
  app.post(api.push.unsubscribe.path, requireAuth, async (req, res) => {
    try {
      const userId = (req.user as UserWithRolesAndGroups).id;
      const input = api.push.unsubscribe.input.parse(req.body);
      await dbStorage.deletePushSubscriptionByEndpoint(userId, input.endpoint);
      res.json({ message: "Unsubscribed" });
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.errors[0].message
          : err instanceof Error
            ? err.message
            : "Failed to unsubscribe";
      res.status(400).json({ message });
    }
  });

  // Danh sách thông báo
  app.get(api.notifications.list.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.json([]);
      const userId = (req.user as UserWithRolesAndGroups).id;
      const unreadOnly =
        String(req.query.unread || "").toLowerCase() === "true";

      const list = await dbStorage.getNotificationsByUserId(userId, {
        unreadOnly,
      });
      res.json(list);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to fetch notifications",
      });
    }
  });

  // Đánh dấu đã đọc
  app.patch(api.notifications.markRead.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const userId = (req.user as UserWithRolesAndGroups).id;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const updated = await dbStorage.markNotificationAsRead(userId, id);
      if (!updated)
        return res.status(404).json({ message: "Notification not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error marking notification as read:", err);
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to update notification",
      });
    }
  });

  // Đánh dấu chưa đọc
  app.patch(
    api.notifications.markUnread.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const userId = (req.user as UserWithRolesAndGroups).id;
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const updated = await dbStorage.markNotificationAsUnread(userId, id);
        if (!updated)
          return res.status(404).json({ message: "Notification not found" });
        res.json(updated);
      } catch (err) {
        console.error("Error marking notification as unread:", err);
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to update notification",
        });
      }
    },
  );

  // Đánh dấu quan trọng
  app.patch(
    api.notifications.setImportant.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const userId = (req.user as UserWithRolesAndGroups).id;
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const input = api.notifications.setImportant.input.parse(req.body);
        const updated = await dbStorage.setNotificationImportant(
          userId,
          id,
          input.isImportant,
        );
        if (!updated)
          return res.status(404).json({ message: "Notification not found" });
        res.json(updated);
      } catch (err) {
        const message =
          err instanceof z.ZodError
            ? err.errors[0].message
            : err instanceof Error
              ? err.message
              : "Failed to update notification";
        console.error("Error setting notification important:", err);
        res.status(400).json({ message });
      }
    },
  );

  // Đánh dấu tất cả đã đọc
  app.post(
    api.notifications.markAllRead.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const userId = (req.user as UserWithRolesAndGroups).id;
        const updated = await dbStorage.markAllNotificationsAsRead(userId);
        res.json({ updated });
      } catch (err) {
        console.error("Error marking all notifications as read:", err);
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to update notifications",
        });
      }
    },
  );
}
