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

export async function sendNotificationEmail(
  userId: string,
  notification: Notification,
  extra?: {
    dueDate?: string | null;
    vote?: string | null;
    taskTitle?: string | null;
  },
): Promise<void> {
  const user = await dbStorage.getUserById(userId);
  if (!user?.email) return;
  const subjectPrefix = process.env.MAIL_SUBJECT_PREFIX || "[KDPD]";
  const content = buildNotificationContent(
    notification.type as any,
    extra?.taskTitle || "",
    extra?.dueDate || null,
    extra?.vote || null,
  );
  const subject = `${subjectPrefix} ${content.title}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6">
  <p><strong>${content.title}</strong></p>
  <p>${content.message}</p>
  </div>`;
  try {
    await sendEmail({ to: user.email, subject, html });
  } catch {}
}
