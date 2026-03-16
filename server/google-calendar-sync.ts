import { google, calendar_v3 } from "googleapis";
import crypto from "crypto";
import * as dbStorage from "./db-storage";
import { DUE_SOON_DAYS } from "./notifications";

type SyncDateField = "dueDate" | "receivedAt";
type SyncAction =
  | "created"
  | "updated"
  | "deleted"
  | "skipped_no_date"
  | "skipped_no_client"
  | "skipped_disabled"
  | "skipped_no_event_id"
  | "error";

export type GoogleCalendarSyncSummary = {
  connected: boolean;
  syncEnabled: boolean;
  calendarId: string;
  syncDateField: SyncDateField;
  totalAssignments: number;
  created: number;
  updated: number;
  deleted: number;
  skippedNoDate: number;
  skippedNoClient: number;
  skippedDisabled: number;
  skippedNoEventId: number;
  errors: number;
};

type KdpdStatus =
  | "not_started"
  | "in_progress"
  | "pending"
  | "cancelled"
  | "completed";

function normalizeKdpdStatus(input: unknown): KdpdStatus | null {
  const raw = (typeof input === "string" ? input : "").trim();
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s === "completed") return "completed";
  if (s === "in progress" || s === "in_progress") return "in_progress";
  if (s === "pending" || s === "paused") return "pending";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "not started" || s === "not_started") return "not_started";
  if (s === "archived") return "cancelled";
  return null;
}

function stripStatusPrefix(summary: string): string {
  const prefixes = [
    "Đang thực hiện:",
    "Hoàn thành:",
    "Tạm dừng:",
    "Đã huỷ:",
    "Đã hủy:",
    "In progress:",
    "Completed:",
    "Paused:",
    "Cancelled:",
  ];
  for (const p of prefixes) {
    if (summary.startsWith(p)) return summary.slice(p.length).trimStart();
  }
  return summary;
}

