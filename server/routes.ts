import type { Express } from "express";
import type { Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type { Task, User } from "@shared/schema";
import { UserRole } from "@shared/schema";
import { db, pool } from "./db";
import * as dbStorage from "./db-storage";
import { passport } from "./auth";
import { requireAuth, requireRole } from "./middleware";

/** Omit passwordHash before sending user to client. */
function sanitizeUser(u: User): Omit<User, "passwordHash"> & { passwordHash?: never } {
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
      const input = api.tasks.update.input.parse(req.body);
      // Tiến độ và trạng thái chỉ cập nhật theo Ngày hoàn thành thực tế: khi có actualCompletedAt thì progress = 100, status = Completed
      const updates = { ...input } as Record<string, unknown>;
      if (updates.actualCompletedAt != null) {
        updates.progress = 100;
        updates.status = "Completed";
      }
      const task = await storage.updateTask(id, updates as typeof input);
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
      console.log('Received create task request:', JSON.stringify(req.body, null, 2));
      const input = api.tasks.create.input.parse(req.body);
      console.log('Parsed input:', JSON.stringify(input, null, 2));
      
      // Ensure all optional fields are properly typed (null instead of undefined)
      const now = new Date();
      const taskData: Omit<Task, "id"> = {
        title: input.title,
        status: input.status,
        priority: input.priority,
        progress: input.progress ?? 0,
        description: input.description ?? null,
        assignee: input.assignee ?? null,
        assigneeId: input.assigneeId ?? null,
        role: input.role ?? null,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        actualCompletedAt: input.actualCompletedAt ?? null,
        notes: input.notes ?? null,
        group: input.group ?? null,
        workflow: input.workflow ?? null,
        sourceSheetId: input.sourceSheetId ?? null,
        sourceSheetName: input.sourceSheetName ?? null,
        contractId: input.contractId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      
      console.log('Task data to create:', JSON.stringify(taskData, null, 2));
      const task = await storage.createTask(taskData);
      console.log('Task created successfully:', task.id);
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
      const list = await dbStorage.getUsers();
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
      const user = await dbStorage.getUserById(id);
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

  app.patch(api.users.update.path, requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = api.users.update.input.parse(req.body);
      const user = await dbStorage.updateUser(id, input);
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
      res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update user" });
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

  // Get available groups from DB tasks
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
