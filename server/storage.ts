import { Task, InsertTask, UpdateTaskRequest } from "@shared/schema";
import {
  getTasksFromDb,
  getTaskFromDbById,
  createTaskInDb,
  updateTaskInDb,
  reorderTasksInDb,
  deleteTaskFromDb,
} from "./db-storage";

export interface IStorage {
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: Omit<Task, "id">): Promise<Task>;
  updateTask(id: string, updates: UpdateTaskRequest): Promise<Task>;
  reorderTasks(updates: { id: string; posOrder: number }[]): Promise<number>;
  deleteTask(id: string): Promise<void>;
  refreshTasks(): Promise<void>;
}

/** Storage luôn dùng PostgreSQL (DB là nguồn dữ liệu chính cho tasks) */
export class DatabaseStorage implements IStorage {
  async getTasks(): Promise<Task[]> {
    return getTasksFromDb();
  }

  async getTask(id: string): Promise<Task | undefined> {
    return getTaskFromDbById(id);
  }

  async createTask(task: Omit<Task, "id">): Promise<Task> {
    return createTaskInDb(task as Omit<InsertTask, "id">);
  }

  async updateTask(id: string, updates: UpdateTaskRequest): Promise<Task> {
    return updateTaskInDb(id, updates);
  }

  async reorderTasks(updates: { id: string; posOrder: number }[]): Promise<number> {
    return reorderTasksInDb(updates);
  }

  async deleteTask(id: string): Promise<void> {
    return deleteTaskFromDb(id);
  }

  async refreshTasks(): Promise<void> {
    // DB luôn đọc trực tiếp, không cần refresh từ nguồn ngoài
  }
}

export const storage: IStorage = new DatabaseStorage();
