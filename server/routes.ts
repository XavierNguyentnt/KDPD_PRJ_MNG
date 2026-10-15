import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type {
  Task,
  User,
  UserWithRolesAndGroups,
  TaskWithAssignmentDetails,
} from "@shared/schema";
import { UserRole } from "@shared/schema";
import { db, pool } from "./db";
import * as dbStorage from "./db-storage";
import { registerModularRoutes } from "./routes/index";
import { requireAuth, requireRole } from "./middleware";
import { buildNotificationContent } from "./notifications";
import { sendNotificationEmail } from "./email";
import { sendWebPushToUser } from "./push";
import {
  deleteGoogleCalendarEventsForAssignmentIds,
  syncGoogleCalendarForTaskChange,
} from "./google-calendar-sync";

// Loại bỏ các helper sanitizeUser, generateStrongPassword không dùng nữa
const FEATURE_WORK_ENABLED = process.env.FEATURE_WORK_ENABLED === "true";

/** Validate task_type + related_contract: nếu gắn hợp đồng thì bắt buộc work và task_type không phải GENERAL. */
function validateTaskContractLink(payload: {
  taskType?: string | null;
  relatedWorkId?: string | null;
  relatedContractId?: string | null;
}): void {
  if (!FEATURE_WORK_ENABLED) return;
  const { relatedContractId, relatedWorkId, taskType } = payload;
  if (!relatedContractId) return;
  const type = (taskType ?? "GENERAL").trim();
  if (type === "GENERAL" || type === "Admin") {
    throw new Error(
      "Task GENERAL không được gắn hợp đồng (related_contract_id). Chọn task_type TRANSLATION hoặc PROOFREADING.",
    );
  }
  if (!relatedWorkId) {
    throw new Error(
      "Khi gắn hợp đồng (related_contract_id) bắt buộc phải có related_work_id.",
    );
  }
}

function parseDateOnly(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  const s = String(input);
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = Number.parseInt(isoMatch[1], 10);
    const m = Number.parseInt(isoMatch[2], 10) - 1;
    const d = Number.parseInt(isoMatch[3], 10);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function validateContractDates(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  actualCompletionDate: string | Date | null | undefined,
): string | null {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const actual = parseDateOnly(actualCompletionDate);
  if (start && end && end.getTime() < start.getTime()) {
    return "Ngày kết thúc hợp đồng không được nhỏ hơn ngày bắt đầu.";
  }
  if (start && actual && actual.getTime() < start.getTime()) {
    return "Ngày hoàn thành thực tế không được nhỏ hơn ngày bắt đầu.";
  }
  return null;
}

function hasOwnField(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function validateAssignmentDates(
  assignments: Array<{
    receivedAt?: string;
    dueDate?: string;
    completedAt?: string;
  }>,
): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const a of assignments) {
    const receivedAt = parseDateOnly(a.receivedAt);
    const dueDate = parseDateOnly(a.dueDate);
    const completedAt = parseDateOnly(a.completedAt);
    if (receivedAt && dueDate && dueDate.getTime() < receivedAt.getTime()) {
      return "Ngày hoàn thành dự kiến không được nhỏ hơn ngày nhận công việc.";
    }
    if (
      receivedAt &&
      completedAt &&
      completedAt.getTime() < receivedAt.getTime()
    ) {
      return "Ngày hoàn thành thực tế không được nhỏ hơn ngày nhận công việc.";
    }
    if (completedAt && completedAt.getTime() > today.getTime()) {
      return "Ngày hoàn thành thực tế không được lớn hơn ngày hiện tại.";
    }
  }
  return null;
}

