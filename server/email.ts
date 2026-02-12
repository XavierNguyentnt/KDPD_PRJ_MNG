import { google } from "googleapis";
import * as dbStorage from "./db-storage";
import { buildNotificationContent } from "./notifications";
import type { Notification } from "@shared/schema";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeHeaderUtf8B(value: string): string {
  const hasNonAscii = /[^\x00-\x7F]/.test(value);
  if (!hasNonAscii) return value;
  const b64 = Buffer.from(value, "utf-8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "https://developers.google.com/oauthplayground";
  if (!clientId || !clientSecret || !refreshToken) return null;
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

async function sendEmail(input: SendEmailInput): Promise<void> {
  const client = getOAuthClient();
  if (!client) return;
  const gmail = google.gmail({ version: "v1", auth: client });
  const from = process.env.MAIL_FROM || "no-reply@example.com";
  const subjectHeader = encodeHeaderUtf8B(input.subject);
  const lines = [
    `From: ${from}`,
    `To: ${input.to}`,
    `Subject: ${subjectHeader}`,
    "MIME-Version: 1.0",
    `Content-Type: text/html; charset="UTF-8"`,
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
  ];
  const raw = base64UrlEncode(lines.join("\r\n"));
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
}

type NotificationEmailExtra = {
  taskTitle?: string | null;
  taskId?: string | null;
  group?: string | null;
  dueDate?: string | null;
  vote?: string | null;
  assignerName?: string | null;
  assignedAt?: string | null;
  assignmentDueDate?: string | null;
  assignmentNotes?: string | null;
  daysRemaining?: number | null;
  assigneeName?: string | null;
  completedAt?: string | null;
  controllerNames?: string[] | null;
  recipientIsController?: boolean | null;
};

export async function sendNotificationEmail(
  userId: string,
  notification: Notification,
  extra?: NotificationEmailExtra,
): Promise<void> {
  const user = await dbStorage.getUserById(userId);
  if (!user?.email) return;
  const subjectPrefix = process.env.MAIL_SUBJECT_PREFIX || "[KDPD]";
  const content = buildNotificationContent(notification.type as any, {
    taskTitle: extra?.taskTitle || "",
    taskId: extra?.taskId ?? notification.taskId ?? null,
    group: extra?.group ?? null,
    dueDate: extra?.dueDate ?? null,
    vote: extra?.vote ?? null,
    assignerName: extra?.assignerName ?? null,
    assignedAt: extra?.assignedAt ?? null,
    assignmentDueDate: extra?.assignmentDueDate ?? null,
    assignmentNotes: extra?.assignmentNotes ?? null,
    recipientName: user.displayName ?? null,
    daysRemaining: extra?.daysRemaining ?? null,
    assigneeName: extra?.assigneeName ?? null,
    completedAt: extra?.completedAt ?? null,
    controllerNames: extra?.controllerNames ?? null,
    recipientIsController: extra?.recipientIsController ?? null,
  });
  const subject = `${subjectPrefix} ${content.title}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px 0">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="height:4px;background:#0ea5e9"></div>
    <div style="padding:18px 22px">
      <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:6px">${content.title}</div>
      <div style="font-size:14px;color:#334155;line-height:1.7">${content.message}</div>
    </div>
    <div style="border-top:1px solid #e5e7eb;padding:12px 22px;font-size:12px;color:#64748b">
      Đây là email thông báo tự động từ Hệ thống KDPD.
    </div>
  </div>
  </div>`;
  try {
    await sendEmail({ to: user.email, subject, html });
  } catch {}
}
