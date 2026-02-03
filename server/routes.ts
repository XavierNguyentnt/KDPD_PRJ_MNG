import type { Express } from "express";
import type { Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type { Task, User, UserWithRolesAndGroups, TaskWithAssignmentDetails } from "@shared/schema";
import { UserRole } from "@shared/schema";
import { db, pool } from "./db";
import * as dbStorage from "./db-storage";
import { passport } from "./auth";
import { requireAuth, requireRole } from "./middleware";
import multer from "multer";

/** Feature flag: Work/Contract taxonomy (theo Docs refactor – tắt được khi rollback). */
const FEATURE_WORK_ENABLED = process.env.FEATURE_WORK_ENABLED === "true";

/** Trả về user không chứa password_hash để gửi cho client. */
function sanitizeUser(user: User): Omit<User, "passwordHash"> & { passwordHash?: never } {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

/** Validate task_type + related_contract: nếu gắn hợp đồng thì bắt buộc work và task_type không phải GENERAL. */
function validateTaskContractLink(payload: { taskType?: string | null; relatedWorkId?: string | null; relatedContractId?: string | null }): void {
  if (!FEATURE_WORK_ENABLED) return;
  const { relatedContractId, relatedWorkId, taskType } = payload;
  if (!relatedContractId) return;
  const type = (taskType ?? "GENERAL").trim();
  if (type === "GENERAL" || type === "Admin") {
    throw new Error("Task GENERAL không được gắn hợp đồng (related_contract_id). Chọn task_type TRANSLATION hoặc PROOFREADING.");
  }
  if (!relatedWorkId) {
    throw new Error("Khi gắn hợp đồng (related_contract_id) bắt buộc phải có related_work_id.");
  }
}

const DUE_SOON_DAYS = 7;

function formatDateOnly(input: string | Date | null | undefined): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  return input.toISOString().slice(0, 10);
}

function buildNotificationContent(type: "task_assigned" | "task_due_soon" | "task_overdue", taskTitle: string, dueDate?: string | null) {
  const safeTitle = taskTitle || "Công việc";
  if (type === "task_assigned") {
    return {
      title: "Công việc mới được giao",
      message: `Bạn được giao: ${safeTitle}`,
    };
  }
  if (type === "task_due_soon") {
    return {
      title: "Công việc sắp đến hạn",
      message: dueDate ? `Sắp đến hạn (${dueDate}): ${safeTitle}` : `Sắp đến hạn: ${safeTitle}`,
    };
  }
  return {
    title: "Công việc đã quá hạn",
    message: dueDate ? `Đã quá hạn (${dueDate}): ${safeTitle}` : `Đã quá hạn: ${safeTitle}`,
  };
}


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ---------- Auth (public login; me/logout require auth) ----------
  app.post(api.auth.login.path, (req, res, next) => {
    const input = api.auth.login.input.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ message: input.error.errors[0].message, field: input.error.errors[0].path.join(".") });
    }
    passport.authenticate("local", (err: unknown, user: Express.User | false, info?: { message?: string }) => {
      if (err) {
        return res.status(500).json({ message: err instanceof Error ? err.message : "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message ?? "Invalid email or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: loginErr.message });
        }
        return res.json(sanitizeUser(user as User));
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, requireAuth, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(200).json(null);
    }
    res.json(sanitizeUser(req.user as User));
  });

  // ---------- Dev only: gán lại hash đúng cho mật khẩu 123456 (seed users) ----------
  if (process.env.NODE_ENV === "development" && pool) {
    app.post("/api/dev/fix-password-hashes", async (_req, res) => {
      try {
        const hashFor123456 = await bcrypt.hash("123456", 10);
        const r = await pool!.query(
          "UPDATE users SET password_hash = $1 WHERE email != $2",
          [hashFor123456, "admin@kdpd.local"]
        );
        const updated = r.rowCount ?? 0;
        console.log("[dev] fix-password-hashes: set password 123456 for", updated, "user(s) (excluding admin)");
        return res.json({ message: "OK", updated });
      } catch (err) {
        console.error("[dev] fix-password-hashes error:", err);
        return res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
      }
    });
  }

  // ---------- Tasks (require auth) ----------
  app.get(api.tasks.list.path, requireAuth, async (_req, res) => {
    try {
      const tasks = await storage.getTasks();
      if (db) {
        const taskIds = tasks.map((t) => t.id);
        const assignments = await dbStorage.getTaskAssignmentsByTaskIds(taskIds);
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
        const userMap = new Map<string, User>();
        for (const id of userIds) {
          const u = await dbStorage.getUserById(id);
          if (u) userMap.set(id, u);
        }
        const result: TaskWithAssignmentDetails[] = tasks.map((t) => {
          const taskAssignmentsList = assignmentsByTask.get(t.id) ?? [];
          const first = firstByTask.get(t.id);
          const a = first;
          if (!a && taskAssignmentsList.length === 0) return t as TaskWithAssignmentDetails;
          const u = a ? userMap.get(a.userId) : undefined;
          const assignmentsWithDisplay = taskAssignmentsList
            .sort((x, y) => (x.roundNumber - y.roundNumber) || String(x.stageType).localeCompare(String(y.stageType)))
            .map((asn) => ({
              ...asn,
              displayName: userMap.get(asn.userId)?.displayName ?? null,
            }));
          // Ngày nhận công việc = ngày đầu tiên nhận trong số các nhân sự (min receivedAt)
          let receivedAtMin: string | null = null;
          let actualCompletedAtMax: Date | null = null;
          for (const asn of taskAssignmentsList) {
            if (asn.receivedAt) {
              const d = typeof asn.receivedAt === "string" ? asn.receivedAt : (asn.receivedAt as Date).toISOString().slice(0, 10);
              if (!receivedAtMin || d < receivedAtMin) receivedAtMin = d;
            }
            if (asn.completedAt) {
              const d = asn.completedAt instanceof Date ? asn.completedAt : new Date(asn.completedAt);
              if (!actualCompletedAtMax || d > actualCompletedAtMax) actualCompletedAtMax = d;
            }
          }
          return {
            ...t,
            assigneeId: a?.userId ?? null,
            assignee: u?.displayName ?? (taskAssignmentsList.length > 0 ? taskAssignmentsList.map((asn) => userMap.get(asn.userId)?.displayName).filter(Boolean).join(", ") : null),
            dueDate: a?.dueDate ? (typeof a.dueDate === "string" ? a.dueDate : (a.dueDate as Date).toISOString().slice(0, 10)) : null,
            actualCompletedAt: actualCompletedAtMax ?? a?.completedAt ?? null,
            receivedAt: receivedAtMin ?? a?.receivedAt ?? null,
            assignments: assignmentsWithDisplay.length > 0 ? assignmentsWithDisplay : undefined,
          } as TaskWithAssignmentDetails;
        });
        return res.json(result);
      }
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch tasks";
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Error stack:", errorStack);
      res.status(500).json({ 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorStack : undefined
      });
    }
  });

  app.get(api.tasks.get.path, requireAuth, async (req, res) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      const include = typeof req.query.include === "string" ? req.query.include : "";
      if (db) {
        const assignments = await dbStorage.getTaskAssignmentsByTaskId(id);
        const first = assignments[0];
        let withDetails: TaskWithAssignmentDetails = task as TaskWithAssignmentDetails;
        if (first) {
          const u = await dbStorage.getUserById(first.userId);
          withDetails = {
            ...task,
            assigneeId: first.userId,
            assignee: u?.displayName ?? null,
            dueDate: first.dueDate ? (typeof first.dueDate === "string" ? first.dueDate : (first.dueDate as Date).toISOString().slice(0, 10)) : null,
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
      const message = error instanceof Error ? error.message : "Failed to fetch task";
      res.status(500).json({ message });
    }
  });

  app.patch(api.tasks.update.path, requireAuth, async (req, res) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const body = req.body as Record<string, unknown>;
      const input = api.tasks.update.input.parse(req.body);
      if (typeof body.notes === "string" || body.notes === null) {
        (input as Record<string, unknown>).notes = body.notes === "" ? null : body.notes;
      }
      // Đảm bảo vote (đánh giá Người kiểm soát) luôn được truyền từ body vào input
      if ("vote" in body) {
        (input as Record<string, unknown>).vote = body.vote === "" || body.vote === undefined ? null : body.vote;
      }
      if (FEATURE_WORK_ENABLED && (input.taskType !== undefined || input.relatedWorkId !== undefined || input.relatedContractId !== undefined)) {
        const existing = await storage.getTask(id);
        const merged = { ...existing, ...input } as { taskType?: string | null; relatedWorkId?: string | null; relatedContractId?: string | null };
        validateTaskContractLink(merged);
      }
      type AssignmentInput = { userId: string; stageType: string; roundNumber?: number; receivedAt?: string; dueDate?: string; completedAt?: string; status?: string; progress?: number; notes?: string | null };
      const assignmentsInput = Array.isArray((req.body as { assignments?: unknown }).assignments)
        ? (req.body as { assignments: AssignmentInput[] }).assignments
        : undefined;

      const task = await storage.updateTask(id, input);

      if (db && assignmentsInput !== undefined) {
        await dbStorage.deleteTaskAssignmentsByTaskId(id);
        if (assignmentsInput.length > 0) {
          for (const a of assignmentsInput) {
            const assignment = await dbStorage.createTaskAssignment({
              taskId: id,
              userId: a.userId,
              stageType: a.stageType,
              roundNumber: a.roundNumber ?? 1,
              receivedAt: a.receivedAt ? (typeof a.receivedAt === "string" ? a.receivedAt : new Date(a.receivedAt).toISOString().slice(0, 10)) : null,
              dueDate: a.dueDate ? (typeof a.dueDate === "string" ? a.dueDate : new Date(a.dueDate).toISOString().slice(0, 10)) : null,
              completedAt: a.completedAt ? (typeof a.completedAt === "string" ? new Date(a.completedAt) : new Date(a.completedAt)) : null,
              status: a.status ?? "not_started",
              progress: a.progress ?? 0,
              notes: a.notes ?? null,
            });
            const existing = await dbStorage.getNotificationByTaskType(a.userId, id, "task_assigned");
            if (!existing) {
              const content = buildNotificationContent("task_assigned", task.title ?? "");
              await dbStorage.createNotification({
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
            }
          }
        }
      }

      res.json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      // Handle 404 from storage
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      console.error("Error updating task:", err);
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ message });
    }
  });

  app.post(api.tasks.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.tasks.create.input.parse(req.body);
      if (FEATURE_WORK_ENABLED) validateTaskContractLink(input);
      type AssignmentInput = { userId: string; stageType: string; roundNumber?: number; receivedAt?: string; dueDate?: string; completedAt?: string; status?: string; progress?: number; notes?: string | null };
      const assignmentsInput = Array.isArray((req.body as { assignments?: unknown }).assignments)
        ? (req.body as { assignments: AssignmentInput[] }).assignments
        : undefined;

      const now = new Date();
      const body = req.body as Record<string, unknown>;
      const notesValue = input.notes ?? (typeof body.notes === "string" ? body.notes : body.notes === null ? null : undefined);
      const voteValue = input.vote ?? (body.vote !== undefined && body.vote !== "" ? body.vote : null);
      const taskData: Omit<Task, "id"> = {
        title: input.title,
        status: input.status,
        priority: input.priority,
        progress: input.progress ?? 0,
        description: input.description ?? null,
        notes: notesValue !== undefined ? (notesValue === "" ? null : notesValue) : null,
        group: input.group ?? null,
        workflow: input.workflow ?? null,
        sourceSheetId: input.sourceSheetId ?? null,
        sourceSheetName: input.sourceSheetName ?? null,
        contractId: input.contractId ?? null,
        taskType: input.taskType ?? null,
        relatedWorkId: input.relatedWorkId ?? null,
        relatedContractId: input.relatedContractId ?? null,
        vote: voteValue as string | null,
        createdAt: now,
        updatedAt: now,
      };

      const task = await storage.createTask(taskData);

      if (db && assignmentsInput && assignmentsInput.length > 0) {
        for (const a of assignmentsInput) {
          const assignment = await dbStorage.createTaskAssignment({
            taskId: task.id,
            userId: a.userId,
            stageType: a.stageType,
            roundNumber: a.roundNumber ?? 1,
            receivedAt: a.receivedAt ? (typeof a.receivedAt === "string" ? a.receivedAt : new Date(a.receivedAt).toISOString().slice(0, 10)) : null,
            dueDate: a.dueDate ? (typeof a.dueDate === "string" ? a.dueDate : new Date(a.dueDate).toISOString().slice(0, 10)) : null,
            completedAt: a.completedAt ? (typeof a.completedAt === "string" ? new Date(a.completedAt) : new Date(a.completedAt)) : null,
            status: a.status ?? "not_started",
            progress: a.progress ?? 0,
            notes: a.notes ?? null,
          });
          const existing = await dbStorage.getNotificationByTaskType(a.userId, task.id, "task_assigned");
          if (!existing) {
            const content = buildNotificationContent("task_assigned", task.title ?? "");
            await dbStorage.createNotification({
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
          }
        }
      }

      res.json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error('Validation error:', err.errors);
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
          errors: err.errors,
        });
      }
      console.error("Error creating task:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to create task";
      const errorStack = err instanceof Error ? err.stack : undefined;
      console.error("Error stack:", errorStack);
      const statusCode = errorMessage.includes("authentication") ? 503 : 500;
      res.status(statusCode).json({ 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorStack : undefined
      });
    }
  });

  app.delete(api.tasks.delete.path, requireAuth, async (req, res) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await storage.deleteTask(id);
      res.json({ message: "Task deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      console.error("Error deleting task:", err);
      const message = err instanceof Error ? err.message : "Failed to delete task";
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
      const message = error instanceof Error ? error.message : "Failed to refresh tasks";
      res.status(500).json({ message });
    }
  });

  // ---------- Notifications ----------
  app.get(api.notifications.unreadCount.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.json({ count: 0 });
      const userId = (req.user as UserWithRolesAndGroups).id;
      const count = await dbStorage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (err) {
      console.error("Error fetching unread notifications count:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch notifications" });
    }
  });

  app.get(api.notifications.list.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.json([]);
      const userId = (req.user as UserWithRolesAndGroups).id;
      const unreadOnly = String(req.query.unread || "").toLowerCase() === "true";

      // Generate due-soon / overdue notifications on demand (idempotent by assignment+type)
      const assignments = await dbStorage.getTaskAssignmentsWithTaskByUserId(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const { assignment, task } of assignments) {
        const dueDateStr = formatDateOnly(assignment.dueDate);
        if (!dueDateStr) continue;
        const dueDate = new Date(dueDateStr);
        const isCompleted = assignment.completedAt != null || task.status === "Completed";
        if (isCompleted) continue;
        const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let type: "task_due_soon" | "task_overdue" | null = null;
        if (diffDays < 0) type = "task_overdue";
        else if (diffDays <= DUE_SOON_DAYS) type = "task_due_soon";
        if (!type) continue;
        const existing = await dbStorage.getNotificationByAssignmentType(userId, assignment.id, type);
        if (!existing) {
          const content = buildNotificationContent(type, task.title ?? "", dueDateStr);
          await dbStorage.createNotification({
            userId,
            type,
            taskId: assignment.taskId,
            taskAssignmentId: assignment.id,
            title: content.title,
            message: content.message,
            isRead: false,
            createdAt: new Date(),
            readAt: null,
          });
        }
      }

      const list = await dbStorage.getNotificationsByUserId(userId, { unreadOnly });
      res.json(list);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch notifications" });
    }
  });

  app.patch(api.notifications.markRead.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const userId = (req.user as UserWithRolesAndGroups).id;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await dbStorage.markNotificationAsRead(userId, id);
      if (!updated) return res.status(404).json({ message: "Notification not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error marking notification as read:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update notification" });
    }
  });

  // ---------- Works & Translation/Proofreading contracts (Work–Contract taxonomy) ----------
  app.get(api.works.list.path, requireAuth, async (_req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const list = await dbStorage.getWorksFromDb();
      res.json(list);
    } catch (err) {
      console.error("Error fetching works:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch works" });
    }
  });
  
  // Generate Excel template for works import - MUST be before /api/works/:id route
  app.get(api.works.downloadTemplate.path, requireAuth, async (_req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      
      // Dynamic import xlsx
      let XLSX: any;
      try {
        XLSX = await import("xlsx");
        // Handle both default and named exports
        if (XLSX.default) {
          XLSX = XLSX.default;
        }
      } catch (xlsxErr) {
        console.error("Error importing xlsx:", xlsxErr);
        return res.status(500).json({ 
          message: "Failed to load xlsx library: " + (xlsxErr instanceof Error ? xlsxErr.message : "Unknown error") 
        });
      }
      
      let components: any[] = [];
      try {
        components = await dbStorage.getComponentsFromDb();
      } catch (compErr) {
        console.error("Error fetching components:", compErr);
        // Continue with empty components array
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create data sheet with headers and sample row
      const headers = [
        "Hợp phần (Component)",
        "Giai đoạn (Stage)",
        "Tiêu đề tiếng Việt (Title VI)",
        "Tiêu đề Hán Nôm (Title Hán Nôm)",
        "Mã tài liệu (Document Code)",
        "Số từ cơ sở (Base Word Count)",
        "Số trang cơ sở (Base Page Count)",
        "Hệ số ước tính (Estimate Factor)",
        "Số từ ước tính (Estimate Word Count)",
        "Số trang ước tính (Estimate Page Count)",
        "Ghi chú (Note)"
      ];
      
      const sampleRow = [
        components[0]?.name || "Ví dụ: Hợp phần 1",
        "Ví dụ: Giai đoạn 1",
        "Ví dụ: Tiêu đề tiếng Việt",
        "Ví dụ: Tiêu đề Hán Nôm",
        "Ví dụ: DOC001",
        "1000",
        "10",
        "1.2",
        "1200",
        "12",
        "Ghi chú mẫu"
      ];
      
      const wsData = [headers, sampleRow];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      ws["!cols"] = [
        { wch: 25 }, // Component
        { wch: 20 }, // Stage
        { wch: 30 }, // Title VI
        { wch: 30 }, // Title Hán Nôm
        { wch: 20 }, // Document Code
        { wch: 18 }, // Base Word Count
        { wch: 18 }, // Base Page Count
        { wch: 18 }, // Estimate Factor
        { wch: 20 }, // Estimate Word Count
        { wch: 20 }, // Estimate Page Count
        { wch: 30 }  // Note
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "Tác phẩm");
      
      // Create components reference sheet
      const componentsData = [
        ["Tên hợp phần (Component Name)"],
        ...(components.length > 0 ? components.map(c => [c.name || ""]) : [["Chưa có hợp phần nào"]])
      ];
      const componentsWs = XLSX.utils.aoa_to_sheet(componentsData);
      componentsWs["!cols"] = [{ wch: 30 }];
      XLSX.utils.book_append_sheet(wb, componentsWs, "Danh sách hợp phần");
      
      // Generate buffer
      let buffer: Buffer;
      try {
        buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      } catch (writeErr) {
        console.error("Error writing Excel buffer:", writeErr);
        return res.status(500).json({ message: "Failed to generate Excel file: " + (writeErr instanceof Error ? writeErr.message : "Unknown error") });
      }
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=mau-tac-pham-tuyen-dich.xlsx");
      res.send(buffer);
    } catch (err) {
      console.error("Error generating template:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate template";
      console.error("Full error:", err);
      res.status(500).json({ message: errorMessage });
    }
  });
  
  app.get(api.works.get.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getWorkById(id);
      if (!row) return res.status(404).json({ message: "Work not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch work" });
    }
  });
  /** Chuẩn hóa body works: pg numeric expect string, client có thể gửi number. */
  function normalizeWorkBody(body: unknown): Record<string, unknown> {
    const b = typeof body === "object" && body !== null ? { ...(body as Record<string, unknown>) } : {};
    if (typeof (b as Record<string, unknown>).estimateFactor === "number") {
      (b as Record<string, unknown>).estimateFactor = String((b as Record<string, unknown>).estimateFactor);
    }
    return b as Record<string, unknown>;
  }

  app.post(api.works.create.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const body = normalizeWorkBody(req.body);
      const input = api.works.create.input.parse(body);
      const row = await dbStorage.createWork(input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create work" });
    }
  });
  app.patch(api.works.update.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const body = normalizeWorkBody(req.body);
      const input = api.works.update.input.parse(body);
      const row = await dbStorage.updateWork(id, input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error && err.message.includes("not found")) return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update work" });
    }
  });
  app.delete(api.works.delete.path, requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteWork(id);
      res.json({ message: "Đã xóa tác phẩm" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to delete work" });
    }
  });

  // Import works from Excel - MUST be before /api/works/:id route
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });
  
  app.post(api.works.import.path, requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER), (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: "File upload error: " + (err instanceof Error ? err.message : "Unknown error") });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded. Please select a file." });
      }
      
      try {
          // Dynamic import xlsx
          let XLSX: any;
          try {
            const xlsxModule = await import("xlsx");
            XLSX = xlsxModule.default || xlsxModule;
          } catch (xlsxErr) {
            console.error("Error importing xlsx:", xlsxErr);
            return res.status(500).json({ 
              message: "Failed to load xlsx library: " + (xlsxErr instanceof Error ? xlsxErr.message : "Unknown error") 
            });
          }
          
          // Parse Excel file
          const workbook = XLSX.read(file.buffer, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
          
          if (data.length < 2) {
            return res.status(400).json({ message: "File không có dữ liệu. Cần ít nhất 1 dòng dữ liệu (không tính header)." });
          }
          
          // Get components for mapping
          const components = await dbStorage.getComponentsFromDb();
          const componentMap = new Map(components.map(c => [c.name?.toLowerCase().trim(), c.id]));
          
          const errors: string[] = [];
          let successCount = 0;
          
          // Process rows (skip header row)
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            
            try {
              // Map Excel columns to work fields
              const componentName = String(row[0] || "").trim();
              const stage = String(row[1] || "").trim() || null;
              const titleVi = String(row[2] || "").trim() || null;
              const titleHannom = String(row[3] || "").trim() || null;
              const documentCode = String(row[4] || "").trim() || null;
              const baseWordCount = row[5] ? parseInt(String(row[5]), 10) : null;
              const basePageCount = row[6] ? parseInt(String(row[6]), 10) : null;
              const estimateFactor = row[7] ? String(row[7]) : null;
              const estimateWordCount = row[8] ? parseInt(String(row[8]), 10) : null;
              const estimatePageCount = row[9] ? parseInt(String(row[9]), 10) : null;
              const note = String(row[10] || "").trim() || null;
              
              // Validate required fields
              if (!componentName) {
                errors.push(`Dòng ${i + 1}: Thiếu tên hợp phần`);
                continue;
              }
              
              if (!titleVi) {
                errors.push(`Dòng ${i + 1}: Thiếu tiêu đề tiếng Việt`);
                continue;
              }
              
              // Find component ID
              const componentId = componentMap.get(componentName.toLowerCase());
              if (!componentId) {
                errors.push(`Dòng ${i + 1}: Không tìm thấy hợp phần "${componentName}"`);
                continue;
              }
              
              // Create work
              const workData: any = {
                componentId,
                stage,
                titleVi,
                titleHannom,
                documentCode,
                baseWordCount: baseWordCount && !isNaN(baseWordCount) ? baseWordCount : null,
                basePageCount: basePageCount && !isNaN(basePageCount) ? basePageCount : null,
                estimateFactor: estimateFactor || null,
                estimateWordCount: estimateWordCount && !isNaN(estimateWordCount) ? estimateWordCount : null,
                estimatePageCount: estimatePageCount && !isNaN(estimatePageCount) ? estimatePageCount : null,
                note,
              };
              
              await dbStorage.createWork(workData);
              successCount++;
            } catch (rowErr) {
              errors.push(`Dòng ${i + 1}: ${rowErr instanceof Error ? rowErr.message : "Lỗi không xác định"}`);
            }
          }
          
          res.json({ success: successCount, errors });
        } catch (parseErr) {
          console.error("Error parsing Excel:", parseErr);
          res.status(400).json({ message: "Lỗi đọc file Excel: " + (parseErr instanceof Error ? parseErr.message : "Unknown error") });
        }
    } catch (err) {
      console.error("Error importing works:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to import works" });
    }
  });

  app.get(api.translationContracts.list.path, requireAuth, async (_req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const list = await dbStorage.getTranslationContractsFromDb();
      res.json(list);
    } catch (err) {
      console.error("Error fetching translation contracts:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch translation contracts" });
    }
  });
  app.get(api.translationContracts.get.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getTranslationContractById(id);
      if (!row) return res.status(404).json({ message: "Translation contract not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch translation contract" });
    }
  });
  const numericKeysTc = ["unitPrice", "overviewValue", "translationValue", "contractValue", "completionRate", "settlementValue"] as const;
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

  app.post(api.translationContracts.create.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const body = normalizeTranslationContractBody((req.body as Record<string, unknown>) || {});
      const input = api.translationContracts.create.input.parse(body);
      const row = await dbStorage.createTranslationContract(input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create translation contract" });
    }
  });
  app.patch(api.translationContracts.update.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const body = normalizeTranslationContractBody((req.body as Record<string, unknown>) || {});
      const input = api.translationContracts.update.input.parse(body);
      const row = await dbStorage.updateTranslationContract(id, input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error && err.message.includes("not found")) return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update translation contract" });
    }
  });
  app.delete(api.translationContracts.delete.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.deleteTranslationContract(id);
      res.json(row);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to delete translation contract" });
    }
  });

  app.get(api.proofreadingContracts.list.path, requireAuth, async (_req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const list = await dbStorage.getProofreadingContractsFromDb();
      res.json(list);
    } catch (err) {
      console.error("Error fetching proofreading contracts:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch proofreading contracts" });
    }
  });
  app.get(api.proofreadingContracts.get.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getProofreadingContractById(id);
      if (!row) return res.status(404).json({ message: "Proofreading contract not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch proofreading contract" });
    }
  });
  const numericKeysPc = ["rateRatio", "contractValue"] as const;
  const uuidKeysPc = ["componentId", "workId", "translationContractId"] as const;
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
  app.post(api.proofreadingContracts.create.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const body = normalizeProofreadingContractBody((req.body as Record<string, unknown>) || {});
      const input = api.proofreadingContracts.create.input.parse(body);
      const row = await dbStorage.createProofreadingContract(input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create proofreading contract" });
    }
  });
  app.patch(api.proofreadingContracts.update.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const body = normalizeProofreadingContractBody((req.body as Record<string, unknown>) || {});
      const input = api.proofreadingContracts.update.input.parse(body);
      const row = await dbStorage.updateProofreadingContract(id, input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error && err.message.includes("not found")) return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update proofreading contract" });
    }
  });
  app.delete(api.proofreadingContracts.delete.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.deleteProofreadingContract(id);
      res.json(row);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to delete proofreading contract" });
    }
  });

  // ---------- Components (Hợp phần) ----------
  app.get(api.components.list.path, requireAuth, async (_req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const list = await dbStorage.getComponentsFromDb();
      res.json(list);
    } catch (err) {
      console.error("Error fetching components:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch components" });
    }
  });
  app.get(api.components.get.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getComponentById(id);
      if (!row) return res.status(404).json({ message: "Component not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch component" });
    }
  });
  app.post(api.components.create.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const input = api.components.create.input.parse(req.body);
      const row = await dbStorage.createComponent(input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create component" });
    }
  });
  app.patch(api.components.update.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = api.components.update.input.parse(req.body);
      const row = await dbStorage.updateComponent(id, input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error && err.message.includes("not found")) return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update component" });
    }
  });

  // ---------- Contract stages (Giai đoạn hợp đồng) ----------
  app.get("/api/translation-contracts/:contractId/stages", requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const contractId = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
      const list = await dbStorage.getContractStagesByTranslationContractId(contractId);
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch stages" });
    }
  });
  app.get("/api/proofreading-contracts/:contractId/stages", requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const contractId = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
      const list = await dbStorage.getContractStagesByProofreadingContractId(contractId);
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch stages" });
    }
  });
  app.post(api.contractStages.create.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const input = api.contractStages.create.input.parse(req.body);
      const row = await dbStorage.createContractStage(input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create contract stage" });
    }
  });
  app.patch(api.contractStages.update.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = api.contractStages.update.input.parse(req.body);
      const row = await dbStorage.updateContractStage(id, input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error && err.message.includes("not found")) return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update contract stage" });
    }
  });
  app.delete(api.contractStages.delete.path, requireAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ message: "Database not configured" });
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteContractStage(id);
      res.json({ message: "OK" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to delete contract stage" });
    }
  });

  // ---------- Users CRUD (yêu cầu DATABASE_URL) ----------
  const requireDb = () => {
    if (!db) {
      throw new Error("Database not configured. Set DATABASE_URL for users/contracts/documents API.");
    }
  };

  app.get(api.users.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      const list = await dbStorage.getUsersWithRolesAndGroups();
      res.json(list.map(sanitizeUser));
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      console.error("Error fetching users:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch users" });
    }
  });

  app.get(api.users.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await dbStorage.getUserByIdWithRolesAndGroups(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(sanitizeUser(user));
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch user" });
    }
  });

  app.post(api.users.create.path, requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      requireDb();
      const input = api.users.create.input.parse(req.body);
      const user = await dbStorage.createUser(input);
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create user" });
    }
  });

  const patchUserBodySchema = z.object({
    displayName: z.string().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    roleIds: z.array(z.string().uuid()).optional(),
    groupIds: z.array(z.string().uuid()).optional(),
    /** Ghi đè user_roles theo (roleId, componentId). Dùng khi có Thư ký hợp phần + Tên Hợp phần. */
    roleAssignments: z
      .array(z.object({ roleId: z.string().uuid(), componentId: z.string().uuid().nullable().optional() }))
      .optional(),
  });

  app.patch(api.users.update.path, requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = patchUserBodySchema.parse(req.body);
      const payload: Record<string, string | null | boolean> = {};
      if (input.displayName !== undefined) payload.displayName = input.displayName;
      if (input.firstName !== undefined) payload.firstName = input.firstName ?? null;
      if (input.lastName !== undefined) payload.lastName = input.lastName ?? null;
      if (input.department !== undefined) payload.department = input.department ?? null;
      if (input.isActive !== undefined) payload.isActive = input.isActive;
      if (Object.keys(payload).length) {
        await dbStorage.updateUser(id, payload as Parameters<typeof dbStorage.updateUser>[1]);
      }
      if (input.roleAssignments !== undefined) {
        await dbStorage.setUserRoleAssignments(
          id,
          input.roleAssignments.map((a) => ({ roleId: a.roleId, componentId: a.componentId ?? null }))
        );
      } else if (input.roleIds !== undefined) {
        await dbStorage.setUserRoles(id, input.roleIds);
      }
      const user = await dbStorage.getUserByIdWithRolesAndGroups(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(sanitizeUser(user));
    } catch (err) {
      console.error("PATCH /api/users/:id error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      const message = err instanceof Error ? err.message : "Failed to update user";
      res.status(500).json({ message });
    }
  });

  app.patch("/api/users/:id/password", requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const body = z.object({ newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự") }).parse(req.body);
      const hash = await bcrypt.hash(body.newPassword, 10);
      const user = await dbStorage.updateUser(id, { passwordHash: hash });
      res.json(sanitizeUser(user));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update password" });
    }
  });

  app.delete(api.users.delete.path, requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to delete user" });
    }
  });

  // ---------- Contracts CRUD (require auth) ----------
  app.get(api.contracts.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      const list = await dbStorage.getContracts();
      res.json(list);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch contracts" });
    }
  });

  app.get(api.contracts.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const contract = await dbStorage.getContractById(id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      res.json(contract);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch contract" });
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
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create contract" });
    }
  });

  app.patch(api.contracts.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update contract" });
    }
  });

  app.delete(api.contracts.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteContract(id);
      res.json({ message: "Contract deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to delete contract" });
    }
  });

  // ---------- Documents CRUD (require auth) ----------
  app.get(api.documents.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      const list = await dbStorage.getDocuments();
      res.json(list);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch documents" });
    }
  });

  app.get(api.documents.get.path, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const doc = await dbStorage.getDocumentById(id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      res.json(doc);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to fetch document" });
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create document" });
    }
  });

  app.patch(api.documents.update.path, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update document" });
    }
  });

  app.delete(api.documents.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteDocument(id);
      res.json({ message: "Document deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to delete document" });
    }
  });

  // ---------- Task assignments CRUD (require auth + DB) ----------
  const handleTaskAssignments = async (
    res: import("express").Response,
    fn: () => Promise<unknown>
  ) => {
    try {
      requireDb();
      const result = await fn();
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  };
  app.get(api.taskAssignments.list.path, requireAuth, async (_req, res) => {
    await handleTaskAssignments(res, () => dbStorage.getTaskAssignments());
  });
  app.get(api.taskAssignments.listByTask.path, requireAuth, async (req, res) => {
    const taskId = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
    await handleTaskAssignments(res, () => dbStorage.getTaskAssignmentsByTaskId(taskId));
  });
  app.get(api.taskAssignments.listByUser.path, requireAuth, async (req, res) => {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    await handleTaskAssignments(res, () => dbStorage.getTaskAssignmentsByUserId(userId));
  });
  app.get(api.taskAssignments.get.path, requireAuth, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const row = await dbStorage.getTaskAssignmentById(id);
    if (!row) return res.status(404).json({ message: "Task assignment not found" });
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
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.taskAssignments.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.taskAssignments.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteTaskAssignment(id);
      res.json({ message: "Task assignment deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- Contract members CRUD ----------
  app.get(api.contractMembers.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getContractMembers());
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.contractMembers.listByContract.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const contractId = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
      res.json(await dbStorage.getContractMembersByContractId(contractId));
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.contractMembers.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getContractMemberById(id);
      if (!row) return res.status(404).json({ message: "Contract member not found" });
      res.json(row);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.contractMembers.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = api.contractMembers.update.input.parse(req.body);
      res.json(await dbStorage.updateContractMember(id, input));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.contractMembers.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteContractMember(id);
      res.json({ message: "Contract member deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- Document tasks CRUD ----------
  app.get(api.documentTasks.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getDocumentTasks());
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.documentTasks.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getDocumentTaskById(id);
      if (!row) return res.status(404).json({ message: "Document task not found" });
      res.json(row);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.documentTasks.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = api.documentTasks.update.input.parse(req.body);
      res.json(await dbStorage.updateDocumentTask(id, input));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.documentTasks.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteDocumentTask(id);
      res.json({ message: "Document task deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- Document contracts CRUD ----------
  app.get(api.documentContracts.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getDocumentContracts());
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.documentContracts.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getDocumentContractById(id);
      if (!row) return res.status(404).json({ message: "Document contract not found" });
      res.json(row);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.documentContracts.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = api.documentContracts.update.input.parse(req.body);
      res.json(await dbStorage.updateDocumentContract(id, input));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.documentContracts.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteDocumentContract(id);
      res.json({ message: "Document contract deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- Groups CRUD (bảng groups; GET /api/groups vẫn là task groups) ----------
  app.get(api.groups.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getGroups());
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.groups.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getGroupById(id);
      if (!row) return res.status(404).json({ message: "Group not found" });
      res.json(row);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.groups.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = api.groups.update.input.parse(req.body);
      res.json(await dbStorage.updateGroup(id, input));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.groups.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteGroup(id);
      res.json({ message: "Group deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- User groups CRUD ----------
  app.get(api.userGroups.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getUserGroups());
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.userGroups.listByUser.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      res.json(await dbStorage.getUserGroupsByUserId(userId));
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.userGroups.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getUserGroupById(id);
      if (!row) return res.status(404).json({ message: "User group not found" });
      res.json(row);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.userGroups.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteUserGroup(id);
      res.json({ message: "User group deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- Roles CRUD ----------
  app.get(api.roles.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getRoles());
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.roles.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getRoleById(id);
      if (!row) return res.status(404).json({ message: "Role not found" });
      res.json(row);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.patch(api.roles.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = api.roles.update.input.parse(req.body);
      res.json(await dbStorage.updateRole(id, input));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.roles.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteRole(id);
      res.json({ message: "Role deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  // ---------- User roles CRUD ----------
  app.get(api.userRoles.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      res.json(await dbStorage.getUserRoles());
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.userRoles.listByUser.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      res.json(await dbStorage.getUserRolesByUserId(userId));
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.get(api.userRoles.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const row = await dbStorage.getUserRoleById(id);
      if (!row) return res.status(404).json({ message: "User role not found" });
      res.json(row);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
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
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });
  app.delete(api.userRoles.delete.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await dbStorage.deleteUserRole(id);
      res.json({ message: "User role deleted successfully" });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err instanceof Error && err.message.includes("Database not configured")) {
        return res.status(503).json({ message: err.message });
      }
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
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
            .filter((g): g is string => typeof g === "string" && g.trim().length > 0)
        )
      );
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups from DB:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch groups";
      res.status(500).json({ message });
    }
  });

  return httpServer;
}
