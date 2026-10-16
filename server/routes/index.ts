import type { Express } from "express";
import { registerAuthRoutes } from "./auth.routes";
import { registerBackupRoutes } from "./backup.routes";
import { registerGoogleCalendarRoutes } from "./google-calendar.routes";
import { registerNotificationRoutes } from "./notifications.routes";
import { registerWorksRoutes } from "./works.routes";
import { registerUsersRoutes } from "./users.routes";
import { registerReportRoutes } from "./reports.routes";

export function registerModularRoutes(app: Express): void {
  registerAuthRoutes(app);
  registerBackupRoutes(app);
  registerGoogleCalendarRoutes(app);
  registerNotificationRoutes(app);
  registerWorksRoutes(app);
  registerUsersRoutes(app);
  registerReportRoutes(app);
}

export * from "./shared";
export * from "./auth.routes";
export * from "./backup.routes";
export * from "./google-calendar.routes";
export * from "./notifications.routes";
export * from "./works.routes";
export * from "./users.routes";
export * from "./reports.routes";