function getGoogleEventPresentation(status: KdpdStatus): {
  prefix: string;
  colorId: string;
  transparency: "opaque" | "transparent";
  statusLabelVi: string;
  removeReminders: boolean;
} {
  if (status === "in_progress") {
    return {
      prefix: "Đang thực hiện: ",
      colorId: "9",
      transparency: "opaque",
      statusLabelVi: "Đang thực hiện",
      removeReminders: false,
    };
  }
  if (status === "completed") {
    return {
      prefix: "Hoàn thành: ",
      colorId: "10",
      transparency: "transparent",
      statusLabelVi: "Hoàn thành",
      removeReminders: true,
    };
  }
  if (status === "pending") {
    return {
      prefix: "Tạm dừng: ",
      colorId: "5",
      transparency: "opaque",
      statusLabelVi: "Tạm dừng",
      removeReminders: false,
    };
  }
  if (status === "cancelled") {
    return {
      prefix: "Đã huỷ: ",
      colorId: "11",
      transparency: "transparent",
      statusLabelVi: "Đã huỷ",
      removeReminders: true,
    };
  }
  return {
    prefix: "",
    colorId: "8",
    transparency: "opaque",
    statusLabelVi: "Chưa bắt đầu",
    removeReminders: false,
  };
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
  const redirectLooksLikePlayground =
    !!redirectUri &&
    redirectUri.includes("developers.google.com/oauthplayground");
  if (!clientId || !clientSecret || !redirectUri || redirectLooksLikePlayground)
    return null;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function formatDateOnly(
  input: Date | string | null | undefined,
): string | null {
  if (!input) return null;
  if (typeof input === "string") {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }
  if (Number.isNaN(input.getTime())) return null;
  const yyyy = String(input.getFullYear());
  const mm = String(input.getMonth() + 1).padStart(2, "0");
  const dd = String(input.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addOneDay(dateKey: string): string {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateKey;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  dt.setDate(dt.getDate() + 1);
  const yyyy = String(dt.getFullYear());
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysKey(dateKey: string, deltaDays: number): string {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateKey;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yyyy = String(dt.getFullYear());
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getWideTimeRange() {
  const now = new Date();
  const timeMin = new Date(now.getTime() - 3650 * 24 * 60 * 60 * 1000);
  const timeMax = new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000);
  return { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() };
}

async function deleteEventsByPrivateExtendedProperty(params: {
  calendar: calendar_v3.Calendar;
  calendarId: string;
  privateExtendedProperty: string[];
}): Promise<number> {
  const { calendar, calendarId, privateExtendedProperty } = params;
  const { timeMin, timeMax } = getWideTimeRange();
  let deleted = 0;
  let pageToken: string | undefined = undefined;
  for (;;) {
    const resp: { data: calendar_v3.Schema$Events } =
      (await calendar.events.list({
        calendarId,
        maxResults: 2500,
        pageToken,
        showDeleted: false,
        singleEvents: false,
        timeMin,
        timeMax,
        privateExtendedProperty,
      })) as any;
    const items = resp.data.items ?? [];
    for (const e of items) {
      if (!e.id) continue;
      await calendar.events
        .delete({ calendarId, eventId: e.id })
        .catch(() => {});
      deleted += 1;
    }
    pageToken = resp.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }
  return deleted;
}

function isMissingTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return msg.toLowerCase().includes("does not exist");
}

async function getAuthorizedCalendarClient(userId: string) {
  const oauth = getOAuthClient();
  if (!oauth) return null;
  const account = await dbStorage.getGoogleCalendarAccountByUserId(userId);
  if (!account) return null;
  if (!account.refreshToken && !account.accessToken) return null;

  oauth.setCredentials({
    access_token: account.accessToken ?? undefined,
    refresh_token: account.refreshToken ?? undefined,
    token_type: account.tokenType ?? undefined,
    scope: account.scope ?? undefined,
    expiry_date: account.expiryDate ? account.expiryDate.getTime() : undefined,
  });

  oauth.on("tokens", (tokens) => {
    const next: any = {};
    if (tokens.access_token) next.accessToken = tokens.access_token;
    if (tokens.refresh_token) next.refreshToken = tokens.refresh_token;
    if (tokens.scope) next.scope = tokens.scope;
    if (tokens.token_type) next.tokenType = tokens.token_type;
    if (tokens.expiry_date) next.expiryDate = new Date(tokens.expiry_date);
    if (Object.keys(next).length > 0) {
      dbStorage.upsertGoogleCalendarAccount(userId, next).catch(() => {});
    }
  });

  const calendar = google.calendar({ version: "v3", auth: oauth });
  return { calendar, account };
}

export function buildGoogleCalendarAuthUrl(params: {
  state: string;
}): string | null {
  const oauth = getOAuthClient();
  if (!oauth) return null;
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state: params.state,
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });
}

export function createOAuthState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function connectGoogleCalendarWithCode(params: {
  userId: string;
  code: string;
}): Promise<{ connected: boolean }> {
  const oauth = getOAuthClient();
  if (!oauth) return { connected: false };
  const { tokens } = await oauth.getToken(params.code);
  const existing = await dbStorage.getGoogleCalendarAccountByUserId(
    params.userId,
  );
  const next: any = {
    accessToken: tokens.access_token ?? existing?.accessToken ?? null,
    refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
    scope: tokens.scope ?? existing?.scope ?? null,
    tokenType: tokens.token_type ?? existing?.tokenType ?? null,
    expiryDate: tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : (existing?.expiryDate ?? null),
    syncEnabled: true,
  };
  try {
    await dbStorage.upsertGoogleCalendarAccount(params.userId, next);
  } catch (err) {
    if (isMissingTableError(err)) {
      throw new Error(
        "Chưa có bảng Google Calendar trong DB. Hãy chạy lệnh db:push để tạo bảng.",
      );
    }
    throw err;
  }
  return { connected: true };
}

export async function getGoogleCalendarSyncStatus(userId: string) {
  try {
    const account = await dbStorage.getGoogleCalendarAccountByUserId(userId);
    if (!account) {
      return {
        connected: false,
        syncEnabled: false,
        calendarId: "primary",
        syncDateField: "dueDate" as SyncDateField,
      };
    }
    const connected = !!(account.refreshToken || account.accessToken);
    return {
      connected,
      syncEnabled: !!account.syncEnabled,
      calendarId: account.calendarId ?? "primary",
      syncDateField: (account.syncDateField as SyncDateField) ?? "dueDate",
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      return {
        connected: false,
        syncEnabled: false,
        calendarId: "primary",
        syncDateField: "dueDate" as SyncDateField,
      };
    }
    throw err;
  }
}

export async function updateGoogleCalendarSyncSettings(params: {
  userId: string;
  syncEnabled?: boolean;
  calendarId?: string;
  syncDateField?: SyncDateField;
}) {
  const next: any = {};
  if (typeof params.syncEnabled === "boolean")
    next.syncEnabled = params.syncEnabled;
  if (typeof params.calendarId === "string")
    next.calendarId = params.calendarId.trim() || "primary";
  if (
    params.syncDateField === "dueDate" ||
    params.syncDateField === "receivedAt"
  ) {
    next.syncDateField = params.syncDateField;
  }
  try {
    await dbStorage.upsertGoogleCalendarAccount(params.userId, next);
  } catch (err) {
    if (isMissingTableError(err)) return;
    throw err;
  }
}

export async function deleteGoogleCalendarEventsForAssignmentIds(params: {
  userId: string;
  assignmentIds: string[];
}): Promise<void> {
  try {
    const client = await getAuthorizedCalendarClient(params.userId);
    if (!client) return;
    const { calendar } = client;
    const unique = Array.from(new Set(params.assignmentIds.filter(Boolean)));
    for (const assignmentId of unique) {
      const links =
        await dbStorage.getGoogleCalendarEventLinksByUserAndAssignmentId(
          params.userId,
          assignmentId,
        );
      for (const link of links) {
        await calendar.events
          .delete({ calendarId: link.calendarId, eventId: link.eventId })
          .catch(() => {});
        await dbStorage.deleteGoogleCalendarEventLinkById(link.id);
      }
    }
  } catch (err) {
    if (isMissingTableError(err)) return;
    throw err;
  }
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  try {
    const client = await getAuthorizedCalendarClient(userId);
    if (client) {
      const { calendar } = client;
      const links = await dbStorage.getGoogleCalendarEventLinksByUserId(userId);
      for (const link of links) {
        await calendar.events
          .delete({ calendarId: link.calendarId, eventId: link.eventId })
          .catch(() => {});
      }
    }
    await dbStorage.deleteGoogleCalendarEventLinksByUserId(userId);
    await dbStorage.deleteGoogleCalendarAccountByUserId(userId);
  } catch (err) {
    if (isMissingTableError(err)) return;
    throw err;
  }
}

async function syncAssignmentToCalendar(params: {
  userId: string;
  calendarId: string;
  task: {
    id: string;
    title: string | null;
    description: string | null;
    group: string | null;
    status: string | null;
  };
  assignment: {
    id: string;
    dueDate: Date | string | null;
    receivedAt: Date | string | null;
    status?: string | null;
  };
  eventKey: "dueDate";
  startDateKey: string | null;
  endDateKey: string | null;
  summary: string;
  description: string;
  colorId?: string;
  transparency?: "opaque" | "transparent";
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: "popup" | "email"; minutes: number }>;
  };
}): Promise<SyncAction> {
  const client = await getAuthorizedCalendarClient(params.userId);
  if (!client) return "skipped_no_client";
  const { calendar, account } = client;
  if (!account.syncEnabled) return "skipped_disabled";

  const calendarId = params.calendarId || account.calendarId || "primary";
  const startDateKey = params.startDateKey;
  const endDateKey = params.endDateKey;

  const link = await dbStorage.getGoogleCalendarEventLink({
    userId: params.userId,
    taskId: params.task.id,
    taskAssignmentId: params.assignment.id,
    dateField: params.eventKey,
    calendarId,
  });

  if (!startDateKey || !endDateKey) {
    if (link) {
      await calendar.events
        .delete({ calendarId, eventId: link.eventId })
        .catch(() => {});
      await dbStorage.deleteGoogleCalendarEventLinkById(link.id);
      return "deleted";
    }
    return "skipped_no_date";
  }

  const event: any = {
    summary: params.summary,
    description: params.description,
    start: { date: startDateKey },
    end: { date: endDateKey },
    extendedProperties: {
      private: {
        kdpdTaskId: params.task.id,
        kdpdAssignmentId: params.assignment.id,
        kdpdDateField: params.eventKey,
      },
    },
  };
  if (params.colorId) event.colorId = params.colorId;
  if (params.transparency) event.transparency = params.transparency;
  if (params.reminders) {
    event.reminders = params.reminders;
  }

  if (link) {
    try {
      await calendar.events.patch({
        calendarId,
        eventId: link.eventId,
        requestBody: event,
      });
      await dbStorage.updateGoogleCalendarEventLink(link.id, {
        calendarId,
        dateField: params.eventKey,
      });
      return "updated";
    } catch {
      const created = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });
      const eventId = created.data.id;
      if (!eventId) return "skipped_no_event_id";
      await dbStorage.updateGoogleCalendarEventLink(link.id, {
        calendarId,
        dateField: params.eventKey,
        eventId,
      });
      return "updated";
    }
  } else {
    const now = new Date();
    const timeMin = new Date(now.getTime() - 3650 * 24 * 60 * 60 * 1000);
    const timeMax = new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000);
    const existing = await calendar.events
      .list({
        calendarId,
        maxResults: 10,
        singleEvents: true,
        showDeleted: false,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        privateExtendedProperty: [
          `kdpdTaskId=${params.task.id}`,
          `kdpdAssignmentId=${params.assignment.id}`,
          `kdpdDateField=${params.eventKey}`,
        ],
      })
      .catch(() => null);

    const items = existing?.data?.items ?? [];
    const firstId = items[0]?.id ?? null;
    if (firstId) {
      await calendar.events.patch({
        calendarId,
        eventId: firstId,
        requestBody: event,
      });
      await dbStorage.createGoogleCalendarEventLink({
        userId: params.userId,
        taskId: params.task.id,
        taskAssignmentId: params.assignment.id,
        dateField: params.eventKey,
        calendarId,
        eventId: firstId,
      });
      for (const dup of items.slice(1)) {
        if (!dup.id) continue;
        await calendar.events
          .delete({ calendarId, eventId: dup.id })
          .catch(() => {});
      }
      return "updated";
    }

    const created = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });
    const eventId = created.data.id;
    if (!eventId) return "skipped_no_event_id";
    await dbStorage.createGoogleCalendarEventLink({
      userId: params.userId,
      taskId: params.task.id,
      taskAssignmentId: params.assignment.id,
      dateField: params.eventKey,
      calendarId,
      eventId,
    });
    return "created";
  }
}

