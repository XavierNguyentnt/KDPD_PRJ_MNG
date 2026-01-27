import { Task, InsertTask, UpdateTaskRequest } from "@shared/schema";
import { googleSheetsService } from "./google-sheets";

export interface IStorage {
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: Omit<Task, 'id'>): Promise<Task>;
  updateTask(id: string, updates: UpdateTaskRequest): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  refreshTasks(): Promise<void>;
}

export class GoogleSheetStorage implements IStorage {
  private tasks: Map<string, Task> = new Map();
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 60 * 1000; // 1 minute cache

  async getTasks(): Promise<Task[]> {
    const now = Date.now();
    if (now - this.lastFetch > this.CACHE_TTL || this.tasks.size === 0) {
      const fetchedTasks = await googleSheetsService.readTasks();
      this.tasks = new Map(fetchedTasks.map(task => [task.id, task]));
      this.lastFetch = now;
      console.log(`Fetched ${this.tasks.size} tasks from Google Sheet.`);
    }
    return Array.from(this.tasks.values());
  }

  async getTask(id: string): Promise<Task | undefined> {
    await this.getTasks(); // Ensure fresh-ish data
    return this.tasks.get(id);
  }

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    try {
      const newTask = await googleSheetsService.createTask(task);
      this.tasks.set(newTask.id, newTask);
      this.lastFetch = Date.now(); // Invalidate cache
      return newTask;
    } catch (error: any) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  async updateTask(id: string, updates: UpdateTaskRequest): Promise<Task> {
    try {
      const updatedTask = await googleSheetsService.updateTask(id, updates);
      this.tasks.set(id, updatedTask);
      this.lastFetch = Date.now(); // Invalidate cache
      return updatedTask;
    } catch (error: any) {
      console.error("Error updating task:", error);
      // If update fails due to auth, try in-memory update as fallback
      const task = await this.getTask(id);
      if (!task) throw new Error(`Task ${id} not found`);
      
      if (error.message?.includes('authentication')) {
        console.warn('Write-back not available, using in-memory update only');
        const updatedTask = { ...task, ...updates };
        this.tasks.set(id, updatedTask);
        return updatedTask;
      }
      
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      await googleSheetsService.deleteTask(id);
      this.tasks.delete(id);
      this.lastFetch = Date.now(); // Invalidate cache
    } catch (error: any) {
      console.error("Error deleting task:", error);
      if (error.message?.includes('authentication')) {
        console.warn('Delete not available, removing from cache only');
        this.tasks.delete(id);
        return;
      }
      throw error;
    }
  }

  async refreshTasks(): Promise<void> {
    const fetchedTasks = await googleSheetsService.readTasks();
    this.tasks = new Map(fetchedTasks.map(task => [task.id, task]));
    this.lastFetch = Date.now();
  }
}

export const storage = new GoogleSheetStorage();
