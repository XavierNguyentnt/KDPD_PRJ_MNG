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
// Tasks (chỉ thông tin task-level; người giao / ngày nhận-hoàn thành ở task_assignments)
// -----------------------------------------------------------------------------
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  group: text("group"),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
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

/** Task + thông tin gán việc từ assignment đầu tiên (để API trả về assignee/dates từ task_assignments) */
export type TaskWithAssignmentDetails = Task & {
  assignee?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  actualCompletedAt?: Date | null;
};

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
// Task assignments (users ↔ tasks + ngày nhận / ngày hoàn thành)
// -----------------------------------------------------------------------------
export const taskAssignments = pgTable("task_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stageType: text("stage_type").notNull(),
  roundNumber: integer("round_number").notNull().default(1),
  receivedAt: date("received_at"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status").notNull().default("not_started"),
  progress: integer("progress").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments);
export const selectTaskAssignmentSchema = createSelectSchema(taskAssignments);
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;

// -----------------------------------------------------------------------------
// Contract members (contracts ↔ users)
// -----------------------------------------------------------------------------
export const contractMembers = pgTable("contract_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContractMemberSchema = createInsertSchema(contractMembers);
export const selectContractMemberSchema = createSelectSchema(contractMembers);
export type ContractMember = typeof contractMembers.$inferSelect;
export type InsertContractMember = z.infer<typeof insertContractMemberSchema>;

// -----------------------------------------------------------------------------
// Document tasks (documents ↔ tasks)
// -----------------------------------------------------------------------------
export const documentTasks = pgTable("document_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  role: text("role"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentTaskSchema = createInsertSchema(documentTasks);
export const selectDocumentTaskSchema = createSelectSchema(documentTasks);
export type DocumentTask = typeof documentTasks.$inferSelect;
export type InsertDocumentTask = z.infer<typeof insertDocumentTaskSchema>;

// -----------------------------------------------------------------------------
// Document contracts (documents ↔ contracts)
// -----------------------------------------------------------------------------
export const documentContracts = pgTable("document_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  contractId: uuid("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  role: text("role"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentContractSchema = createInsertSchema(documentContracts);
export const selectDocumentContractSchema = createSelectSchema(documentContracts);
export type DocumentContract = typeof documentContracts.$inferSelect;
export type InsertDocumentContract = z.infer<typeof insertDocumentContractSchema>;

// -----------------------------------------------------------------------------
// Groups (nhóm công việc / nhóm nhân sự)
// -----------------------------------------------------------------------------
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGroupSchema = createInsertSchema(groups);
export const selectGroupSchema = createSelectSchema(groups);
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

// -----------------------------------------------------------------------------
// User groups (users ↔ groups)
// -----------------------------------------------------------------------------
export const userGroups = pgTable("user_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserGroupSchema = createInsertSchema(userGroups);
export const selectUserGroupSchema = createSelectSchema(userGroups);
export type UserGroup = typeof userGroups.$inferSelect;
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;

// -----------------------------------------------------------------------------
// Roles (vai trò phân quyền)
// -----------------------------------------------------------------------------
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoleSchema = createInsertSchema(roles);
export const selectRoleSchema = createSelectSchema(roles);
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

// -----------------------------------------------------------------------------
// User roles (users ↔ roles)
// -----------------------------------------------------------------------------
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles);
export const selectUserRoleSchema = createSelectSchema(userRoles);
export type UserRoleRow = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

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

/** User + roles và groups từ user_roles, user_groups (dùng cho API và auth). */
export type UserWithRolesAndGroups = User & { roles: Role[]; groups: Group[] };
