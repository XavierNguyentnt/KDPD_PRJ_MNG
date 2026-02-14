import webPush from "web-push";
import * as dbStorage from "./db-storage";
import type { Notification } from "@shared/schema";
import { log } from "./index";

let VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
let VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

function ensureKeys(): void {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    const keys = webPush.generateVAPIDKeys();
    VAPID_PUBLIC_KEY = keys.publicKey;
    VAPID_PRIVATE_KEY = keys.privateKey;
  }
  webPush.setVapidDetails(
    "mailto:admin@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

export function getPublicKey(): string {
  ensureKeys();
  return VAPID_PUBLIC_KEY;
}

export async function sendWebPushToUser(
  userId: string,
  notification: Notification,
  payload: Record<string, unknown>,
): Promise<void> {
  ensureKeys();
  const subs = await dbStorage.getPushSubscriptionsByUserId(userId);
  if (!subs.length) return;
  const data = {
    title: notification.title,
    body: notification.message.replace(/<[^>]+>/g, ""),
    tag: notification.id,
    data: {
      url: payload?.url ?? `/`,
      taskId: notification.taskId ?? null,
      notificationId: notification.id,
      type: notification.type,
    },
  };
  const json = JSON.stringify(data);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          } as any,
          json,
        );
      } catch (err: any) {
        const code = err?.statusCode || err?.code || "";
        if (code === 404 || code === 410) {
          try {
            await dbStorage.deletePushSubscriptionByEndpoint(userId, s.endpoint);
          } catch {}
        } else {
          log(`web-push error: ${String(code)}`, "web-push");
        }
      }
    }),
  );
}
