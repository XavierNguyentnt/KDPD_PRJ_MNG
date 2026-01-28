import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uuid,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// -----------------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  department: text("department"),
  role: text("role"),
  employeeGroup: text("employee_group"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// -----------------------------------------------------------------------------
// Contracts
// -----------------------------------------------------------------------------
export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code"),
  type: text("type"),
  name: text("name"),
  partyA: text("party_a"),
  partyB: text("party_b"),
  signedAt: date("signed_at"),
  value: numeric("value", { precision: 15, scale: 2 }),
  status: text("status"),
  contractScope: text("contract_scope"),
  description: text("description"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContractSchema = createInsertSchema(contracts);
export const selectContractSchema = createSelectSchema(contracts);

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

// -----------------------------------------------------------------------------
// Tasks (khớp với KDPD_DB_schema.sql)
// -----------------------------------------------------------------------------
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: uuid("assignee_id"),
  assignee: text("assignee"),
  role: text("role"),
  group: text("group"),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  actualCompletedAt: timestamp("actual_completed_at", { withTimezone: true }),
  progress: integer("progress").notNull().default(0),
  notes: text("notes"),
  workflow: jsonb("workflow"),
  sourceSheetId: text("source_sheet_id"),
  sourceSheetName: text("source_sheet_name"),
  contractId: uuid("contract_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTaskRequest = Partial<z.infer<typeof insertTaskSchema>>;

// -----------------------------------------------------------------------------
// Documents
// -----------------------------------------------------------------------------
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  documentType: text("document_type"),
  filePath: text("file_path"),
  storageKey: text("storage_key"),
  contractId: uuid("contract_id"),
  taskId: text("task_id"),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// -----------------------------------------------------------------------------
// Enums / constants
// -----------------------------------------------------------------------------
export const UserRole = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const EmployeeGroup = {
  THONG_THUONG: "thong_thuong",
  THU_KY_HOP_PHAN: "thu_ky_hop_phan",
  BIEN_TAP: "bien_tap",
} as const;

export type EmployeeGroupType = (typeof EmployeeGroup)[keyof typeof EmployeeGroup];