export async function syncGoogleCalendarForUser(
  userId: string,
): Promise<GoogleCalendarSyncSummary> {
  const base: GoogleCalendarSyncSummary = {
    connected: false,
    syncEnabled: false,
    calendarId: "primary",
    syncDateField: "dueDate",
    totalAssignments: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    skippedNoDate: 0,
    skippedNoClient: 0,
    skippedDisabled: 0,
    skippedNoEventId: 0,
    errors: 0,
  };
  try {
    const client = await getAuthorizedCalendarClient(userId);
    if (!client) {
      base.skippedNoClient = 1;
      return base;
    }
    const { calendar, account } = client;
    base.connected = true;
    base.syncEnabled = !!account.syncEnabled;
    base.calendarId = account.calendarId ?? "primary";
    base.syncDateField =
      (account.syncDateField as SyncDateField) ?? ("dueDate" as SyncDateField);
    if (!account.syncEnabled) {
      base.skippedDisabled = 1;
      return base;
    }

    const pairs = await dbStorage.getTaskAssignmentsWithTaskByUserId(userId);
    const desired = new Set<string>();
    base.totalAssignments = pairs.length;
    for (const { assignment, task } of pairs) {
      try {
        const detailsParts: string[] = [];
        if (task.group) detailsParts.push(`Nhóm: ${task.group}`);
        detailsParts.push(`Task ID: ${task.id}`);
        if (task.description) detailsParts.push(task.description);
        const description = detailsParts.join("\n");

        const assignmentStatusRaw = (assignment as { status?: unknown }).status;
        const status =
          normalizeKdpdStatus(assignmentStatusRaw) ??
          normalizeKdpdStatus(task.status) ??
          "not_started";
        const pres = getGoogleEventPresentation(status);
        const descriptionWithStatus = `${description}\n\nTrạng thái: ${pres.statusLabelVi}`;

        const dueKey = formatDateOnly(assignment.dueDate ?? null);
        const receivedKey = formatDateOnly(assignment.receivedAt ?? null);
        const completedKey = formatDateOnly(
          (assignment as { completedAt?: Date | string | null }).completedAt ??
            null,
        );

        const actions: SyncAction[] = [];

        const dueKeyKey = `${base.calendarId}|${task.id}|${assignment.id}|dueDate`;
        desired.add(dueKeyKey);

        actions.push(
          await syncAssignmentToCalendar({
            userId,
            calendarId: base.calendarId,
            task: {
              id: task.id,
              title: task.title ?? null,
              description: task.description ?? null,
              group: task.group ?? null,
              status: task.status ?? null,
            },
            assignment: {
              id: assignment.id,
              dueDate: assignment.dueDate ?? null,
              receivedAt: assignment.receivedAt ?? null,
              status: (assignment as { status?: string | null }).status ?? null,
            },
            eventKey: "dueDate",
            startDateKey: dueKey,
            endDateKey: dueKey ? addOneDay(dueKey) : null,
            summary: `${pres.prefix}${stripStatusPrefix(task.title ?? "Công việc")}`,
            description:
              descriptionWithStatus +
              (receivedKey ? `\nNgày nhận: ${receivedKey}` : "") +
              (dueKey ? `\nHạn: ${dueKey}` : "") +
              (completedKey ? `\nHoàn thành: ${completedKey}` : ""),
            colorId: pres.colorId,
            transparency: pres.transparency,
            reminders: pres.removeReminders
              ? { useDefault: false, overrides: [] }
              : dueKey && DUE_SOON_DAYS > 0
                ? {
                    useDefault: false,
                    overrides: [
                      { method: "popup", minutes: DUE_SOON_DAYS * 24 * 60 },
                      { method: "popup", minutes: 60 },
                    ],
                  }
                : undefined,
          }),
        );

        for (const action of actions) {
          if (action === "created") base.created += 1;
          else if (action === "updated") base.updated += 1;
          else if (action === "deleted") base.deleted += 1;
          else if (action === "skipped_no_date") base.skippedNoDate += 1;
          else if (action === "skipped_no_client") base.skippedNoClient += 1;
          else if (action === "skipped_disabled") base.skippedDisabled += 1;
          else if (action === "skipped_no_event_id") base.skippedNoEventId += 1;
          else if (action === "error") base.errors += 1;
        }
      } catch {
        base.errors += 1;
      }
    }

    const links = await dbStorage.getGoogleCalendarEventLinksByUserId(userId);
    const byKey = new Map<string, typeof links>();
    for (const link of links) {
      const key = `${link.calendarId}|${link.taskId}|${link.taskAssignmentId ?? ""}|${link.dateField}`;
      const prev = byKey.get(key);
      if (prev) prev.push(link);
      else byKey.set(key, [link]);
    }
    for (const [key, list] of byKey.entries()) {
      list.sort(
        (a, b) =>
          (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0),
      );
      const keep = list[0];
      const dups = list.slice(1);
      for (const dup of dups) {
        await calendar.events
          .delete({ calendarId: dup.calendarId, eventId: dup.eventId })
          .catch(() => {});
        await dbStorage.deleteGoogleCalendarEventLinkById(dup.id);
      }
      const shouldKeep =
        keep.calendarId === base.calendarId && desired.has(key);
      if (shouldKeep) continue;
      await calendar.events
        .delete({ calendarId: keep.calendarId, eventId: keep.eventId })
        .catch(() => {});
      await dbStorage.deleteGoogleCalendarEventLinkById(keep.id);
    }

    await deleteEventsByPrivateExtendedProperty({
      calendar,
      calendarId: base.calendarId,
      privateExtendedProperty: ["kdpdDateField=period"],
    }).catch(() => {});
    await deleteEventsByPrivateExtendedProperty({
      calendar,
      calendarId: base.calendarId,
      privateExtendedProperty: ["kdpdDateField=dueSoon"],
    }).catch(() => {});
    await deleteEventsByPrivateExtendedProperty({
      calendar,
      calendarId: base.calendarId,
      privateExtendedProperty: ["kdpdDateField=receivedAt"],
    }).catch(() => {});
    await dbStorage
      .deleteGoogleCalendarEventLinksByUserAndDateFields(userId, [
        "period",
        "dueSoon",
        "receivedAt",
      ])
      .catch(() => {});

    return base;
  } catch (err) {
    if (isMissingTableError(err)) return base;
    throw err;
  }
}

