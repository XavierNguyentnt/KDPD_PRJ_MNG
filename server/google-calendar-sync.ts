import { google } from "googleapis";
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
  };
  eventKey: "dueDate" | "receivedAt" | "period" | "dueSoon";
  startDateKey: string | null;
  endDateKey: string | null;
  summary: string;
  description: string;
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

        const dueKey = formatDateOnly(assignment.dueDate ?? null);
        const receivedKey = formatDateOnly(assignment.receivedAt ?? null);

        const actions: SyncAction[] = [];

        const dueKeyKey = `${base.calendarId}|${task.id}|${assignment.id}|dueDate`;
        const periodKeyKey = `${base.calendarId}|${task.id}|${assignment.id}|period`;
        const dueSoonKeyKey = `${base.calendarId}|${task.id}|${assignment.id}|dueSoon`;
        const receivedKeyKey = `${base.calendarId}|${task.id}|${assignment.id}|receivedAt`;
        desired.add(dueKeyKey);
        desired.add(periodKeyKey);
        desired.add(dueSoonKeyKey);
        if (base.syncDateField === "receivedAt") desired.add(receivedKeyKey);

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
            },
            eventKey: "dueDate",
            startDateKey: dueKey,
            endDateKey: dueKey ? addOneDay(dueKey) : null,
            summary: task.title ?? "Công việc",
            description,
            reminders:
              dueKey && DUE_SOON_DAYS > 0
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

        if (receivedKey && dueKey) {
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
              },
              eventKey: "period",
              startDateKey: receivedKey,
              endDateKey: addOneDay(dueKey),
              summary: `${task.title ?? "Công việc"} (Thời gian thực hiện)`,
              description,
            }),
          );
        } else {
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
              },
              eventKey: "period",
              startDateKey: null,
              endDateKey: null,
              summary: `${task.title ?? "Công việc"} (Thời gian thực hiện)`,
              description,
            }),
          );
        }

        if (dueKey && DUE_SOON_DAYS > 0) {
          const warnKey = addDaysKey(dueKey, -DUE_SOON_DAYS);
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
              },
              eventKey: "dueSoon",
              startDateKey: warnKey,
              endDateKey: addOneDay(warnKey),
              summary: `Sắp đến hạn: ${task.title ?? "Công việc"}`,
              description: `${description}\n\nHạn: ${dueKey}`,
            }),
          );
        } else {
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
              },
              eventKey: "dueSoon",
              startDateKey: null,
              endDateKey: null,
              summary: `Sắp đến hạn: ${task.title ?? "Công việc"}`,
              description,
            }),
          );
        }

        if (base.syncDateField === "receivedAt") {
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
              },
              eventKey: "receivedAt",
              startDateKey: receivedKey,
              endDateKey: receivedKey ? addOneDay(receivedKey) : null,
              summary: `Nhận việc: ${task.title ?? "Công việc"}`,
              description,
            }),
          );
        } else {
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
              },
              eventKey: "receivedAt",
              startDateKey: null,
              endDateKey: null,
              summary: `Nhận việc: ${task.title ?? "Công việc"}`,
              description,
            }),
          );
        }

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
      const syncDateField =
        (account.syncDateField as SyncDateField) ?? "dueDate";

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
        const dueKey = formatDateOnly(a.dueDate ?? null);
        const receivedKey = formatDateOnly(a.receivedAt ?? null);
        desired.add(`${calendarId}|${task.id}|${a.id}|dueDate`);
        desired.add(`${calendarId}|${task.id}|${a.id}|period`);
        desired.add(`${calendarId}|${task.id}|${a.id}|dueSoon`);
        if (syncDateField === "receivedAt")
          desired.add(`${calendarId}|${task.id}|${a.id}|receivedAt`);

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
          },
          eventKey: "dueDate",
          startDateKey: dueKey,
          endDateKey: dueKey ? addOneDay(dueKey) : null,
          summary: task.title ?? "Công việc",
          description,
          reminders:
            dueKey && DUE_SOON_DAYS > 0
              ? {
                  useDefault: false,
                  overrides: [
                    { method: "popup", minutes: DUE_SOON_DAYS * 24 * 60 },
                    { method: "popup", minutes: 60 },
                  ],
                }
              : undefined,
        });

        if (receivedKey && dueKey) {
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
            },
            eventKey: "period",
            startDateKey: receivedKey,
            endDateKey: addOneDay(dueKey),
            summary: `${task.title ?? "Công việc"} (Thời gian thực hiện)`,
            description,
          });
        } else {
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
            },
            eventKey: "period",
            startDateKey: null,
            endDateKey: null,
            summary: `${task.title ?? "Công việc"} (Thời gian thực hiện)`,
            description,
          });
        }

        if (dueKey && DUE_SOON_DAYS > 0) {
          const warnKey = addDaysKey(dueKey, -DUE_SOON_DAYS);
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
            },
            eventKey: "dueSoon",
            startDateKey: warnKey,
            endDateKey: addOneDay(warnKey),
            summary: `Sắp đến hạn: ${task.title ?? "Công việc"}`,
            description: `${description}\n\nHạn: ${dueKey}`,
          });
        } else {
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
            },
            eventKey: "dueSoon",
            startDateKey: null,
            endDateKey: null,
            summary: `Sắp đến hạn: ${task.title ?? "Công việc"}`,
            description,
          });
        }

        if (syncDateField === "receivedAt") {
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
            },
            eventKey: "receivedAt",
            startDateKey: receivedKey,
            endDateKey: receivedKey ? addOneDay(receivedKey) : null,
            summary: `Nhận việc: ${task.title ?? "Công việc"}`,
            description,
          });
        } else {
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
            },
            eventKey: "receivedAt",
            startDateKey: null,
            endDateKey: null,
            summary: `Nhận việc: ${task.title ?? "Công việc"}`,
            description,
          });
        }
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
    }
  } catch (err) {
    if (isMissingTableError(err)) return;
    throw err;
  }
}
