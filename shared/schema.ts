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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertContractSchema = createInsertSchema(contracts);
export const selectContractSchema = createSelectSchema(contracts);

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

// -----------------------------------------------------------------------------
// Components (Hợp phần dịch thuật – phân loại tác phẩm và hợp đồng)
// VD: Phật tạng toàn dịch, Phật tạng tinh yếu, Phật điển, Nho tạng, Nho điển
// -----------------------------------------------------------------------------
export const components = pgTable("components", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertComponentSchema = createInsertSchema(components);
export const selectComponentSchema = createSelectSchema(components);
export type Component = typeof components.$inferSelect;
export type InsertComponent = z.infer<typeof insertComponentSchema>;

// -----------------------------------------------------------------------------
// Works (tác phẩm / công việc nguồn – trục nghiệp vụ bền vững)
// -----------------------------------------------------------------------------
export const works = pgTable("works", {
  id: uuid("id").primaryKey().defaultRandom(),
  componentId: uuid("component_id").references(() => components.id),
  stage: text("stage"),
  titleVi: text("title_vi"),
  titleHannom: text("title_hannom"),
  documentCode: text("document_code"),
  baseWordCount: integer("base_word_count"),
  basePageCount: integer("base_page_count"),
  estimateFactor: numeric("estimate_factor", { precision: 15, scale: 4 }),
  estimateWordCount: integer("estimate_word_count"),
  estimatePageCount: integer("estimate_page_count"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertWorkSchema = createInsertSchema(works);
export const selectWorkSchema = createSelectSchema(works);
export type Work = typeof works.$inferSelect;
export type InsertWork = z.infer<typeof insertWorkSchema>;

// -----------------------------------------------------------------------------
// Translation contracts (hợp đồng dịch thuật)
// -----------------------------------------------------------------------------
export const translationContracts = pgTable("translation_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractNumber: text("contract_number"),
  componentId: uuid("component_id").references(() => components.id),
  workId: uuid("work_id").references(() => works.id),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }),
  overviewValue: numeric("overview_value", { precision: 15, scale: 2 }),
  translationValue: numeric("translation_value", { precision: 15, scale: 2 }),
  contractValue: numeric("contract_value", { precision: 15, scale: 2 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  extensionStartDate: date("extension_start_date"),
  extensionEndDate: date("extension_end_date"),
  actualCompletionDate: date("actual_completion_date"),
  actualWordCount: integer("actual_word_count"),
  actualPageCount: integer("actual_page_count"),
  completionRate: numeric("completion_rate", { precision: 10, scale: 4 }),
  settlementValue: numeric("settlement_value", { precision: 15, scale: 2 }),
  progressCheckDate: date("progress_check_date"),
  expertReviewDate: date("expert_review_date"),
  projectAcceptanceDate: date("project_acceptance_date"),
  status: text("status"),
  cancelledAt: date("cancelled_at"),
  proofreadingInProgress: boolean("proofreading_in_progress").default(false),
  proofreadingCompleted: boolean("proofreading_completed").default(false),
  editingInProgress: boolean("editing_in_progress").default(false),
  editingCompleted: boolean("editing_completed").default(false),
  printTransferDate: date("print_transfer_date"),
  publishedDate: date("published_date"),
  note: text("note"),
});

export const insertTranslationContractSchema =
  createInsertSchema(translationContracts);
export const selectTranslationContractSchema =
  createSelectSchema(translationContracts);
export type TranslationContract = typeof translationContracts.$inferSelect;
export type InsertTranslationContract = z.infer<
  typeof insertTranslationContractSchema
>;

// -----------------------------------------------------------------------------
// Proofreading contracts (hợp đồng hiệu đính)
// -----------------------------------------------------------------------------
export const proofreadingContracts = pgTable("proofreading_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractNumber: text("contract_number"),
  componentId: uuid("component_id").references(() => components.id),
  workId: uuid("work_id").references(() => works.id),
  translationContractId: uuid("translation_contract_id").references(
    () => translationContracts.id,
  ),
  pageCount: integer("page_count"),
  rateRatio: numeric("rate_ratio", { precision: 10, scale: 4 }),
  contractValue: numeric("contract_value", { precision: 15, scale: 2 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  actualCompletionDate: date("actual_completion_date"),
  note: text("note"),
});

// -----------------------------------------------------------------------------
// Contract stages (giai đoạn hợp đồng – 1 hợp đồng nhiều giai đoạn)
// -----------------------------------------------------------------------------
export const contractStages = pgTable("contract_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  translationContractId: uuid("translation_contract_id").references(
    () => translationContracts.id,
    { onDelete: "cascade" },
  ),
  proofreadingContractId: uuid("proofreading_contract_id").references(
    () => proofreadingContracts.id,
    { onDelete: "cascade" },
  ),
  stageCode: text("stage_code").notNull(),
  stageOrder: integer("stage_order").notNull().default(1),
  startDate: date("start_date"),
  endDate: date("end_date"),
  actualCompletionDate: date("actual_completion_date"),
  note: text("note"),
});

export const insertContractStageSchema = createInsertSchema(contractStages);
export const selectContractStageSchema = createSelectSchema(contractStages);
export type ContractStage = typeof contractStages.$inferSelect;
export type InsertContractStage = z.infer<typeof insertContractStageSchema>;

export const insertProofreadingContractSchema = createInsertSchema(
  proofreadingContracts,
);
export const selectProofreadingContractSchema = createSelectSchema(
  proofreadingContracts,
);
export type ProofreadingContract = typeof proofreadingContracts.$inferSelect;
export type InsertProofreadingContract = z.infer<
  typeof insertProofreadingContractSchema
>;

// -----------------------------------------------------------------------------
// Tasks (chỉ thông tin task-level; người giao / ngày nhận-hoàn thành ở task_assignments)
// Nâng cấp: task_type, related_work_id, related_contract_id (backward-compatible)
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
  taskType: text("task_type"),
  relatedWorkId: uuid("related_work_id").references(() => works.id),
  relatedContractId: uuid("related_contract_id"),
  vote: text("vote"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  /** Tất cả assignments (list API) để hiển thị đầy đủ nhân sự + màu trạng thái */
  assignments?: (TaskAssignment & { displayName?: string | null })[];
  /** Ngày nhận sớm nhất trong các assignment (list API) */
  receivedAt?: string | Date | null;
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stageType: text("stage_type").notNull(),
  roundNumber: integer("round_number").notNull().default(1),
  receivedAt: date("received_at"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status").notNull().default("not_started"),
  progress: integer("progress").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments);
export const selectTaskAssignmentSchema = createSelectSchema(taskAssignments);
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;

// -----------------------------------------------------------------------------
// Notifications (thông báo cho nhân sự)
// -----------------------------------------------------------------------------
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // task_assigned | task_due_soon | task_overdue
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  taskAssignmentId: uuid("task_assignment_id").references(
    () => taskAssignments.id,
    { onDelete: "cascade" },
  ),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// -----------------------------------------------------------------------------
// Contract members (contracts ↔ users)
// -----------------------------------------------------------------------------
export const contractMembers = pgTable("contract_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertContractMemberSchema = createInsertSchema(contractMembers);
export const selectContractMemberSchema = createSelectSchema(contractMembers);
export type ContractMember = typeof contractMembers.$inferSelect;
export type InsertContractMember = z.infer<typeof insertContractMemberSchema>;

// -----------------------------------------------------------------------------
// Translation contract members (translation_contracts ↔ users)
// -----------------------------------------------------------------------------
export const translationContractMembers = pgTable(
  "translation_contract_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    translationContractId: uuid("translation_contract_id")
      .notNull()
      .references(() => translationContracts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const insertTranslationContractMemberSchema = createInsertSchema(
  translationContractMembers,
);
export const selectTranslationContractMemberSchema = createSelectSchema(
  translationContractMembers,
);
export type TranslationContractMember =
  typeof translationContractMembers.$inferSelect;
export type InsertTranslationContractMember = z.infer<
  typeof insertTranslationContractMemberSchema
>;

// -----------------------------------------------------------------------------
// Proofreading contract members (proofreading_contracts ↔ users)
// -----------------------------------------------------------------------------
export const proofreadingContractMembers = pgTable(
  "proofreading_contract_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proofreadingContractId: uuid("proofreading_contract_id")
      .notNull()
      .references(() => proofreadingContracts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const insertProofreadingContractMemberSchema = createInsertSchema(
  proofreadingContractMembers,
);
export const selectProofreadingContractMemberSchema = createSelectSchema(
  proofreadingContractMembers,
);
export type ProofreadingContractMember =
  typeof proofreadingContractMembers.$inferSelect;
export type InsertProofreadingContractMember = z.infer<
  typeof insertProofreadingContractMemberSchema
>;

// -----------------------------------------------------------------------------
// Payments (chuẩn kế toán – mỗi lần chi tiền = 1 record)
// -----------------------------------------------------------------------------
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id"),
  paymentType: text("payment_type"), // advance | settlement | other
  voucherNo: text("voucher_no"),
  paymentDate: date("payment_date"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments);
export const selectPaymentSchema = createSelectSchema(payments);
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// -----------------------------------------------------------------------------
// Document tasks (documents ↔ tasks)
// -----------------------------------------------------------------------------
export const documentTasks = pgTable("document_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  role: text("role"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  contractId: uuid("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  role: text("role"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDocumentContractSchema =
  createInsertSchema(documentContracts);
export const selectDocumentContractSchema =
  createSelectSchema(documentContracts);
export type DocumentContract = typeof documentContracts.$inferSelect;
export type InsertDocumentContract = z.infer<
  typeof insertDocumentContractSchema
>;

// -----------------------------------------------------------------------------
// Groups (nhóm công việc / nhóm nhân sự)
// -----------------------------------------------------------------------------
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertRoleSchema = createInsertSchema(roles);
export const selectRoleSchema = createSelectSchema(roles);
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

// -----------------------------------------------------------------------------
// User roles (users ↔ roles). component_id: hợp phần cho vai trò (vd Thư ký hợp phần); NULL = toàn cục.
// -----------------------------------------------------------------------------
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").references(() => components.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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

export type EmployeeGroupType =
  (typeof EmployeeGroup)[keyof typeof EmployeeGroup];

/** (roleId, componentId) từ user_roles — dùng để phân quyền thư ký theo hợp phần. */
export type UserRoleAssignment = { roleId: string; componentId: string | null };

/** User + roles, groups và roleAssignments (user_roles có component_id) cho API và auth. */
export type UserWithRolesAndGroups = User & {
  roles: Role[];
  groups: Group[];
  /** Chi tiết (roleId, componentId) từ user_roles; componentId null = vai trò toàn cục. */
  roleAssignments?: UserRoleAssignment[];
};