export async function syncGoogleCalendarForTaskChange(params: {
  taskId: string;
  userIds: string[];
}): Promise<void> {
  const uniqueUserIds = Array.from(new Set(params.userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return;
  try {
    const assignments = await dbStorage.getTaskAssignmentsByTaskId(
      params.taskId,
    );
    const task = await dbStorage.getTaskFromDbById(params.taskId);
    if (!task) return;

    for (const userId of uniqueUserIds) {
      const client = await getAuthorizedCalendarClient(userId);
      if (!client) continue;
      const { calendar, account } = client;
      if (!account.syncEnabled) continue;

      const calendarId = account.calendarId ?? "primary";

      const mine = assignments.filter(
        (a) => String(a.userId) === String(userId),
      );
      const desired = new Set<string>();
      for (const a of mine) {
        const detailsParts: string[] = [];
        if (task.group) detailsParts.push(`Nhóm: ${task.group}`);
        detailsParts.push(`Task ID: ${task.id}`);
        if (task.description) detailsParts.push(task.description);
        const description = detailsParts.join("\n");
        const status =
          normalizeKdpdStatus((a as { status?: unknown }).status) ??
          normalizeKdpdStatus(task.status) ??
          "not_started";
        const pres = getGoogleEventPresentation(status);
        const dueKey = formatDateOnly(a.dueDate ?? null);
        const receivedKey = formatDateOnly(a.receivedAt ?? null);
        const completedKey = formatDateOnly((a as any).completedAt ?? null);
        const descriptionWithStatus =
          `${description}\n\nTrạng thái: ${pres.statusLabelVi}` +
          (receivedKey ? `\nNgày nhận: ${receivedKey}` : "") +
          (dueKey ? `\nHạn: ${dueKey}` : "") +
          (completedKey ? `\nHoàn thành: ${completedKey}` : "");
        desired.add(`${calendarId}|${task.id}|${a.id}|dueDate`);

        await syncAssignmentToCalendar({
          userId,
          calendarId,
          task: {
            id: task.id,
            title: task.title ?? null,
            description: task.description ?? null,
            group: task.group ?? null,
            status: task.status ?? null,
          },
          assignment: {
            id: a.id,
            dueDate: a.dueDate ?? null,
            receivedAt: a.receivedAt ?? null,
            status: (a as { status?: string | null }).status ?? null,
          },
          eventKey: "dueDate",
          startDateKey: dueKey,
          endDateKey: dueKey ? addOneDay(dueKey) : null,
          summary: `${pres.prefix}${stripStatusPrefix(task.title ?? "Công việc")}`,
          description: descriptionWithStatus,
          colorId: pres.colorId,
          transparency: pres.transparency,
          reminders: pres.removeReminders
            ? { useDefault: false, overrides: [] }
            : dueKey && DUE_SOON_DAYS > 0
              ? {
                  useDefault: false,
                  overrides: [
                    { method: "popup", minutes: DUE_SOON_DAYS * 24 * 60 },
                    { method: "popup", minutes: 60 },
                  ],
                }
              : undefined,
        });
      }

      const existingLinks =
        await dbStorage.getGoogleCalendarEventLinksByUserAndTask(
          userId,
          params.taskId,
        );
      const byKey = new Map<string, typeof existingLinks>();
      for (const link of existingLinks) {
        const key = `${link.calendarId}|${link.taskId}|${link.taskAssignmentId ?? ""}|${link.dateField}`;
        const prev = byKey.get(key);
        if (prev) prev.push(link);
        else byKey.set(key, [link]);
      }
      for (const [key, list] of byKey.entries()) {
        list.sort(
          (a, b) =>
            (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0),
        );
        const keep = list[0];
        const dups = list.slice(1);
        for (const dup of dups) {
          await calendar.events
            .delete({ calendarId: dup.calendarId, eventId: dup.eventId })
            .catch(() => {});
          await dbStorage.deleteGoogleCalendarEventLinkById(dup.id);
        }
        const shouldKeep = keep.calendarId === calendarId && desired.has(key);
        if (shouldKeep) continue;
        await calendar.events
          .delete({ calendarId: keep.calendarId, eventId: keep.eventId })
          .catch(() => {});
        await dbStorage.deleteGoogleCalendarEventLinkById(keep.id);
      }

      await deleteEventsByPrivateExtendedProperty({
        calendar,
        calendarId,
        privateExtendedProperty: [
          `kdpdTaskId=${params.taskId}`,
          "kdpdDateField=period",
        ],
      }).catch(() => {});
      await deleteEventsByPrivateExtendedProperty({
        calendar,
        calendarId,
        privateExtendedProperty: [
          `kdpdTaskId=${params.taskId}`,
          "kdpdDateField=dueSoon",
        ],
      }).catch(() => {});
      await deleteEventsByPrivateExtendedProperty({
        calendar,
        calendarId,
        privateExtendedProperty: [
          `kdpdTaskId=${params.taskId}`,
          "kdpdDateField=receivedAt",
        ],
      }).catch(() => {});
    }
  } catch (err) {
    if (isMissingTableError(err)) return;
    throw err;
  }
}

export type GoogleCalendarCleanupSummary = {
  calendarId: string;
  scanned: number;
  candidates: number;
  groups: number;
  deletedEvents: number;
  linked: number;
  updatedLinks: number;
  deletedLinks: number;
  orphanGroupsDeleted: number;
  errors: number;
};

export async function cleanupGoogleCalendarDuplicates(
  userId: string,
): Promise<GoogleCalendarCleanupSummary> {
  const base: GoogleCalendarCleanupSummary = {
    calendarId: "primary",
    scanned: 0,
    candidates: 0,
    groups: 0,
    deletedEvents: 0,
    linked: 0,
    updatedLinks: 0,
    deletedLinks: 0,
    orphanGroupsDeleted: 0,
    errors: 0,
  };
  try {
    const client = await getAuthorizedCalendarClient(userId);
    if (!client) return base;
    const { calendar, account } = client;
    const calendarId = account.calendarId ?? "primary";
    base.calendarId = calendarId;

    const now = new Date();
    const timeMin = new Date(now.getTime() - 3650 * 24 * 60 * 60 * 1000);
    const timeMax = new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000);

    const collected: Array<{
      eventId: string;
      taskId: string;
      assignmentId: string;
      dateField: string;
      updated?: string;
      created?: string;
    }> = [];

    let pageToken: string | undefined = undefined;
    for (;;) {
      const resp: { data: calendar_v3.Schema$Events } =
        (await calendar.events.list({
          calendarId,
          maxResults: 2500,
          pageToken,
          showDeleted: false,
          singleEvents: false,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          q: "Task ID:",
        })) as any;
      const items = resp.data.items ?? [];
      base.scanned += items.length;
      for (const e of items) {
        const eventId = e.id;
        const priv = (e.extendedProperties as any)?.private ?? {};
        const taskId =
          typeof priv.kdpdTaskId === "string" ? priv.kdpdTaskId : "";
        const assignmentId =
          typeof priv.kdpdAssignmentId === "string"
            ? priv.kdpdAssignmentId
            : "";
        const dateField =
          typeof priv.kdpdDateField === "string" ? priv.kdpdDateField : "";
        if (!eventId || !taskId || !assignmentId || !dateField) continue;
        collected.push({
          eventId,
          taskId,
          assignmentId,
          dateField,
          updated: e.updated ?? undefined,
          created: e.created ?? undefined,
        });
      }
      pageToken = resp.data.nextPageToken ?? undefined;
      if (!pageToken) break;
    }

    base.candidates = collected.length;

    const groups = new Map<string, typeof collected>();
    for (const item of collected) {
      const key = `${item.taskId}|${item.assignmentId}|${item.dateField}`;
      const prev = groups.get(key);
      if (prev) prev.push(item);
      else groups.set(key, [item]);
    }
    base.groups = groups.size;

    for (const [key, list] of groups.entries()) {
      list.sort((a, b) => {
        const au = Date.parse(a.updated ?? a.created ?? "") || 0;
        const bu = Date.parse(b.updated ?? b.created ?? "") || 0;
        return bu - au;
      });

      const keep = list[0];
      if (!keep) continue;

      const assignment = await dbStorage.getTaskAssignmentById(
        keep.assignmentId,
      );
      const assignmentValid =
        assignment && String(assignment.taskId) === String(keep.taskId);
      if (!assignmentValid) {
        for (const item of list) {
          await calendar.events
            .delete({ calendarId, eventId: item.eventId })
            .catch(() => {});
          base.deletedEvents += 1;
        }
        const links =
          await dbStorage.getGoogleCalendarEventLinksByUserAndAssignmentId(
            userId,
            keep.assignmentId,
          );
        for (const link of links) {
          await dbStorage.deleteGoogleCalendarEventLinkById(link.id);
          base.deletedLinks += 1;
        }
        base.orphanGroupsDeleted += 1;
        continue;
      }

      for (const item of list.slice(1)) {
        await calendar.events
          .delete({ calendarId, eventId: item.eventId })
          .catch(() => {});
        base.deletedEvents += 1;
      }

      try {
        const existing = await dbStorage.getGoogleCalendarEventLink({
          userId,
          taskId: keep.taskId,
          taskAssignmentId: keep.assignmentId,
          dateField: keep.dateField,
          calendarId,
        });
        if (!existing) {
          await dbStorage.createGoogleCalendarEventLink({
            userId,
            taskId: keep.taskId,
            taskAssignmentId: keep.assignmentId,
            dateField: keep.dateField,
            calendarId,
            eventId: keep.eventId,
          });
          base.linked += 1;
        } else if (existing.eventId !== keep.eventId) {
          await dbStorage.updateGoogleCalendarEventLink(existing.id, {
            eventId: keep.eventId,
          });
          base.updatedLinks += 1;
        }

        const links =
          await dbStorage.getGoogleCalendarEventLinksByUserAndAssignmentId(
            userId,
            keep.assignmentId,
          );
        for (const link of links) {
          if (link.calendarId !== calendarId) continue;
          if (link.taskId !== keep.taskId) continue;
          if (link.dateField !== keep.dateField) continue;
          if (link.eventId === keep.eventId) continue;
          await dbStorage.deleteGoogleCalendarEventLinkById(link.id);
          base.deletedLinks += 1;
        }
      } catch {
        base.errors += 1;
      }
    }

    return base;
  } catch (err) {
    if (isMissingTableError(err)) return base;
    throw err;
  }
}
