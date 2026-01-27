import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type { Task } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.tasks.list.path, async (_req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch tasks";
      res.status(500).json({ message });
    }
  });

  app.get(api.tasks.get.path, async (req, res) => {
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

  app.patch(api.tasks.update.path, async (req, res) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = api.tasks.update.input.parse(req.body);
      const task = await storage.updateTask(id, input);
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

  app.post(api.tasks.create.path, async (req, res) => {
    try {
      const input = api.tasks.create.input.parse(req.body);
      // Ensure all optional fields are properly typed (null instead of undefined)
      const taskData: Omit<Task, 'id'> = {
        title: input.title,
        status: input.status,
        priority: input.priority,
        progress: input.progress ?? 0,
        description: input.description ?? null,
        assignee: input.assignee ?? null,
        role: input.role ?? null,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        notes: input.notes ?? null,
      };
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error creating task:", err);
      const message = err instanceof Error ? err.message : "Failed to create task";
      const statusCode = message.includes("authentication") ? 503 : 500;
      res.status(statusCode).json({ message });
    }
  });

  app.delete(api.tasks.delete.path, async (req, res) => {
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

  app.post(api.tasks.refresh.path, async (_req, res) => {
    try {
      await storage.refreshTasks();
      res.json({ message: "Tasks refreshed from Google Sheet" });
    } catch (error) {
      console.error("Error refreshing tasks:", error);
      const message = error instanceof Error ? error.message : "Failed to refresh tasks";
      res.status(500).json({ message });
    }
  });

  return httpServer;
}
