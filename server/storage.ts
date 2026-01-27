import { Task, InsertTask, UpdateTaskRequest, SHEET_CONFIG } from "@shared/schema";
import { parse } from "csv-parse/sync"; // We will need to install csv-parse

export interface IStorage {
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  updateTask(id: string, updates: UpdateTaskRequest): Promise<Task>;
  refreshTasks(): Promise<void>;
}

export class GoogleSheetStorage implements IStorage {
  private tasks: Map<string, Task> = new Map();
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 60 * 1000; // 1 minute cache

  private async fetchFromSheet(): Promise<Map<string, Task>> {
    // Construct public CSV URL
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.sheetId}/export?format=csv&gid=${SHEET_CONFIG.gid}`;
    
    try {
      console.log(`Fetching Google Sheet from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      
      // Parse CSV
      // We assume headers: Task ID, Task Name, Description, Assignee, Role, Status, Priority, Start Date, Due Date, Progress, Notes
      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      const newTasks = new Map<string, Task>();
      
      records.forEach((record: any) => {
        // Map CSV columns to our schema
        // Keys in 'record' depend on the actual header names in the sheet. 
        // We'll normalize them.
        
        // Helper to find key case-insensitively
        const getVal = (keys: string[]) => {
          for (const key of keys) {
            const foundKey = Object.keys(record).find(k => k.toLowerCase() === key.toLowerCase());
            if (foundKey) return record[foundKey];
          }
          return null;
        };

        const id = getVal(['Task ID', 'ID', 'TaskId']) || `generated-${Math.random().toString(36).substr(2, 9)}`;
        const title = getVal(['Task Name', 'Task', 'Title', 'Name']) || 'Untitled Task';
        
        const task: Task = {
          id: String(id),
          title: String(title),
          description: getVal(['Description', 'Desc']),
          assignee: getVal(['Assignee', 'Assigned To', 'Owner']),
          role: getVal(['Role', 'Team']),
          status: getVal(['Status', 'State']) || 'Not Started',
          priority: getVal(['Priority']) || 'Medium',
          startDate: getVal(['Start Date', 'Start']),
          dueDate: getVal(['Due Date', 'Due', 'Deadline']),
          progress: parseInt(getVal(['Progress', '%']) || '0', 10),
          notes: getVal(['Notes', 'Comments'])
        };
        
        newTasks.set(task.id, task);
      });
      
      console.log(`Fetched ${newTasks.size} tasks from Google Sheet.`);
      return newTasks;
    } catch (error) {
      console.error("Error fetching/parsing Google Sheet:", error);
      // Return existing cache if fetch fails, or empty map
      return this.tasks.size > 0 ? this.tasks : new Map();
    }
  }

  async getTasks(): Promise<Task[]> {
    const now = Date.now();
    if (now - this.lastFetch > this.CACHE_TTL || this.tasks.size === 0) {
      this.tasks = await this.fetchFromSheet();
      this.lastFetch = now;
    }
    return Array.from(this.tasks.values());
  }

  async getTask(id: string): Promise<Task | undefined> {
    await this.getTasks(); // Ensure fresh-ish data
    return this.tasks.get(id);
  }

  async updateTask(id: string, updates: UpdateTaskRequest): Promise<Task> {
    const task = await this.getTask(id);
    if (!task) throw new Error(`Task ${id} not found`);

    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    // Note: This is an in-memory update simulation. 
    // We CANNOT write back to the public Google Sheet CSV endpoint.
    // In a real app, we'd use the Google Sheets API with OAuth credentials to write back.
    
    return updatedTask;
  }

  async refreshTasks(): Promise<void> {
    this.tasks = await this.fetchFromSheet();
    this.lastFetch = Date.now();
  }
}

export const storage = new GoogleSheetStorage();
