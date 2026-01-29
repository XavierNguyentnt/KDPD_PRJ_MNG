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

/** Omit passwordHash before sending user to client. Giữ roles và groups nếu có (UserWithRolesAndGroups). */
function sanitizeUser(u: User | UserWithRolesAndGroups) {
  const { passwordHash: _, ...rest } = u;
  return rest;
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
          const a = firstByTask.get(t.id);
          if (!a) return t as TaskWithAssignmentDetails;
          const u = userMap.get(a.userId);
          return {
            ...t,
            assigneeId: a.userId,
            assignee: u?.displayName ?? null,
            dueDate: a.dueDate ? (typeof a.dueDate === "string" ? a.dueDate : (a.dueDate as Date).toISOString().slice(0, 10)) : null,
            actualCompletedAt: a.completedAt ?? null,
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
      type AssignmentInput = { userId: string; stageType: string; roundNumber?: number; receivedAt?: string; dueDate?: string; completedAt?: string; status?: string; progress?: number; notes?: string | null };
      const assignmentsInput = Array.isArray((req.body as { assignments?: unknown }).assignments)
        ? (req.body as { assignments: AssignmentInput[] }).assignments
        : undefined;

      const task = await storage.updateTask(id, input);

      if (db && assignmentsInput !== undefined) {
        await dbStorage.deleteTaskAssignmentsByTaskId(id);
        if (assignmentsInput.length > 0) {
          for (const a of assignmentsInput) {
            await dbStorage.createTaskAssignment({
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
      type AssignmentInput = { userId: string; stageType: string; roundNumber?: number; receivedAt?: string; dueDate?: string; completedAt?: string; status?: string; progress?: number; notes?: string | null };
      const assignmentsInput = Array.isArray((req.body as { assignments?: unknown }).assignments)
        ? (req.body as { assignments: AssignmentInput[] }).assignments
        : undefined;

      const now = new Date();
      const body = req.body as Record<string, unknown>;
      const notesValue = input.notes ?? (typeof body.notes === "string" ? body.notes : body.notes === null ? null : undefined);
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
        createdAt: now,
        updatedAt: now,
      };

      const task = await storage.createTask(taskData);

      if (db && assignmentsInput && assignmentsInput.length > 0) {
        for (const a of assignmentsInput) {
          await dbStorage.createTaskAssignment({
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
      if (input.roleIds !== undefined) await dbStorage.setUserRoles(id, input.roleIds);
      if (input.groupIds !== undefined) await dbStorage.setUserGroups(id, input.groupIds);
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