function requireDb(): void {
  if (!db) {
    throw new Error(
      "Database not configured. Set DATABASE_URL for users/contracts/documents API.",
    );
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  const TASKS_LIST_CACHE_TTL_MS = Math.max(
    0,
    Number.parseInt(process.env.TASKS_LIST_CACHE_TTL_MS || "5000", 10) || 0,
  );
  const tasksListCache = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();
  const invalidateTasksListCache = () => {
    tasksListCache.clear();
  };

  // Đăng ký các route đã được module hóa (Auth, Backup, Google Calendar, Notifications, Works, Users)
  registerModularRoutes(app);

  // ---------- Tasks (require auth) ----------
  app.get(api.tasks.list.path, requireAuth, async (req, res) => {
    try {
      const includeArchived =
        typeof req.query.includeArchived !== "undefined" &&
        (req.query.includeArchived === "1" ||
          req.query.includeArchived === "true");
      const cacheKey = includeArchived
        ? "includeArchived=1"
        : "includeArchived=0";
      if (TASKS_LIST_CACHE_TTL_MS > 0) {
        const hit = tasksListCache.get(cacheKey);
        if (hit && hit.expiresAt > Date.now()) {
          return res.json(hit.value);
        }
      }

      const tasks =
        db && pool
          ? await dbStorage.getTasksFromDbFiltered({ includeArchived })
          : includeArchived
            ? await storage.getTasks()
            : (await storage.getTasks()).filter(
                (t) => String(t.status) !== "Archived",
              );
      if (db) {
        const taskIds = tasks.map((t) => t.id);
        const assignments =
          await dbStorage.getTaskAssignmentsByTaskIds(taskIds);
        const assignmentsByTask = new Map<string, (typeof assignments)[0][]>();
        for (const a of assignments) {
          const list = assignmentsByTask.get(a.taskId) ?? [];
          list.push(a);
          assignmentsByTask.set(a.taskId, list);
        }
        const firstByTask = new Map<string, (typeof assignments)[0]>();
        for (const a of assignments) {
          if (!firstByTask.has(a.taskId)) firstByTask.set(a.taskId, a);
        }
        const userIds = Array.from(new Set(assignments.map((a) => a.userId)));
        const users = await dbStorage.getUsersByIds(userIds);
        const userMap = new Map<string, User>(users.map((u) => [u.id, u]));
        const result: TaskWithAssignmentDetails[] = tasks.map((t) => {
          const taskAssignmentsList = assignmentsByTask.get(t.id) ?? [];
          const first = firstByTask.get(t.id);
          const a = first;
          if (!a && taskAssignmentsList.length === 0)
            return t as TaskWithAssignmentDetails;
          const u = a ? userMap.get(a.userId) : undefined;
          const assignmentsWithDisplay = taskAssignmentsList
            .sort(
              (x, y) =>
                x.roundNumber - y.roundNumber ||
                String(x.stageType).localeCompare(String(y.stageType)),
            )
            .map((asn) => ({
              ...asn,
              displayName: userMap.get(asn.userId)?.displayName ?? null,
            }));
          // Ngày nhận công việc = ngày đầu tiên nhận trong số các nhân sự (min receivedAt)
          let receivedAtMin: string | null = null;
          let actualCompletedAtMax: Date | null = null;
          for (const asn of taskAssignmentsList) {
            if (asn.receivedAt) {
              const d =
                typeof asn.receivedAt === "string"
                  ? asn.receivedAt
                  : (asn.receivedAt as Date).toISOString().slice(0, 10);
              if (!receivedAtMin || d < receivedAtMin) receivedAtMin = d;
            }
            if (asn.completedAt) {
              const d =
                asn.completedAt instanceof Date
                  ? asn.completedAt
                  : new Date(asn.completedAt);
              if (!actualCompletedAtMax || d > actualCompletedAtMax)
                actualCompletedAtMax = d;
            }
          }
          return {
            ...t,
            assigneeId: a?.userId ?? null,
            assignee:
              u?.displayName ??
              (taskAssignmentsList.length > 0
                ? taskAssignmentsList
                    .map((asn) => userMap.get(asn.userId)?.displayName)
                    .filter(Boolean)
                    .join(", ")
                : null),
            dueDate: a?.dueDate
              ? typeof a.dueDate === "string"
                ? a.dueDate
                : (a.dueDate as Date).toISOString().slice(0, 10)
              : null,
            actualCompletedAt: actualCompletedAtMax ?? a?.completedAt ?? null,
            receivedAt: receivedAtMin ?? a?.receivedAt ?? null,
            assignments:
              assignmentsWithDisplay.length > 0
                ? assignmentsWithDisplay
                : undefined,
          } as TaskWithAssignmentDetails;
        });
        if (TASKS_LIST_CACHE_TTL_MS > 0) {
          tasksListCache.set(cacheKey, {
            expiresAt: Date.now() + TASKS_LIST_CACHE_TTL_MS,
            value: result,
          });
        }
        return res.json(result);
      }
      if (TASKS_LIST_CACHE_TTL_MS > 0) {
        tasksListCache.set(cacheKey, {
          expiresAt: Date.now() + TASKS_LIST_CACHE_TTL_MS,
          value: tasks,
        });
      }
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch tasks";
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Error stack:", errorStack);
      res.status(500).json({
        message: errorMessage,
        error: process.env.NODE_ENV === "development" ? errorStack : undefined,
      });
    }
  });

  app.post("/api/tasks/:id/redo", requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const oldTask = await storage.getTask(id);
      if (!oldTask) return res.status(404).json({ message: "Task not found" });
      const vote = oldTask.vote ?? null;
      const allowedVotes = new Set(["khong_tot", "khong_hoan_thanh"]);
      if (!allowedVotes.has(String(vote))) {
        return res.status(400).json({
          message:
            "Chỉ cho phép làm lại khi đánh giá là 'Không tốt' hoặc 'Không hoàn thành'",
        });
      }
      const assignments = await dbStorage.getTaskAssignmentsByTaskId(id);
      const reqUser = req.user as UserWithRolesAndGroups;
      const isController = assignments.some(
        (a) =>
          a.userId === reqUser.id &&
          (a.stageType === "kiem_soat" || a.stageType === "doc_duyet"),
      );
      if (!isController) {
        return res
          .status(403)
          .json({ message: "Chỉ người kiểm soát có thể yêu cầu làm lại" });
      }
      const allTasks = await dbStorage.getTasksFromDb();
      const stripSuffix = (title: string) =>
        title.replace(/\s*\(Làm lại lần\s+\d+\)\s*$/i, "").trim();
      const baseTitle = stripSuffix(oldTask.title);
      const redoCount =
        allTasks.filter(
          (t) =>
            stripSuffix(t.title) === baseTitle &&
            /\(Làm lại lần\s+\d+\)$/i.test(t.title),
        ).length + 1;
      const newTitle = `${baseTitle} (Làm lại lần ${redoCount})`;
      await storage.updateTask(id, { status: "Archived" });
      invalidateTasksListCache();
      const now = new Date();
      const newTask = await storage.createTask({
        title: newTitle,
        description: oldTask.description ?? null,
        group: oldTask.group ?? null,
        createdBy: reqUser.id,
        status: "Not Started",
        priority: oldTask.priority,
        progress: 0,
        notes: oldTask.notes ?? null,
        workflow: oldTask.workflow ?? null,
        sourceSheetId: null,
        sourceSheetName: null,
        contractId: oldTask.contractId ?? null,
        taskType: oldTask.taskType ?? null,
        relatedWorkId: oldTask.relatedWorkId ?? null,
        relatedContractId: oldTask.relatedContractId ?? null,
        vote: null,
        posOrder: 0,
        createdAt: now,
        updatedAt: now,
      });
      // Sao chép assignments: giữ cả người kiểm soát và người thực hiện; reset ngày & trạng thái
      for (const a of assignments) {
        await dbStorage.createTaskAssignment({
          taskId: newTask.id,
          userId: a.userId,
          stageType: a.stageType,
          roundNumber: 1,
          receivedAt: null,
          dueDate: null,
          completedAt: null,
          assignedBy: reqUser.id,
          status: "not_started",
          progress: 0,
          notes: null,
        });
      }
      res.json(newTask);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to redo task",
      });
    }
  });

  app.get(api.tasks.get.path, requireAuth, async (req, res) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      const include =
        typeof req.query.include === "string" ? req.query.include : "";
      if (db) {
        const assignments = await dbStorage.getTaskAssignmentsByTaskId(id);
        const first = assignments[0];
        let withDetails: TaskWithAssignmentDetails =
          task as TaskWithAssignmentDetails;
        if (first) {
          const u = await dbStorage.getUserById(first.userId);
          withDetails = {
            ...task,
            assigneeId: first.userId,
            assignee: u?.displayName ?? null,
            dueDate: first.dueDate
              ? typeof first.dueDate === "string"
                ? first.dueDate
                : (first.dueDate as Date).toISOString().slice(0, 10)
              : null,
            actualCompletedAt: first.completedAt ?? null,
          } as TaskWithAssignmentDetails;
        }
        if (include.split(",").includes("assignments")) {
          return res.json({ ...withDetails, assignments });
        }
        return res.json(withDetails);
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch task";
      res.status(500).json({ message });
    }
  });

  app.patch(api.tasks.update.path, requireAuth, async (req, res) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const body = req.body as Record<string, unknown>;
      const input = api.tasks.update.input.parse(req.body);
      if (typeof body.notes === "string" || body.notes === null) {
        (input as Record<string, unknown>).notes =
          body.notes === "" ? null : body.notes;
      }
      // Đảm bảo vote (đánh giá) chỉ được phép bởi Người kiểm soát/Doc duyệt
      const currentUserId = (req.user as UserWithRolesAndGroups).id;
      let allowSetVote = false;
      if (db) {
        try {
          const assns = await dbStorage.getTaskAssignmentsByTaskId(id);
          allowSetVote = assns.some(
            (a) =>
              a.userId === currentUserId &&
              (a.stageType === "kiem_soat" || a.stageType === "doc_duyet"),
          );
        } catch {
          allowSetVote = false;
        }
      }
      if ("vote" in body) {
        if (allowSetVote) {
          (input as Record<string, unknown>).vote =
            body.vote === "" || body.vote === undefined ? null : body.vote;
        } else {
          delete (input as Record<string, unknown>).vote;
        }
      }
      if (
        FEATURE_WORK_ENABLED &&
        (input.taskType !== undefined ||
          input.relatedWorkId !== undefined ||
          input.relatedContractId !== undefined)
      ) {
        const existing = await storage.getTask(id);
        const merged = { ...existing, ...input } as {
          taskType?: string | null;
          relatedWorkId?: string | null;
          relatedContractId?: string | null;
        };
        validateTaskContractLink(merged);
      }
      type AssignmentInput = {
        userId: string;
        stageType: string;
        roundNumber?: number;
        receivedAt?: string;
        dueDate?: string;
        completedAt?: string;
        status?: string;
        progress?: number;
        notes?: string | null;
      };
      const assignmentsInput = Array.isArray(
        (req.body as { assignments?: unknown }).assignments,
      )
        ? (req.body as { assignments: AssignmentInput[] }).assignments
        : undefined;
      if (assignmentsInput) {
        const dateError = validateAssignmentDates(assignmentsInput);
        if (dateError) return res.status(400).json({ message: dateError });
      }

      const prevTask = await storage.getTask(id);
      const prevAssignmentsList = db
        ? await dbStorage.getTaskAssignmentsByTaskId(id)
        : [];
      const prevAssignmentMap = new Map(
        prevAssignmentsList.map((x) => [
          `${x.userId}|${x.stageType}|${x.roundNumber ?? 1}`,
          x,
        ]),
      );
      const prevAssignmentKeys = new Set(
        prevAssignmentsList.map(
          (x) => `${x.userId}|${x.stageType}|${x.roundNumber ?? 1}`,
        ),
      );
      const prevCompletedKeys = new Set(
        prevAssignmentsList
          .filter((x) => x.completedAt != null)
          .map((x) => `${x.userId}|${x.stageType}|${x.roundNumber ?? 1}`),
      );
      const task = await storage.updateTask(id, input);
      invalidateTasksListCache();

      if (db && assignmentsInput !== undefined) {
        const inputKeys = new Set(
          assignmentsInput.map(
            (x) => `${x.userId}|${x.stageType}|${x.roundNumber ?? 1}`,
          ),
        );

        const removed = prevAssignmentsList.filter(
          (x) =>
            !inputKeys.has(`${x.userId}|${x.stageType}|${x.roundNumber ?? 1}`),
        );

        if (removed.length > 0) {
          const byUser = new Map<string, string[]>();
          for (const r of removed) {
            const list = byUser.get(r.userId);
            if (list) list.push(r.id);
            else byUser.set(r.userId, [r.id]);
          }
          for (const [userId, assignmentIds] of byUser.entries()) {
            await deleteGoogleCalendarEventsForAssignmentIds({
              userId,
              assignmentIds,
            }).catch(() => {});
          }
        }

        if (assignmentsInput.length > 0) {
          for (const a of assignmentsInput) {
            const isController =
              a.stageType === "kiem_soat" || a.stageType === "doc_duyet";
            const key = `${a.userId}|${a.stageType}|${a.roundNumber ?? 1}`;
            const prev = prevAssignmentMap.get(key);
            let completedAt: Date | null = null;
            if (isController) {
              completedAt = null;
            } else if (a.userId === currentUserId) {
              completedAt = a.completedAt
                ? typeof a.completedAt === "string"
                  ? new Date(a.completedAt)
                  : new Date(a.completedAt)
                : null;
            } else {
              completedAt =
                prev?.completedAt != null ? new Date(prev.completedAt) : null;
            }

            const assignmentData = {
              taskId: id,
              userId: a.userId,
              stageType: a.stageType,
              roundNumber: a.roundNumber ?? 1,
              receivedAt: a.receivedAt
                ? typeof a.receivedAt === "string"
                  ? a.receivedAt
                  : new Date(a.receivedAt).toISOString().slice(0, 10)
                : null,
              dueDate: a.dueDate
                ? typeof a.dueDate === "string"
                  ? a.dueDate
                  : new Date(a.dueDate).toISOString().slice(0, 10)
                : null,
              completedAt,
              assignedBy: (req.user as UserWithRolesAndGroups)?.id ?? undefined,
              status: a.status ?? "not_started",
              progress: a.progress ?? 0,
              notes: a.notes ?? null,
            };

            const assignment = prev
              ? await dbStorage.updateTaskAssignment(prev.id, assignmentData)
              : await dbStorage.createTaskAssignment(assignmentData);

            const existing = await dbStorage.getNotificationByTaskType(
              a.userId,
              id,
              "task_assigned",
            );
            if (!prevAssignmentKeys.has(key) && !existing) {
              const controllerIdsInput = assignmentsInput
                .filter((x) => x.stageType === "kiem_soat")
                .map((x) => x.userId);
              const controllerIdsDb = prevAssignmentsList
                .filter((x) => x.stageType === "kiem_soat")
                .map((x) => x.userId);
              const controllerIds = Array.from(
                new Set([...controllerIdsDb, ...controllerIdsInput]),
              );
              const controllerUsers = controllerIds.length
                ? await dbStorage.getUsersByIds(controllerIds)
                : [];
              const controllerNames = controllerUsers
                .map((u) => u.displayName)
                .filter(Boolean) as string[];
              const content = buildNotificationContent("task_assigned", {
                taskTitle: task.title ?? "",
                taskId: id,
                group: task.group ?? null,
                assignerName:
                  (req.user as UserWithRolesAndGroups)?.displayName ?? null,
                assignedAt: new Date().toISOString(),
                assignmentDueDate: a.dueDate ?? null,
                assignmentNotes: a.notes ?? null,
                controllerNames,
              });
              const created = await dbStorage.createNotification({
                userId: a.userId,
                type: "task_assigned",
                taskId: id,
                taskAssignmentId: assignment.id,
                title: content.title,
                message: content.message,
                isRead: false,
                createdAt: new Date(),
                readAt: null,
              });
              await sendNotificationEmail(a.userId, created, {
                taskTitle: task.title ?? "",
                taskId: id,
                group: task.group ?? null,
                assignerName:
                  (req.user as UserWithRolesAndGroups)?.displayName ?? null,
                assignedAt: new Date().toISOString(),
                assignmentDueDate: a.dueDate ?? null,
                assignmentNotes: a.notes ?? null,
                controllerNames,
              });
              await sendWebPushToUser(a.userId, created, { url: "/" });
            }

            if (a.completedAt && !prevCompletedKeys.has(key)) {
              const controllerIds = Array.from(
                new Set(
                  assignmentsInput
                    .filter((x) => x.stageType === "kiem_soat")
                    .map((x) => x.userId),
                ),
              ).filter((uid) => uid !== a.userId);
              const assigneeUser = await dbStorage.getUserById(a.userId);
              const assigneeName = assigneeUser?.displayName ?? null;
              const assignerId =
                assignment.assignedBy &&
                typeof assignment.assignedBy === "string"
                  ? (assignment.assignedBy as string)
                  : null;
              const assignerUser = assignerId
                ? await dbStorage.getUserById(assignerId)
                : undefined;
              const assignerName = assignerUser?.displayName ?? null;
              const recipientIds = Array.from(
                new Set([
                  ...controllerIds,
                  ...(assignerId && assignerId !== a.userId
                    ? [assignerId]
                    : []),
                ]),
              );
              for (const uid of recipientIds) {
                const recipientIsController = controllerIds.includes(uid);
                const existingCompleted =
                  await dbStorage.getNotificationByTaskType(
                    uid,
                    id,
                    "task_completed",
                  );
                if (!existingCompleted) {
                  const content = buildNotificationContent("task_completed", {
                    taskTitle: task.title ?? "",
                    taskId: id,
                    group: task.group ?? null,
                    assigneeName,
                    assignerName,
                    completedAt:
                      typeof a.completedAt === "string"
                        ? a.completedAt
                        : ((a.completedAt as Date)?.toISOString() ?? null),
                    recipientIsController,
                  });
                  const created = await dbStorage.createNotification({
                    userId: uid,
                    type: "task_completed",
                    taskId: id,
                    taskAssignmentId: assignment.id,
                    title: content.title,
                    message: content.message,
                    isRead: false,
                    createdAt: new Date(),
                    readAt: null,
                  });
                  await sendNotificationEmail(uid, created, {
                    taskTitle: task.title ?? "",
                    taskId: id,
                    group: task.group ?? null,
                    assigneeName,
                    assignerName,
                    completedAt:
                      typeof a.completedAt === "string"
                        ? a.completedAt
                        : ((a.completedAt as Date)?.toISOString() ?? null),
                    recipientIsController,
                  });
                  await sendWebPushToUser(uid, created, { url: "/" });
                }
              }
            }
          }
        }

        for (const r of removed) {
          await dbStorage.deleteTaskAssignment(r.id);
        }
        {
          const prevVote =
            (prevTask?.vote ?? null) != null
              ? String(prevTask?.vote).trim().toLowerCase()
              : null;
          const nextVote =
            (task.vote ?? null) != null
              ? String(task.vote).trim().toLowerCase()
              : null;
          const voteChanged = prevVote !== nextVote && nextVote != null;
          if (voteChanged) {
            const allAssignments =
              await dbStorage.getTaskAssignmentsByTaskId(id);
            for (const a of allAssignments) {
              if (a.stageType === "kiem_soat") continue;
              const existing = await dbStorage.getNotificationByTaskType(
                a.userId,
                id,
                "task_reviewed",
              );
              if (!existing) {
                const content = buildNotificationContent("task_reviewed", {
                  taskTitle: task.title ?? "",
                  taskId: id,
                  group: task.group ?? null,
                  vote: task.vote ?? null,
                });
                const created = await dbStorage.createNotification({
                  userId: a.userId,
                  type: "task_reviewed",
                  taskId: id,
                  taskAssignmentId: a.id,
                  title: content.title,
                  message: content.message,
                  isRead: false,
                  createdAt: new Date(),
                  readAt: null,
                });
                await sendNotificationEmail(a.userId, created, {
                  taskTitle: task.title ?? "",
                  taskId: id,
                  group: task.group ?? null,
                  vote: task.vote ?? null,
                });
                await sendWebPushToUser(a.userId, created, { url: "/" });
              }
            }
          }
        }
      }

      if (db) {
        const ids = new Set<string>();
        for (const a of prevAssignmentsList) ids.add(String(a.userId));
        if (assignmentsInput) {
          for (const a of assignmentsInput) ids.add(String(a.userId));
        }
        syncGoogleCalendarForTaskChange({
          taskId: id,
          userIds: Array.from(ids),
        }).catch(() => {});
      }

      res.json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      // Handle 404 from storage
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      console.error("Error updating task:", err);
      const message =
        err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ message });
    }
  });

  app.post(api.tasks.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.tasks.create.input.parse(req.body);
      if (FEATURE_WORK_ENABLED) validateTaskContractLink(input);
      type AssignmentInput = {
        userId: string;
        stageType: string;
        roundNumber?: number;
        receivedAt?: string;
        dueDate?: string;
        completedAt?: string;
        status?: string;
        progress?: number;
        notes?: string | null;
      };
      const assignmentsInput = Array.isArray(
        (req.body as { assignments?: unknown }).assignments,
      )
        ? (req.body as { assignments: AssignmentInput[] }).assignments
        : undefined;
      if (assignmentsInput) {
        const dateError = validateAssignmentDates(assignmentsInput);
        if (dateError) return res.status(400).json({ message: dateError });
      }

      const reqUser = req.user as UserWithRolesAndGroups;
      const userRoleNames = Array.isArray(reqUser?.roles)
        ? reqUser.roles.map((r) => r.name)
        : [];
      const isEmployee = userRoleNames.includes(UserRole.EMPLOYEE);
      if (isEmployee) {
        const group = (input.group ?? "").trim();
        const norm = (s: string) =>
          s
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "");
        const groupKey = norm(group);
        const cvChungKeys = new Set([
          norm("Công việc chung"),
          norm("CV chung"),
        ]);
        if (!groupKey) {
          return res.status(400).json({
            message:
              "Nhân viên phải chọn nhóm công việc khi tạo công việc mới.",
          });
        }
        if (!cvChungKeys.has(groupKey)) {
          const userGroupKeys = new Set<string>();
          for (const g of reqUser?.groups ?? []) {
            const n = typeof g?.name === "string" ? g.name : "";
            const c = typeof g?.code === "string" ? g.code : "";
            const nk = norm(n);
            const ck = norm(c);
            if (nk) userGroupKeys.add(nk);
            if (ck) userGroupKeys.add(ck);
          }
          const ok = Array.from(userGroupKeys).some(
            (k) => groupKey.includes(k) || k.includes(groupKey),
          );
          if (!ok) {
            return res.status(403).json({
              message:
                "Bạn không có quyền tạo công việc cho nhóm này. Vui lòng chọn nhóm thuộc quyền của bạn.",
            });
          }
        }
      }

      const now = new Date();
      const body = req.body as Record<string, unknown>;
      const notesValue =
        input.notes ??
        (typeof body.notes === "string"
          ? body.notes
          : body.notes === null
            ? null
            : undefined);
      const voteValue =
        input.vote ??
        (body.vote !== undefined && body.vote !== "" ? body.vote : null);
      const taskData: Omit<Task, "id"> = {
        title: input.title,
        status: input.status,
        priority: input.priority,
        progress: input.progress ?? 0,
        description: input.description ?? null,
        notes:
          notesValue !== undefined
            ? notesValue === ""
              ? null
              : notesValue
            : null,
        group: input.group ?? null,
        workflow: input.workflow ?? null,
        sourceSheetId: input.sourceSheetId ?? null,
        sourceSheetName: input.sourceSheetName ?? null,
        createdBy: (req.user as UserWithRolesAndGroups)?.id ?? null,
        contractId: input.contractId ?? null,
        taskType: input.taskType ?? null,
        relatedWorkId: input.relatedWorkId ?? null,
        relatedContractId: input.relatedContractId ?? null,
        vote: voteValue as string | null,
        posOrder: 0,
        createdAt: now,
        updatedAt: now,
      };

      const task = await storage.createTask(taskData);
      invalidateTasksListCache();

      if (db && assignmentsInput && assignmentsInput.length > 0) {
        for (const a of assignmentsInput) {
          const assignment = await dbStorage.createTaskAssignment({
            taskId: task.id,
            userId: a.userId,
            stageType: a.stageType,
            roundNumber: a.roundNumber ?? 1,
            receivedAt: a.receivedAt
              ? typeof a.receivedAt === "string"
                ? a.receivedAt
                : new Date(a.receivedAt).toISOString().slice(0, 10)
              : null,
            dueDate: a.dueDate
              ? typeof a.dueDate === "string"
                ? a.dueDate
                : new Date(a.dueDate).toISOString().slice(0, 10)
              : null,
            completedAt: a.completedAt
              ? typeof a.completedAt === "string"
                ? new Date(a.completedAt)
                : new Date(a.completedAt)
              : null,
            assignedBy: (req.user as UserWithRolesAndGroups)?.id ?? undefined,
            status: a.status ?? "not_started",
            progress: a.progress ?? 0,
            notes: a.notes ?? null,
          });
          const existing = await dbStorage.getNotificationByTaskType(
            a.userId,
            task.id,
            "task_assigned",
          );
          if (!existing) {
            const controllerIdsInput = assignmentsInput
              .filter((x) => x.stageType === "kiem_soat")
              .map((x) => x.userId);
            const controllerIdsDb = (
              await dbStorage.getTaskAssignmentsByTaskId(task.id)
            )
              .filter((x) => x.stageType === "kiem_soat")
              .map((x) => x.userId);
            const controllerIds = Array.from(
              new Set([...controllerIdsDb, ...controllerIdsInput]),
            );
            const controllerUsers = controllerIds.length
              ? await dbStorage.getUsersByIds(controllerIds)
              : [];
            const controllerNames = controllerUsers
              .map((u) => u.displayName)
              .filter(Boolean) as string[];
            const content = buildNotificationContent("task_assigned", {
              taskTitle: task.title ?? "",
              taskId: task.id,
              group: task.group ?? null,
              assignerName:
                (req.user as UserWithRolesAndGroups)?.displayName ?? null,
              assignedAt: new Date().toISOString(),
              assignmentDueDate: a.dueDate ?? null,
              assignmentNotes: a.notes ?? null,
              controllerNames,
            });
            const created = await dbStorage.createNotification({
              userId: a.userId,
              type: "task_assigned",
              taskId: task.id,
              taskAssignmentId: assignment.id,
              title: content.title,
              message: content.message,
              isRead: false,
              createdAt: new Date(),
              readAt: null,
            });
            await sendNotificationEmail(a.userId, created, {
              taskTitle: task.title ?? "",
              taskId: task.id,
              group: task.group ?? null,
              assignerName:
                (req.user as UserWithRolesAndGroups)?.displayName ?? null,
              assignedAt: new Date().toISOString(),
              assignmentDueDate: a.dueDate ?? null,
              assignmentNotes: a.notes ?? null,
              controllerNames,
            });
          }
        }
      }

      if (db && assignmentsInput && assignmentsInput.length > 0) {
        const ids = new Set<string>();
        for (const a of assignmentsInput) ids.add(String(a.userId));
        syncGoogleCalendarForTaskChange({
          taskId: task.id,
          userIds: Array.from(ids),
        }).catch(() => {});
      }

      res.json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error("Validation error:", err.errors);
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
          errors: err.errors,
        });
      }
      console.error("Error creating task:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create task";
      const errorStack = err instanceof Error ? err.stack : undefined;
      console.error("Error stack:", errorStack);
      const statusCode = errorMessage.includes("authentication") ? 503 : 500;
      res.status(statusCode).json({
        message: errorMessage,
        error: process.env.NODE_ENV === "development" ? errorStack : undefined,
      });
    }
  });

  app.delete(api.tasks.delete.path, requireAuth, async (req, res) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const existing = await storage.getTask(id);
      if (!existing) return res.status(404).json({ message: "Task not found" });
      const reqUser = req.user as UserWithRolesAndGroups & {
        role?: string | null;
        roles?: Array<{ code?: string | null; name?: string | null }>;
      };
      const reqUserId = reqUser?.id;
      const createdBy = (existing as { createdBy?: string | null }).createdBy;
      const legacyRole =
        typeof reqUser?.role === "string" ? reqUser.role.trim() : "";
      const isAdmin =
        legacyRole.toLowerCase() === "admin" ||
        (Array.isArray(reqUser?.roles)
          ? reqUser.roles.some(
              (r) =>
                r?.name === UserRole.ADMIN ||
                (typeof r?.code === "string" &&
                  r.code.toLowerCase() === "admin") ||
                (typeof r?.name === "string" &&
                  r.name.toLowerCase() === "admin"),
            )
          : false);
      if (!reqUserId || (!isAdmin && (!createdBy || createdBy !== reqUserId))) {
        return res.status(403).json({
          message: "Chỉ người tạo công việc mới có quyền xóa công việc này.",
        });
      }
      await storage.deleteTask(id);
      invalidateTasksListCache();
      res.json({ message: "Task deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      console.error("Error deleting task:", err);
      const message =
        err instanceof Error ? err.message : "Failed to delete task";
      const statusCode = message.includes("authentication") ? 503 : 500;
      res.status(statusCode).json({ message });
    }
  });

  app.post(api.tasks.refresh.path, requireAuth, async (_req, res) => {
    try {
      await storage.refreshTasks();
      res.json({ message: "Tasks refreshed" });
    } catch (error) {
      console.error("Error refreshing tasks:", error);
      const message =
        error instanceof Error ? error.message : "Failed to refresh tasks";
      res.status(500).json({ message });
    }
  });

  app.patch(api.tasks.reorder.path, requireAuth, async (req, res) => {
    try {
      const parsed = api.tasks.reorder.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid reorder payload",
          errors: parsed.error.flatten(),
        });
      }
      const { updates } = parsed.data;
      const deduped: { id: string; posOrder: number }[] = [];
      const seen = new Set<string>();
      for (const u of updates) {
        if (seen.has(u.id)) continue;
        seen.add(u.id);
        deduped.push(u);
      }
      const count = await storage.reorderTasks(deduped);
      invalidateTasksListCache();
      res.json({ message: `Reordered ${count} tasks`, updated: count });
    } catch (error) {
      console.error("Error reordering tasks:", error);
      const message =
        error instanceof Error ? error.message : "Failed to reorder tasks";
      const statusCode = message.includes("authentication") ? 503 : 500;
      res.status(statusCode).json({ message });
    }
  });

  app.get(
    api.translationContracts.list.path,
    requireAuth,
    async (_req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const list = await dbStorage.getTranslationContractsFromDb();
        res.json(list);
      } catch (err) {
        console.error("Error fetching translation contracts:", err);
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to fetch translation contracts",
        });
      }
    },
  );
  app.get(api.translationContracts.get.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getTranslationContractById(id);
      if (!row)
        return res
          .status(404)
          .json({ message: "Translation contract not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({
        message:
          err instanceof Error
            ? err.message
            : "Failed to fetch translation contract",
      });
    }
  });
  const numericKeysTc = [
    "unitPrice",
    "overviewValue",
    "translationValue",
    "contractValue",
    "completionRate",
    "settlementValue",
    "advance1Percent",
    "advance2Percent",
  ] as const;
  const uuidKeysTc = ["componentId", "workId"] as const;
  const normalizeTranslationContractBody = (body: Record<string, unknown>) => {
    const out = { ...body };
    for (const key of numericKeysTc) {
      const v = out[key];
      if (v !== undefined && v !== null && v !== "") {
        out[key] = typeof v === "number" ? String(v) : v;
      }
    }
    for (const key of uuidKeysTc) {
      if (out[key] === "") out[key] = null;
    }
    return out;
  };

  app.post(
    api.translationContracts.create.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const body = normalizeTranslationContractBody(
          (req.body as Record<string, unknown>) || {},
        );
        const input = api.translationContracts.create.input.parse(body);
        const dateError = validateContractDates(
          input.startDate,
          input.endDate,
          input.actualCompletionDate,
        );
        if (dateError) return res.status(400).json({ message: dateError });
        const createPayload = {
          ...input,
          status: input.actualCompletionDate ? "Completed" : input.status,
        };
        if (input.componentId && input.workId && input.contractNumber) {
          const dup = await dbStorage.findDuplicateTranslationContract(
            input.componentId,
            input.workId,
            String(input.contractNumber).trim(),
          );
          if (dup) {
            return res.status(409).json({
              message:
                "Trùng hợp đồng dịch thuật (tác phẩm + số hợp đồng) trong cùng hợp phần.",
            });
          }
        }
        const row = await dbStorage.createTranslationContract(createPayload);
        res.json(row);
      } catch (err) {
        if (err instanceof z.ZodError)
          return res.status(400).json({ message: err.errors[0].message });
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to create translation contract",
        });
      }
    },
  );
  app.patch(
    api.translationContracts.update.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const body = normalizeTranslationContractBody(
          (req.body as Record<string, unknown>) || {},
        );
        const input = api.translationContracts.update.input.parse(body);
        const existing = await dbStorage.getTranslationContractById(id);
        if (!existing)
          return res
            .status(404)
            .json({ message: `Translation contract ${id} not found` });
        const nextActualCompletionDate = hasOwnField(body, "actualCompletionDate")
          ? input.actualCompletionDate
          : existing.actualCompletionDate;
        const dateError = validateContractDates(
          input.startDate ?? existing.startDate,
          input.endDate ?? existing.endDate,
          nextActualCompletionDate,
        );
        if (dateError) return res.status(400).json({ message: dateError });
        const nextStatus =
          nextActualCompletionDate != null
            ? "Completed"
            : hasOwnField(body, "status")
              ? input.status
              : existing.status;
        const updatePayload = {
          ...input,
          status: nextStatus,
        };
        const componentId = input.componentId ?? existing.componentId;
        const workId = input.workId ?? existing.workId;
        const contractNumber = (input.contractNumber ??
          existing.contractNumber) as string | null;
        if (componentId && workId && contractNumber) {
          const dup = await dbStorage.findDuplicateTranslationContract(
            componentId,
            workId,
            String(contractNumber).trim(),
            id,
          );
          if (dup) {
            return res.status(409).json({
              message:
                "Trùng hợp đồng dịch thuật (tác phẩm + số hợp đồng) trong cùng hợp phần.",
            });
          }
        }
        const row = await dbStorage.updateTranslationContract(
          id,
          updatePayload,
        );
        res.json(row);
      } catch (err) {
        if (err instanceof z.ZodError)
          return res.status(400).json({ message: err.errors[0].message });
        if (err instanceof Error && err.message.includes("not found"))
          return res.status(404).json({ message: err.message });
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to update translation contract",
        });
      }
    },
  );
  app.delete(
    api.translationContracts.delete.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const row = await dbStorage.deleteTranslationContract(id);
        res.json(row);
      } catch (err) {
        if (err instanceof Error && err.message.includes("not found"))
          return res.status(404).json({ message: err.message });
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to delete translation contract",
        });
      }
    },
  );

  // ---------- Payments ----------
  app.get(api.payments.list.path, requireAuth, async (_req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const list = await dbStorage.getPayments();
      res.json(list);
    } catch (err) {
      console.error("Error fetching payments:", err);
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to fetch payments",
      });
    }
  });

  app.get(
    api.payments.listByTranslationContract.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const list = await dbStorage.getPaymentsByTranslationContractId(id);
        res.json(list);
      } catch (err) {
        res.status(500).json({
          message:
            err instanceof Error ? err.message : "Failed to fetch payments",
        });
      }
    },
  );
  app.get(
    api.payments.listByProofreadingContract.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const list = await dbStorage.getPaymentsByProofreadingContractId(id);
        res.json(list);
      } catch (err) {
        res.status(500).json({
          message:
            err instanceof Error ? err.message : "Failed to fetch payments",
        });
      }
    },
  );

  app.post(api.payments.create.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const input = api.payments.create.input.parse(req.body);
      const created = await dbStorage.createPayment({
        ...input,
        paymentDate: input.paymentDate
          ? typeof input.paymentDate === "string"
            ? input.paymentDate
            : new Date(input.paymentDate).toISOString().slice(0, 10)
          : null,
      });
      res.json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to create payment",
      });
    }
  });

  app.patch(api.payments.update.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const input = api.payments.update.input.parse(req.body);
      const updated = await dbStorage.updatePayment(id, {
        ...input,
        paymentDate: input.paymentDate
          ? typeof input.paymentDate === "string"
            ? input.paymentDate
            : new Date(input.paymentDate).toISOString().slice(0, 10)
          : null,
      });
      res.json(updated);
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
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to update payment",
      });
    }
  });

  app.delete(api.payments.delete.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deletePayment(id);
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to delete payment",
      });
    }
  });

  app.get(
    api.finance.translationContractSummary.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const summary =
          await dbStorage.getTranslationContractFinanceSummary(id);
        res.json(summary);
      } catch (err) {
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to fetch finance summary",
        });
      }
    },
  );
  app.get(
    api.proofreadingContracts.list.path,
    requireAuth,
    async (_req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const list = await dbStorage.getProofreadingContractsFromDb();
        res.json(list);
      } catch (err) {
        console.error("Error fetching proofreading contracts:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Full error details:", errorMessage);
        res.status(500).json({
          message: errorMessage.includes("proofreader_name")
            ? "Database schema mismatch: proofreader_name column still exists. Please run migration: KDPD_DB_migration_drop_proofreader_name.sql"
            : errorMessage || "Failed to fetch proofreading contracts",
        });
      }
    },
  );
  app.get(api.proofreadingContracts.get.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getProofreadingContractById(id);
      if (!row)
        return res
          .status(404)
          .json({ message: "Proofreading contract not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({
        message:
          err instanceof Error
            ? err.message
            : "Failed to fetch proofreading contract",
      });
    }
  });
  app.get(
    api.finance.proofreadingContractSummary.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const summary =
          await dbStorage.getProofreadingContractFinanceSummary(id);
        res.json(summary);
      } catch (err) {
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to fetch finance summary",
        });
      }
    },
  );
  const numericKeysPc = ["rateRatio", "contractValue"] as const;
  const uuidKeysPc = [
    "componentId",
    "workId",
    "translationContractId",
  ] as const;
  const normalizeProofreadingContractBody = (body: Record<string, unknown>) => {
    const out = { ...body };
    for (const key of numericKeysPc) {
      const v = out[key];
      if (v !== undefined && v !== null && v !== "") {
        out[key] = typeof v === "number" ? String(v) : v;
      }
    }
    for (const key of uuidKeysPc) {
      if (out[key] === "") out[key] = null;
    }
    return out;
  };
  app.post(
    api.proofreadingContracts.create.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const body = normalizeProofreadingContractBody(
          (req.body as Record<string, unknown>) || {},
        );
        const input = api.proofreadingContracts.create.input.parse(body);
        const dateError = validateContractDates(
          input.startDate,
          input.endDate,
          input.actualCompletionDate,
        );
        if (dateError) return res.status(400).json({ message: dateError });
        const row = await dbStorage.createProofreadingContract(input);
        res.json(row);
      } catch (err) {
        if (err instanceof z.ZodError)
          return res.status(400).json({ message: err.errors[0].message });
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to create proofreading contract",
        });
      }
    },
  );
  app.patch(
    api.proofreadingContracts.update.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const body = normalizeProofreadingContractBody(
          (req.body as Record<string, unknown>) || {},
        );
        const input = api.proofreadingContracts.update.input.parse(body);
        const existing = await dbStorage.getProofreadingContractById(id);
        if (!existing)
          return res
            .status(404)
            .json({ message: `Proofreading contract ${id} not found` });
        const nextActualCompletionDate = hasOwnField(body, "actualCompletionDate")
          ? input.actualCompletionDate
          : existing.actualCompletionDate;
        const dateError = validateContractDates(
          input.startDate ?? existing.startDate,
          input.endDate ?? existing.endDate,
          nextActualCompletionDate,
        );
        if (dateError) return res.status(400).json({ message: dateError });
        const row = await dbStorage.updateProofreadingContract(id, input);
        res.json(row);
      } catch (err) {
        if (err instanceof z.ZodError)
          return res.status(400).json({ message: err.errors[0].message });
        if (err instanceof Error && err.message.includes("not found"))
          return res.status(404).json({ message: err.message });
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to update proofreading contract",
        });
      }
    },
  );
  app.delete(
    api.proofreadingContracts.delete.path,
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const row = await dbStorage.deleteProofreadingContract(id);
        res.json(row);
      } catch (err) {
        if (err instanceof Error && err.message.includes("not found"))
          return res.status(404).json({ message: err.message });
        res.status(500).json({
          message:
            err instanceof Error
              ? err.message
              : "Failed to delete proofreading contract",
        });
      }
    },
  );

  // ---------- Components (Hợp phần) ----------
  app.get(api.components.list.path, requireAuth, async (_req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const list = await dbStorage.getComponentsFromDb();
      res.json(list);
    } catch (err) {
      console.error("Error fetching components:", err);
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to fetch components",
      });
    }
  });
  app.get(api.components.get.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getComponentById(id);
      if (!row) return res.status(404).json({ message: "Component not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to fetch component",
      });
    }
  });
  app.post(api.components.create.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const u = req.user as UserWithRolesAndGroups;
      const roles = Array.isArray(u?.roles) ? u.roles : [];
      const hasAdminManager = roles.some(
        (r) => r.name === UserRole.ADMIN || r.name === UserRole.MANAGER,
      );
      const hasSecretary = roles.some(
        (r) => r.name === "Thư ký hợp phần" || r.code === "prj_secretary",
      );
      if (!hasAdminManager && !hasSecretary) {
        return res.status(403).json({
          message:
            "Forbidden. Required role: Admin/Manager/Thư ký hợp phần",
        });
      }
      const input = api.components.create.input.parse(req.body);
      const row = await dbStorage.createComponent(input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to create component",
      });
    }
  });
  app.patch(api.components.update.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const u = req.user as UserWithRolesAndGroups;
      const roles = Array.isArray(u?.roles) ? u.roles : [];
      const hasAdminManager = roles.some(
        (r) => r.name === UserRole.ADMIN || r.name === UserRole.MANAGER,
      );
      const hasSecretary = roles.some(
        (r) => r.name === "Thư ký hợp phần" || r.code === "prj_secretary",
      );
      if (!hasAdminManager && !hasSecretary) {
        return res.status(403).json({
          message:
            "Forbidden. Required role: Admin/Manager/Thư ký hợp phần",
        });
      }
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const input = api.components.update.input.parse(req.body);
      const row = await dbStorage.updateComponent(id, input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error && err.message.includes("not found"))
        return res.status(404).json({ message: err.message });
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to update component",
      });
    }
  });

  // ---------- Contract stages (Giai đoạn hợp đồng) ----------
  app.get(
    "/api/translation-contracts/:contractId/stages",
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const contractId = Array.isArray(req.params.contractId)
          ? req.params.contractId[0]
          : req.params.contractId;
        const list =
          await dbStorage.getContractStagesByTranslationContractId(contractId);
        res.json(list);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          typeof msg === "string" &&
          (msg.includes("contract_stages") ||
            msg.includes("relation") ||
            msg.includes("does not exist") ||
            msg.includes("column"))
        ) {
          return res.json([]);
        }
        res.status(500).json({
          message:
            err instanceof Error ? err.message : "Failed to fetch stages",
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
    },
  );
  app.get(
    "/api/proofreading-contracts/:contractId/stages",
    requireAuth,
    async (req, res) => {
      try {
        if (!db)
          return res.status(503).json({ message: "Database not configured" });
        const contractId = Array.isArray(req.params.contractId)
          ? req.params.contractId[0]
          : req.params.contractId;
        const list =
          await dbStorage.getContractStagesByProofreadingContractId(contractId);
        res.json(list);
      } catch (err) {
        res.status(500).json({
          message:
            err instanceof Error ? err.message : "Failed to fetch stages",
        });
      }
    },
  );
  app.post(api.contractStages.create.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const input = api.contractStages.create.input.parse(req.body);
      const row = await dbStorage.createContractStage(input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({
        message:
          err instanceof Error
            ? err.message
            : "Failed to create contract stage",
      });
    }
  });
  app.patch(api.contractStages.update.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const input = api.contractStages.update.input.parse(req.body);
      const row = await dbStorage.updateContractStage(id, input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error && err.message.includes("not found"))
        return res.status(404).json({ message: err.message });
      res.status(500).json({
        message:
          err instanceof Error
            ? err.message
            : "Failed to update contract stage",
      });
    }
  });
  app.delete(api.contractStages.delete.path, requireAuth, async (req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deleteContractStage(id);
      res.json({ message: "OK" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found"))
        return res.status(404).json({ message: err.message });
      res.status(500).json({
        message:
          err instanceof Error
            ? err.message
            : "Failed to delete contract stage",
      });
    }
  });

  // ---------- Contracts CRUD (require auth) ----------
  app.get(api.contracts.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      const list = await dbStorage.getContracts();
      res.json(list);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to fetch contracts",
      });
    }
  });

  app.get(api.contracts.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const contract = await dbStorage.getContractById(id);
      if (!contract)
        return res.status(404).json({ message: "Contract not found" });
      res.json(contract);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to fetch contract",
      });
    }
  });

  app.post(api.contracts.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const input = api.contracts.create.input.parse(req.body);
      const contract = await dbStorage.createContract(input);
      res.json(contract);
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
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to create contract",
      });
    }
  });

  app.patch(api.contracts.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const input = api.contracts.update.input.parse(req.body);
      const contract = await dbStorage.updateContract(id, input);
      res.json(contract);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
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
          err instanceof Error ? err.message : "Failed to update contract",
      });
    }
  });

  app.delete(api.contracts.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deleteContract(id);
      res.json({ message: "Contract deleted successfully" });
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
        message:
          err instanceof Error ? err.message : "Failed to delete contract",
      });
    }
  });

  // ---------- Documents CRUD (require auth) ----------
  app.get(api.documents.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      const list = await dbStorage.getDocuments();
      res.json(list);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to fetch documents",
      });
    }
  });

  app.get(api.documents.get.path, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const doc = await dbStorage.getDocumentById(id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      res.json(doc);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to fetch document",
      });
    }
  });

  app.post(api.documents.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const input = api.documents.create.input.parse(req.body);
      const doc = await dbStorage.createDocument(input);
      res.json(doc);
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
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "Failed to create document",
      });
    }
  });

  app.patch(api.documents.update.path, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const input = api.documents.update.input.parse(req.body);
      const doc = await dbStorage.updateDocument(id, input);
      res.json(doc);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
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
          err instanceof Error ? err.message : "Failed to update document",
      });
    }
  });

  app.delete(api.documents.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deleteDocument(id);
      res.json({ message: "Document deleted successfully" });
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
        message:
          err instanceof Error ? err.message : "Failed to delete document",
      });
    }
  });

  // ---------- Task assignments CRUD (require auth + DB) ----------
  const handleTaskAssignments = async (
    res: import("express").Response,
    fn: () => Promise<unknown>,
  ) => {
    try {
      requireDb();
      const result = await fn();
      res.json(result);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  };
  app.get(api.taskAssignments.list.path, requireAuth, async (_req, res) => {
    await handleTaskAssignments(res, () => dbStorage.getTaskAssignments());
  });
  app.get(
    api.taskAssignments.listByTask.path,
    requireAuth,
    async (req, res) => {
      const taskId = Array.isArray(req.params.taskId)
        ? req.params.taskId[0]
        : req.params.taskId;
      await handleTaskAssignments(res, () =>
        dbStorage.getTaskAssignmentsByTaskId(taskId),
      );
    },
  );
  app.get(
    api.taskAssignments.listByUser.path,
    requireAuth,
    async (req, res) => {
      const userId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : req.params.userId;
      await handleTaskAssignments(res, () =>
        dbStorage.getTaskAssignmentsByUserId(userId),
      );
    },
  );
  app.get(api.taskAssignments.get.path, requireAuth, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const row = await dbStorage.getTaskAssignmentById(id);
    if (!row)
      return res.status(404).json({ message: "Task assignment not found" });
    res.json(row);
  });
  app.post(api.taskAssignments.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const input = api.taskAssignments.create.input.parse(req.body);
      const row = await dbStorage.createTaskAssignment(input);
      res.json(row);
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.taskAssignments.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const input = api.taskAssignments.update.input.parse(req.body);
      const row = await dbStorage.updateTaskAssignment(id, input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.taskAssignments.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deleteTaskAssignment(id);
      res.json({ message: "Task assignment deleted successfully" });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- Contract members CRUD ----------
  app.get(api.contractMembers.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getContractMembers());
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(
    api.contractMembers.listByContract.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const contractId = Array.isArray(req.params.contractId)
          ? req.params.contractId[0]
          : req.params.contractId;
        res.json(await dbStorage.getContractMembersByContractId(contractId));
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.get(api.contractMembers.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getContractMemberById(id);
      if (!row)
        return res.status(404).json({ message: "Contract member not found" });
      res.json(row);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.post(api.contractMembers.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const input = api.contractMembers.create.input.parse(req.body);
      res.json(await dbStorage.createContractMember(input));
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.contractMembers.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const input = api.contractMembers.update.input.parse(req.body);
      res.json(await dbStorage.updateContractMember(id, input));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.contractMembers.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deleteContractMember(id);
      res.json({ message: "Contract member deleted successfully" });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- Translation contract members CRUD ----------
  app.get(
    api.translationContractMembers.list.path,
    requireAuth,
    async (_req, res) => {
      try {
        requireDb();
        res.json(await dbStorage.getTranslationContractMembers());
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.get(
    api.translationContractMembers.listByContract.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const contractId = Array.isArray(req.params.contractId)
          ? req.params.contractId[0]
          : req.params.contractId;
        res.json(
          await dbStorage.getTranslationContractMembersByContractId(contractId),
        );
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.get(
    api.translationContractMembers.get.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const row = await dbStorage.getTranslationContractMemberById(id);
        if (!row)
          return res
            .status(404)
            .json({ message: "Translation contract member not found" });
        res.json(row);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.post(
    api.translationContractMembers.create.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const input = api.translationContractMembers.create.input.parse(
          req.body,
        );
        res.json(await dbStorage.createTranslationContractMember(input));
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
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.patch(
    api.translationContractMembers.update.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const input = api.translationContractMembers.update.input.parse(
          req.body,
        );
        res.json(await dbStorage.updateTranslationContractMember(id, input));
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
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
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.delete(
    api.translationContractMembers.delete.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        await dbStorage.deleteTranslationContractMember(id);
        res.json({ message: "OK" });
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
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );

  // ---------- Proofreading contract members CRUD ----------
  app.get(
    api.proofreadingContractMembers.list.path,
    requireAuth,
    async (_req, res) => {
      try {
        requireDb();
        res.json(await dbStorage.getProofreadingContractMembers());
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.get(
    api.proofreadingContractMembers.listByContract.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const contractId = Array.isArray(req.params.contractId)
          ? req.params.contractId[0]
          : req.params.contractId;
        res.json(
          await dbStorage.getProofreadingContractMembersByContractId(
            contractId,
          ),
        );
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.get(
    api.proofreadingContractMembers.get.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const row = await dbStorage.getProofreadingContractMemberById(id);
        if (!row)
          return res
            .status(404)
            .json({ message: "Proofreading contract member not found" });
        res.json(row);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Database not configured")
        ) {
          return res.status(503).json({ message: err.message });
        }
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.post(
    api.proofreadingContractMembers.create.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const input = api.proofreadingContractMembers.create.input.parse(
          req.body,
        );
        res.json(await dbStorage.createProofreadingContractMember(input));
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
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.patch(
    api.proofreadingContractMembers.update.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const input = api.proofreadingContractMembers.update.input.parse(
          req.body,
        );
        res.json(await dbStorage.updateProofreadingContractMember(id, input));
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
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
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.delete(
    api.proofreadingContractMembers.delete.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        await dbStorage.deleteProofreadingContractMember(id);
        res.json({ message: "OK" });
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
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );

  // ---------- Document tasks CRUD ----------
  app.get(api.documentTasks.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getDocumentTasks());
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.documentTasks.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getDocumentTaskById(id);
      if (!row)
        return res.status(404).json({ message: "Document task not found" });
      res.json(row);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.post(api.documentTasks.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const input = api.documentTasks.create.input.parse(req.body);
      res.json(await dbStorage.createDocumentTask(input));
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.documentTasks.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const input = api.documentTasks.update.input.parse(req.body);
      res.json(await dbStorage.updateDocumentTask(id, input));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.documentTasks.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deleteDocumentTask(id);
      res.json({ message: "Document task deleted successfully" });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- Document contracts CRUD ----------
  app.get(api.documentContracts.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getDocumentContracts());
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.documentContracts.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getDocumentContractById(id);
      if (!row)
        return res.status(404).json({ message: "Document contract not found" });
      res.json(row);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.post(api.documentContracts.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const input = api.documentContracts.create.input.parse(req.body);
      res.json(await dbStorage.createDocumentContract(input));
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(
    api.documentContracts.update.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const input = api.documentContracts.update.input.parse(req.body);
        res.json(await dbStorage.updateDocumentContract(id, input));
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
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
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );
  app.delete(
    api.documentContracts.delete.path,
    requireAuth,
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        await dbStorage.deleteDocumentContract(id);
        res.json({ message: "Document contract deleted successfully" });
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
        res
          .status(500)
          .json({ message: err instanceof Error ? err.message : "Failed" });
      }
    },
  );

  // ---------- Groups CRUD (bảng groups; GET /api/groups vẫn là task groups) ----------
  app.get(api.groups.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getGroups());
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.groups.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getGroupById(id);
      if (!row) return res.status(404).json({ message: "Group not found" });
      res.json(row);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.post(api.groups.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const input = api.groups.create.input.parse(req.body);
      res.json(await dbStorage.createGroup(input));
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.groups.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const input = api.groups.update.input.parse(req.body);
      res.json(await dbStorage.updateGroup(id, input));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.groups.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deleteGroup(id);
      res.json({ message: "Group deleted successfully" });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- User groups CRUD ----------
  app.get(api.userGroups.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getUserGroups());
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.userGroups.listByUser.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const userId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : req.params.userId;
      res.json(await dbStorage.getUserGroupsByUserId(userId));
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.userGroups.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getUserGroupById(id);
      if (!row)
        return res.status(404).json({ message: "User group not found" });
      res.json(row);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.post(api.userGroups.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const input = api.userGroups.create.input.parse(req.body);
      res.json(await dbStorage.createUserGroup(input));
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.userGroups.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deleteUserGroup(id);
      res.json({ message: "User group deleted successfully" });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- Roles CRUD ----------
  app.get(api.roles.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getRoles());
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.roles.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getRoleById(id);
      if (!row) return res.status(404).json({ message: "Role not found" });
      res.json(row);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.post(api.roles.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const input = api.roles.create.input.parse(req.body);
      res.json(await dbStorage.createRole(input));
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.roles.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const input = api.roles.update.input.parse(req.body);
      res.json(await dbStorage.updateRole(id, input));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.roles.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deleteRole(id);
      res.json({ message: "Role deleted successfully" });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- User roles CRUD ----------
  app.get(api.userRoles.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getUserRoles());
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.userRoles.listByUser.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const userId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : req.params.userId;
      res.json(await dbStorage.getUserRolesByUserId(userId));
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.userRoles.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getUserRoleById(id);
      if (!row) return res.status(404).json({ message: "User role not found" });
      res.json(row);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Database not configured")
      ) {
        return res.status(503).json({ message: err.message });
      }
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.post(api.userRoles.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const input = api.userRoles.create.input.parse(req.body);
      res.json(await dbStorage.createUserRole(input));
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.userRoles.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await dbStorage.deleteUserRole(id);
      res.json({ message: "User role deleted successfully" });
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
      res
        .status(500)
        .json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // Get available groups from DB tasks (legacy: danh sách tên nhóm từ tasks.group)
  app.get("/api/groups", requireAuth, async (_req, res) => {
    try {
      const tasks = await dbStorage.getTasksFromDb();
      const groups = Array.from(
        new Set(
          tasks
            .map((t) => t.group)
            .filter(
              (g): g is string => typeof g === "string" && g.trim().length > 0,
            ),
        ),
      );
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups from DB:", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch groups";
      res.status(500).json({ message });
    }
  });

  return httpServer;
}
