import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We will use an in-memory storage for the sheet data, 
// but we define the schema here for type consistency and validation.

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignee: text("assignee"),
  role: text("role"),
  status: text("status").notNull(), // 'Not Started', 'In Progress', 'Completed', 'Blocked'
  priority: text("priority").notNull(), // 'Low', 'Medium', 'High'
  startDate: text("start_date"),
  dueDate: text("due_date"),
  progress: integer("progress").default(0),
  notes: text("notes"),
});

// Enums for frontend simulation
export const UserRole = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const insertTaskSchema = createInsertSchema(tasks);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Types for our Simulated Write-Back
export type UpdateTaskRequest = Partial<InsertTask>;

// Explicit API Types
export interface TaskResponse extends Task {}
export interface TasksListResponse extends TaskResponse {}

export interface SheetConfig {
  sheetId: string;
  gid?: string;
}

export const SHEET_CONFIG: SheetConfig = {
  sheetId: "1EocmoQcjYbXBaleojrV7LLlgjZTjOvkyZxEb_bHJETM",
  gid: "0" // Default first sheet
};
