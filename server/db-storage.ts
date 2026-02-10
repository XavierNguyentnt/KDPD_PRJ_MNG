import { eq, asc, inArray, and, desc, ne } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  contracts,
  tasks,
  documents,
  taskAssignments,
  contractMembers,
  translationContractMembers,
  proofreadingContractMembers,
  documentTasks,
  documentContracts,
  groups,
  userGroups,
  roles,
  userRoles,
  components,
  works,
  translationContracts,
  proofreadingContracts,
  contractStages,
  notifications,
  type User,
  type InsertUser,
  type UserWithRolesAndGroups,
  type Contract,
  type InsertContract,
  type Task,
  type InsertTask,
  type UpdateTaskRequest,
  type Document,
  type InsertDocument,
  type TaskAssignment,
  type InsertTaskAssignment,
  type Notification,
  type InsertNotification,
  type ContractMember,
  type InsertContractMember,
  type TranslationContractMember,
  type InsertTranslationContractMember,
  type ProofreadingContractMember,
  type InsertProofreadingContractMember,
  type DocumentTask,
  type InsertDocumentTask,
  type DocumentContract,
  type InsertDocumentContract,
  type Group,
  type InsertGroup,
  type UserGroup,
  type InsertUserGroup,
  type Role,
  type InsertRole,
  type UserRoleRow,
  type InsertUserRole,
  type Component,
  type InsertComponent,
  type Work,
  type InsertWork,
  type TranslationContract,
  type InsertTranslationContract,
  type ProofreadingContract,
  type InsertProofreadingContract,
  type ContractStage,
  type InsertContractStage,
  payments,
  type Payment,
  type InsertPayment,
} from "@shared/schema";

function requireDb() {
  if (!db) {
    throw new Error("Database not configured. Set DATABASE_URL.");
  }
  return db;
}

type CacheEntry<T> = { value: T; expiresAt: number };
const USERS_CACHE_TTL_MS = Number.parseInt(
  process.env.CACHE_USERS_TTL_MS || "30000",
  10,
);
const ROLES_CACHE_TTL_MS = Number.parseInt(
  process.env.CACHE_ROLES_TTL_MS || "30000",
  10,
);
let usersCache: CacheEntry<User[]> | null = null;
let rolesCache: CacheEntry<Role[]> | null = null;

function readCache<T>(entry: CacheEntry<T> | null): T | undefined {
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) return undefined;
  return entry.value;
}

function writeCache<T>(value: T, ttlMs: number): CacheEntry<T> | null {
  if (ttlMs <= 0) return null;
  return { value, expiresAt: Date.now() + ttlMs };
}

function invalidateUsersCache(): void {
  usersCache = null;
}

function invalidateRolesCache(): void {
  rolesCache = null;
}

// -----------------------------------------------------------------------------
// Users CRUD
// -----------------------------------------------------------------------------
export async function getUsers(): Promise<User[]> {
  const cached = readCache(usersCache);
  if (cached) return cached;
  const rows = await requireDb()
    .select()
    .from(users)
    .orderBy(asc(users.displayName));
  usersCache = writeCache(rows, USERS_CACHE_TTL_MS);
  return rows;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const rows = await requireDb()
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0];
}

export async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  const rows = await requireDb()
    .select()
    .from(users)
    .where(inArray(users.id, ids));
  return rows;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const rows = await requireDb()
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return rows[0];
}

export async function createUser(data: InsertUser): Promise<User> {
  const rows = await requireDb().insert(users).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create user");
  invalidateUsersCache();
  return rows[0];
}

export async function updateUser(
  id: string,
  data: Partial<Omit<InsertUser, "id">>,
): Promise<User> {
  const rows = await requireDb()
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (!rows[0]) throw new Error(`User ${id} not found`);
  invalidateUsersCache();
  return rows[0];
}

export async function deleteUser(id: string): Promise<void> {
  const existing = await getUserById(id);
  if (!existing) throw new Error(`User ${id} not found`);
  await requireDb().delete(users).where(eq(users.id, id));
  invalidateUsersCache();
}

/** User kèm roles, groups và roleAssignments từ user_roles, user_groups (nguồn duy nhất). */
export async function getUsersWithRolesAndGroups(): Promise<
  UserWithRolesAndGroups[]
> {
  const [userList, allUr, allUg, roleList, groupList] = await Promise.all([
    requireDb().select().from(users).orderBy(asc(users.displayName)),
    requireDb().select().from(userRoles),
    requireDb().select().from(userGroups),
    requireDb().select().from(roles).orderBy(asc(roles.name)),
    requireDb().select().from(groups).orderBy(asc(groups.name)),
  ]);
  const roleById = Object.fromEntries(roleList.map((r) => [r.id, r]));
  const groupById = Object.fromEntries(groupList.map((g) => [g.id, g]));
  return userList.map((u) => {
    const userUr = allUr.filter((ur) => ur.userId === u.id);
    const rolesList = Array.from(
      new Set(userUr.map((ur) => roleById[ur.roleId]).filter(Boolean)),
    );
    return {
      ...u,
      roles: rolesList,
      groups: allUg
        .filter((ug) => ug.userId === u.id)
        .map((ug) => groupById[ug.groupId])
        .filter(Boolean),
      roleAssignments: userUr.map((ur) => ({
        roleId: ur.roleId,
        componentId: ur.componentId ?? null,
      })),
    };
  });
}

/** User theo id kèm roles, groups và roleAssignments. */
export async function getUserByIdWithRolesAndGroups(
  id: string,
): Promise<UserWithRolesAndGroups | undefined> {
  const u = await getUserById(id);
  if (!u) return undefined;
  const [userRolesRows, userGroupsRows] = await Promise.all([
    requireDb().select().from(userRoles).where(eq(userRoles.userId, id)),
    requireDb().select().from(userGroups).where(eq(userGroups.userId, id)),
  ]);
  const roleIds = Array.from(new Set(userRolesRows.map((ur) => ur.roleId)));
  const groupIds = Array.from(new Set(userGroupsRows.map((ug) => ug.groupId)));
  const [roleList, groupList] = await Promise.all([
    roleIds.length
      ? requireDb().select().from(roles).where(inArray(roles.id, roleIds))
      : [],
    groupIds.length
      ? requireDb().select().from(groups).where(inArray(groups.id, groupIds))
      : [],
  ]);
  const roleById = Object.fromEntries(roleList.map((r) => [r.id, r]));
  const groupById = Object.fromEntries(groupList.map((g) => [g.id, g]));
  const rolesList = Array.from(
    new Set(userRolesRows.map((ur) => roleById[ur.roleId]).filter(Boolean)),
  );
  return {
    ...u,
    roles: rolesList,
    groups: userGroupsRows.map((ug) => groupById[ug.groupId]).filter(Boolean),
    roleAssignments: userRolesRows.map((ur) => ({
      roleId: ur.roleId,
      componentId: ur.componentId ?? null,
    })),
  };
}

/** Ghi đè toàn bộ roles của user với component_id = null (nguồn duy nhất: user_roles). */
export async function setUserRoles(
  userId: string,
  roleIds: string[],
): Promise<void> {
  await requireDb().delete(userRoles).where(eq(userRoles.userId, userId));
  if (roleIds.length) {
    await requireDb()
      .insert(userRoles)
      .values(roleIds.map((roleId) => ({ userId, roleId, componentId: null })));
  }
}

/** Ghi đè toàn bộ role assignments của user (roleId + componentId). Dùng cho thư ký nhiều hợp phần. */
export async function setUserRoleAssignments(
  userId: string,
  assignments: Array<{ roleId: string; componentId?: string | null }>,
): Promise<void> {
  await requireDb().delete(userRoles).where(eq(userRoles.userId, userId));
  if (assignments.length) {
    await requireDb()
      .insert(userRoles)
      .values(
        assignments.map((a) => ({
          userId,
          roleId: a.roleId,
          componentId: a.componentId ?? null,
        })),
      );
  }
}

/** Ghi đè toàn bộ groups của user (nguồn duy nhất: user_groups). */
export async function setUserGroups(
  userId: string,
  groupIds: string[],
): Promise<void> {
  await requireDb().delete(userGroups).where(eq(userGroups.userId, userId));
  if (groupIds.length) {
    await requireDb()
      .insert(userGroups)
      .values(groupIds.map((groupId) => ({ userId, groupId })));
  }
}

// -----------------------------------------------------------------------------
// Contracts CRUD
// -----------------------------------------------------------------------------
export async function getContracts(): Promise<Contract[]> {
  const rows = await requireDb()
    .select()
    .from(contracts)
    .orderBy(asc(contracts.createdAt));
  return rows;
}

export async function getContractById(
  id: string,
): Promise<Contract | undefined> {
  const rows = await requireDb()
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);
  return rows[0];
}

export async function createContract(data: InsertContract): Promise<Contract> {
  const rows = await requireDb().insert(contracts).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create contract");
  return rows[0];
}

export async function updateContract(
  id: string,
  data: Partial<Omit<InsertContract, "id">>,
): Promise<Contract> {
  const rows = await requireDb()
    .update(contracts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(contracts.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Contract ${id} not found`);
  return rows[0];
}

export async function deleteContract(id: string): Promise<void> {
  const existing = await getContractById(id);
  if (!existing) throw new Error(`Contract ${id} not found`);
  await requireDb().delete(contracts).where(eq(contracts.id, id));
}

// -----------------------------------------------------------------------------
// Tasks CRUD (for DatabaseStorage)
// -----------------------------------------------------------------------------
export async function getTasksFromDb(): Promise<Task[]> {
  const rows = await requireDb()
    .select()
    .from(tasks)
    .orderBy(asc(tasks.createdAt));
  return rows;
}

export async function getTaskFromDbById(id: string): Promise<Task | undefined> {
  const rows = await requireDb()
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);
  return rows[0];
}

export async function createTaskInDb(
  data: Omit<InsertTask, "id"> & { id?: string },
): Promise<Task> {
  const id =
    data.id ?? `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const rows = await requireDb()
    .insert(tasks)
    .values({ ...data, id } as InsertTask)
    .returning();
  if (!rows[0]) throw new Error("Failed to create task");
  return rows[0];
}

export async function updateTaskInDb(
  id: string,
  data: UpdateTaskRequest,
): Promise<Task> {
  const rows = await requireDb()
    .update(tasks)
    .set({ ...data, updatedAt: new Date() } as Partial<InsertTask>)
    .where(eq(tasks.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Task ${id} not found`);
  return rows[0];
}

export async function deleteTaskFromDb(id: string): Promise<void> {
  const existing = await getTaskFromDbById(id);
  if (!existing) throw new Error(`Task ${id} not found`);
  await requireDb().delete(tasks).where(eq(tasks.id, id));
}

// -----------------------------------------------------------------------------
// Documents CRUD
// -----------------------------------------------------------------------------
export async function getDocuments(): Promise<Document[]> {
  const rows = await requireDb()
    .select()
    .from(documents)
    .orderBy(asc(documents.createdAt));
  return rows;
}

export async function getDocumentById(
  id: string,
): Promise<Document | undefined> {
  const rows = await requireDb()
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  return rows[0];
}

export async function createDocument(data: InsertDocument): Promise<Document> {
  const rows = await requireDb().insert(documents).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create document");
  return rows[0];
}

export async function updateDocument(
  id: string,
  data: Partial<Omit<InsertDocument, "id">>,
): Promise<Document> {
  const rows = await requireDb()
    .update(documents)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Document ${id} not found`);
  return rows[0];
}

export async function deleteDocument(id: string): Promise<void> {
  const existing = await getDocumentById(id);
  if (!existing) throw new Error(`Document ${id} not found`);
  await requireDb().delete(documents).where(eq(documents.id, id));
}

// -----------------------------------------------------------------------------
// Components CRUD (Hợp phần dịch thuật)
// -----------------------------------------------------------------------------
export async function getComponentsFromDb(): Promise<Component[]> {
  return requireDb()
    .select()
    .from(components)
    .orderBy(asc(components.displayOrder), asc(components.code));
}

export async function getComponentById(
  id: string,
): Promise<Component | undefined> {
  const rows = await requireDb()
    .select()
    .from(components)
    .where(eq(components.id, id))
    .limit(1);
  return rows[0];
}

export async function createComponent(
  data: InsertComponent,
): Promise<Component> {
  const rows = await requireDb().insert(components).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create component");
  return rows[0];
}

export async function updateComponent(
  id: string,
  data: Partial<InsertComponent>,
): Promise<Component> {
  const rows = await requireDb()
    .update(components)
    .set(data)
    .where(eq(components.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Component ${id} not found`);
  return rows[0];
}

// -----------------------------------------------------------------------------
// Contract stages CRUD (giai đoạn hợp đồng)
// -----------------------------------------------------------------------------
export async function getContractStagesByTranslationContractId(
  translationContractId: string,
): Promise<ContractStage[]> {
  try {
    return requireDb()
      .select()
      .from(contractStages)
      .where(eq(contractStages.translationContractId, translationContractId))
      .orderBy(asc(contractStages.stageOrder), asc(contractStages.stageCode));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error in getContractStagesByTranslationContractId:", msg);
    if (
      msg.includes("contract_stages") &&
      (msg.includes("relation") ||
        msg.includes("does not exist") ||
        msg.includes("column"))
    ) {
      console.error(
        "Database schema mismatch: contract_stages table/columns missing. Please run migration: attached_assets/KDPD_DB_migration_components_contract_stages.sql",
      );
      return [];
    }
    throw error;
  }
}

export async function getContractStagesByProofreadingContractId(
  proofreadingContractId: string,
): Promise<ContractStage[]> {
  try {
    return requireDb()
      .select()
      .from(contractStages)
      .where(eq(contractStages.proofreadingContractId, proofreadingContractId))
      .orderBy(asc(contractStages.stageOrder), asc(contractStages.stageCode));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error in getContractStagesByProofreadingContractId:", msg);
    if (
      msg.includes("contract_stages") &&
      (msg.includes("relation") ||
        msg.includes("does not exist") ||
        msg.includes("column"))
    ) {
      console.error(
        "Database schema mismatch: contract_stages table/columns missing. Please run migration: attached_assets/KDPD_DB_migration_components_contract_stages.sql",
      );
      return [];
    }
    throw error;
  }
}

export async function createContractStage(
  data: InsertContractStage,
): Promise<ContractStage> {
  const rows = await requireDb()
    .insert(contractStages)
    .values(data)
    .returning();
  if (!rows[0]) throw new Error("Failed to create contract stage");
  return rows[0];
}

export async function updateContractStage(
  id: string,
  data: Partial<InsertContractStage>,
): Promise<ContractStage> {
  const rows = await requireDb()
    .update(contractStages)
    .set(data)
    .where(eq(contractStages.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Contract stage ${id} not found`);
  return rows[0];
}

export async function deleteContractStage(id: string): Promise<void> {
  const rows = await requireDb()
    .select()
    .from(contractStages)
    .where(eq(contractStages.id, id))
    .limit(1);
  if (!rows[0]) throw new Error(`Contract stage ${id} not found`);
  await requireDb().delete(contractStages).where(eq(contractStages.id, id));
}

// -----------------------------------------------------------------------------
// Works CRUD (trục nghiệp vụ – Work/Contract taxonomy)
// -----------------------------------------------------------------------------
export async function getWorksFromDb(): Promise<Work[]> {
  return requireDb().select().from(works).orderBy(asc(works.createdAt));
}

export async function getWorkById(id: string): Promise<Work | undefined> {
  const rows = await requireDb()
    .select()
    .from(works)
    .where(eq(works.id, id))
    .limit(1);
  return rows[0];
}

export async function createWork(data: InsertWork): Promise<Work> {
  const rows = await requireDb().insert(works).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create work");
  return rows[0];
}

export async function updateWork(
  id: string,
  data: Partial<InsertWork>,
): Promise<Work> {
  const rows = await requireDb()
    .update(works)
    .set(data)
    .where(eq(works.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Work ${id} not found`);
  return rows[0];
}

export async function deleteWork(id: string): Promise<void> {
  const existing = await getWorkById(id);
  if (!existing) throw new Error(`Work ${id} not found`);
  await requireDb().delete(works).where(eq(works.id, id));
}

// -----------------------------------------------------------------------------
// Translation contracts CRUD
// -----------------------------------------------------------------------------
export async function getTranslationContractsFromDb(): Promise<
  TranslationContract[]
> {
  return requireDb()
    .select()
    .from(translationContracts)
    .orderBy(asc(translationContracts.contractNumber));
}

export async function getTranslationContractById(
  id: string,
): Promise<TranslationContract | undefined> {
  const rows = await requireDb()
    .select()
    .from(translationContracts)
    .where(eq(translationContracts.id, id))
    .limit(1);
  return rows[0];
}

export async function findDuplicateTranslationContract(
  componentId: string,
  workId: string,
  contractNumber: string,
  excludeId?: string,
): Promise<TranslationContract | undefined> {
  const whereClause = excludeId
    ? and(
        eq(translationContracts.componentId, componentId),
        eq(translationContracts.workId, workId),
        eq(translationContracts.contractNumber, contractNumber),
        ne(translationContracts.id, excludeId),
      )
    : and(
        eq(translationContracts.componentId, componentId),
        eq(translationContracts.workId, workId),
        eq(translationContracts.contractNumber, contractNumber),
      );
  const rows = await requireDb()
    .select()
    .from(translationContracts)
    .where(whereClause)
    .limit(1);
  return rows[0];
}

export async function createTranslationContract(
  data: InsertTranslationContract,
): Promise<TranslationContract> {
  const rows = await requireDb()
    .insert(translationContracts)
    .values(data)
    .returning();
  if (!rows[0]) throw new Error("Failed to create translation contract");
  return rows[0];
}

export async function updateTranslationContract(
  id: string,
  data: Partial<InsertTranslationContract>,
): Promise<TranslationContract> {
  const rows = await requireDb()
    .update(translationContracts)
    .set(data)
    .where(eq(translationContracts.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Translation contract ${id} not found`);
  return rows[0];
}

// -----------------------------------------------------------------------------
// Payments CRUD
// -----------------------------------------------------------------------------
export async function getPayments(): Promise<Payment[]> {
  return requireDb()
    .select()
    .from(payments)
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt));
}

export async function getPaymentsByTranslationContractId(
  translationContractId: string,
): Promise<Payment[]> {
  return requireDb()
    .select()
    .from(payments)
    .where(eq(payments.contractId, translationContractId))
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt));
}

export async function getPaymentsByProofreadingContractId(
  proofreadingContractId: string,
): Promise<Payment[]> {
  return requireDb()
    .select()
    .from(payments)
    .where(eq(payments.contractId, proofreadingContractId))
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt));
}

export async function createPayment(data: InsertPayment): Promise<Payment> {
  const rows = await requireDb().insert(payments).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create payment");
  return rows[0];
}

export async function deletePayment(id: string): Promise<void> {
  await requireDb().delete(payments).where(eq(payments.id, id));
}

export async function updatePayment(
  id: string,
  data: Partial<InsertPayment>,
): Promise<Payment> {
  const rows = await requireDb()
    .update(payments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(payments.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Payment ${id} not found`);
  return rows[0];
}

/** Tính tổng chi (SUM(payments.amount)) và công nợ theo chuẩn: (settlementValue|contractValue) - SUM(payments.amount) */
export async function getTranslationContractFinanceSummary(
  translationContractId: string,
): Promise<{
  totalPaid: number;
  totalAdvance: number;
  outstanding: number;
}> {
  const [tc, list] = await Promise.all([
    getTranslationContractById(translationContractId),
    getPaymentsByTranslationContractId(translationContractId),
  ]);
  const totalPaid = list.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalAdvance = list
    .filter((p) => (p.paymentType || "").toLowerCase() === "advance")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const base =
    tc?.settlementValue != null && !Number.isNaN(Number(tc.settlementValue))
      ? Number(tc.settlementValue)
      : tc?.contractValue != null && !Number.isNaN(Number(tc.contractValue))
        ? Number(tc.contractValue)
        : 0;
  const outstanding = Math.max(base - totalPaid, 0);
  return { totalPaid, totalAdvance, outstanding };
}

/** Finance summary for proofreading contract: base = contractValue */
export async function getProofreadingContractFinanceSummary(
  proofreadingContractId: string,
): Promise<{
  totalPaid: number;
  totalAdvance: number;
  outstanding: number;
}> {
  const [pc, list] = await Promise.all([
    getProofreadingContractById(proofreadingContractId),
    getPaymentsByProofreadingContractId(proofreadingContractId),
  ]);
  const totalPaid = list.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalAdvance = list
    .filter((p) => (p.paymentType || "").toLowerCase() === "advance")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const base =
    pc?.contractValue != null && !Number.isNaN(Number(pc.contractValue))
      ? Number(pc.contractValue)
      : 0;
  const outstanding = Math.max(base - totalPaid, 0);
  return { totalPaid, totalAdvance, outstanding };
}

export async function deleteTranslationContract(
  id: string,
): Promise<TranslationContract> {
  const rows = await requireDb()
    .delete(translationContracts)
    .where(eq(translationContracts.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Translation contract ${id} not found`);
  return rows[0];
}

// -----------------------------------------------------------------------------
// Proofreading contracts CRUD
// -----------------------------------------------------------------------------
export async function getProofreadingContractsFromDb(): Promise<
  ProofreadingContract[]
> {
  try {
    // Select only columns defined in schema (explicitly exclude proofreader_name if it exists in DB)
    return requireDb()
      .select({
        id: proofreadingContracts.id,
        contractNumber: proofreadingContracts.contractNumber,
        componentId: proofreadingContracts.componentId,
        workId: proofreadingContracts.workId,
        translationContractId: proofreadingContracts.translationContractId,
        pageCount: proofreadingContracts.pageCount,
        rateRatio: proofreadingContracts.rateRatio,
        contractValue: proofreadingContracts.contractValue,
        startDate: proofreadingContracts.startDate,
        endDate: proofreadingContracts.endDate,
        actualCompletionDate: proofreadingContracts.actualCompletionDate,
        note: proofreadingContracts.note,
      })
      .from(proofreadingContracts)
      .orderBy(asc(proofreadingContracts.contractNumber));
  } catch (error) {
    console.error("Error in getProofreadingContractsFromDb:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("proofreader_name") ||
      errorMessage.includes("column") ||
      errorMessage.includes("does not exist")
    ) {
      throw new Error(
        "Database schema mismatch: proofreader_name column may still exist in database. Please run migration: KDPD_DB_migration_drop_proofreader_name.sql",
      );
    }
    throw error;
  }
}

export async function getProofreadingContractById(
  id: string,
): Promise<ProofreadingContract | undefined> {
  try {
    const rows = await requireDb()
      .select({
        id: proofreadingContracts.id,
        contractNumber: proofreadingContracts.contractNumber,
        componentId: proofreadingContracts.componentId,
        workId: proofreadingContracts.workId,
        translationContractId: proofreadingContracts.translationContractId,
        pageCount: proofreadingContracts.pageCount,
        rateRatio: proofreadingContracts.rateRatio,
        contractValue: proofreadingContracts.contractValue,
        startDate: proofreadingContracts.startDate,
        endDate: proofreadingContracts.endDate,
        actualCompletionDate: proofreadingContracts.actualCompletionDate,
        note: proofreadingContracts.note,
      })
      .from(proofreadingContracts)
      .where(eq(proofreadingContracts.id, id))
      .limit(1);
    return rows[0];
  } catch (error) {
    console.error("Error in getProofreadingContractById:", error);
    throw error;
  }
}

export async function createProofreadingContract(
  data: InsertProofreadingContract,
): Promise<ProofreadingContract> {
  const rows = await requireDb()
    .insert(proofreadingContracts)
    .values(data)
    .returning();
  if (!rows[0]) throw new Error("Failed to create proofreading contract");
  return rows[0];
}

export async function updateProofreadingContract(
  id: string,
  data: Partial<InsertProofreadingContract>,
): Promise<ProofreadingContract> {
  const rows = await requireDb()
    .update(proofreadingContracts)
    .set(data)
    .where(eq(proofreadingContracts.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Proofreading contract ${id} not found`);
  return rows[0];
}

export async function deleteProofreadingContract(
  id: string,
): Promise<ProofreadingContract> {
  const rows = await requireDb()
    .delete(proofreadingContracts)
    .where(eq(proofreadingContracts.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Proofreading contract ${id} not found`);
  return rows[0];
}

// -----------------------------------------------------------------------------
// Task assignments CRUD
// -----------------------------------------------------------------------------
export async function getTaskAssignments(): Promise<TaskAssignment[]> {
  return requireDb()
    .select()
    .from(taskAssignments)
    .orderBy(asc(taskAssignments.createdAt));
}

export async function getTaskAssignmentsByTaskId(
  taskId: string,
): Promise<TaskAssignment[]> {
  return requireDb()
    .select()
    .from(taskAssignments)
    .where(eq(taskAssignments.taskId, taskId))
    .orderBy(asc(taskAssignments.roundNumber), asc(taskAssignments.createdAt));
}

/** Lấy tất cả assignments cho nhiều task (để merge assignee/dates vào list tasks) */
export async function getTaskAssignmentsByTaskIds(
  taskIds: string[],
): Promise<TaskAssignment[]> {
  if (taskIds.length === 0) return [];
  return requireDb()
    .select()
    .from(taskAssignments)
    .where(inArray(taskAssignments.taskId, taskIds))
    .orderBy(
      asc(taskAssignments.taskId),
      asc(taskAssignments.roundNumber),
      asc(taskAssignments.createdAt),
    );
}

export async function getTaskAssignmentsByUserId(
  userId: string,
): Promise<TaskAssignment[]> {
  return requireDb()
    .select()
    .from(taskAssignments)
    .where(eq(taskAssignments.userId, userId))
    .orderBy(asc(taskAssignments.createdAt));
}

export async function getTaskAssignmentById(
  id: string,
): Promise<TaskAssignment | undefined> {
  const rows = await requireDb()
    .select()
    .from(taskAssignments)
    .where(eq(taskAssignments.id, id))
    .limit(1);
  return rows[0];
}

export async function createTaskAssignment(
  data: Omit<InsertTaskAssignment, "id">,
): Promise<TaskAssignment> {
  const rows = await requireDb()
    .insert(taskAssignments)
    .values(data)
    .returning();
  if (!rows[0]) throw new Error("Failed to create task assignment");
  return rows[0];
}

export async function updateTaskAssignment(
  id: string,
  data: Partial<Omit<InsertTaskAssignment, "id">>,
): Promise<TaskAssignment> {
  const rows = await requireDb()
    .update(taskAssignments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(taskAssignments.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Task assignment ${id} not found`);
  return rows[0];
}

export async function deleteTaskAssignment(id: string): Promise<void> {
  const existing = await getTaskAssignmentById(id);
  if (!existing) throw new Error(`Task assignment ${id} not found`);
  await requireDb().delete(taskAssignments).where(eq(taskAssignments.id, id));
}

export async function deleteTaskAssignmentsByTaskId(
  taskId: string,
): Promise<void> {
  await requireDb()
    .delete(taskAssignments)
    .where(eq(taskAssignments.taskId, taskId));
}

// -----------------------------------------------------------------------------
// Notifications CRUD
// -----------------------------------------------------------------------------
export async function createNotification(
  data: Omit<InsertNotification, "id"> & { id?: string },
): Promise<Notification> {
  const rows = await requireDb().insert(notifications).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create notification");
  return rows[0];
}

export async function getNotificationsByUserId(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number },
): Promise<Notification[]> {
  const unreadOnly = options?.unreadOnly ?? false;
  let rows = await requireDb()
    .select()
    .from(notifications)
    .where(
      unreadOnly
        ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
        : eq(notifications.userId, userId),
    )
    .orderBy(desc(notifications.createdAt));
  if (options?.limit && rows.length > options.limit) {
    rows = rows.slice(0, options.limit);
  }
  return rows;
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<Notification | undefined> {
  const rows = await requireDb()
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    )
    .returning();
  return rows[0];
}

export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const rows = await requireDb()
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    );
  return rows.length;
}

export async function getNotificationByAssignmentType(
  userId: string,
  taskAssignmentId: string,
  type: string,
): Promise<Notification | undefined> {
  const rows = await requireDb()
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.taskAssignmentId, taskAssignmentId),
        eq(notifications.type, type),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function getNotificationByTaskType(
  userId: string,
  taskId: string,
  type: string,
): Promise<Notification | undefined> {
  const rows = await requireDb()
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.taskId, taskId),
        eq(notifications.type, type),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function getTaskAssignmentsWithTaskByUserId(
  userId: string,
): Promise<Array<{ assignment: TaskAssignment; task: Task }>> {
  return requireDb()
    .select({ assignment: taskAssignments, task: tasks })
    .from(taskAssignments)
    .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
    .where(eq(taskAssignments.userId, userId))
    .orderBy(desc(taskAssignments.createdAt));
}

// -----------------------------------------------------------------------------
// Contract members CRUD
// -----------------------------------------------------------------------------
export async function getContractMembers(): Promise<ContractMember[]> {
  return requireDb()
    .select()
    .from(contractMembers)
    .orderBy(asc(contractMembers.createdAt));
}

export async function getContractMembersByContractId(
  contractId: string,
): Promise<ContractMember[]> {
  return requireDb()
    .select()
    .from(contractMembers)
    .where(eq(contractMembers.contractId, contractId))
    .orderBy(asc(contractMembers.createdAt));
}

export async function getContractMemberById(
  id: string,
): Promise<ContractMember | undefined> {
  const rows = await requireDb()
    .select()
    .from(contractMembers)
    .where(eq(contractMembers.id, id))
    .limit(1);
  return rows[0];
}

export async function createContractMember(
  data: Omit<InsertContractMember, "id">,
): Promise<ContractMember> {
  const rows = await requireDb()
    .insert(contractMembers)
    .values(data)
    .returning();
  if (!rows[0]) throw new Error("Failed to create contract member");
  return rows[0];
}

export async function updateContractMember(
  id: string,
  data: Partial<Omit<InsertContractMember, "id">>,
): Promise<ContractMember> {
  const rows = await requireDb()
    .update(contractMembers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(contractMembers.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Contract member ${id} not found`);
  return rows[0];
}

export async function deleteContractMember(id: string): Promise<void> {
  const existing = await getContractMemberById(id);
  if (!existing) throw new Error(`Contract member ${id} not found`);
  await requireDb().delete(contractMembers).where(eq(contractMembers.id, id));
}

// -----------------------------------------------------------------------------
// Translation contract members CRUD
// -----------------------------------------------------------------------------
export async function getTranslationContractMembers(): Promise<
  TranslationContractMember[]
> {
  return requireDb()
    .select()
    .from(translationContractMembers)
    .orderBy(asc(translationContractMembers.createdAt));
}

export async function getTranslationContractMembersByContractId(
  translationContractId: string,
): Promise<TranslationContractMember[]> {
  return requireDb()
    .select()
    .from(translationContractMembers)
    .where(
      eq(
        translationContractMembers.translationContractId,
        translationContractId,
      ),
    )
    .orderBy(asc(translationContractMembers.createdAt));
}

export async function getTranslationContractMemberById(
  id: string,
): Promise<TranslationContractMember | undefined> {
  const rows = await requireDb()
    .select()
    .from(translationContractMembers)
    .where(eq(translationContractMembers.id, id))
    .limit(1);
  return rows[0];
}

export async function createTranslationContractMember(
  data: Omit<InsertTranslationContractMember, "id">,
): Promise<TranslationContractMember> {
  const rows = await requireDb()
    .insert(translationContractMembers)
    .values(data)
    .returning();
  if (!rows[0]) throw new Error("Failed to create translation contract member");
  return rows[0];
}

export async function updateTranslationContractMember(
  id: string,
  data: Partial<Omit<InsertTranslationContractMember, "id">>,
): Promise<TranslationContractMember> {
  const rows = await requireDb()
    .update(translationContractMembers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(translationContractMembers.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Translation contract member ${id} not found`);
  return rows[0];
}

export async function deleteTranslationContractMember(
  id: string,
): Promise<void> {
  const existing = await getTranslationContractMemberById(id);
  if (!existing) throw new Error(`Translation contract member ${id} not found`);
  await requireDb()
    .delete(translationContractMembers)
    .where(eq(translationContractMembers.id, id));
}

export async function deleteTranslationContractMembersByContractId(
  translationContractId: string,
): Promise<void> {
  await requireDb()
    .delete(translationContractMembers)
    .where(
      eq(
        translationContractMembers.translationContractId,
        translationContractId,
      ),
    );
}

// -----------------------------------------------------------------------------
// Proofreading contract members CRUD
// -----------------------------------------------------------------------------
export async function getProofreadingContractMembers(): Promise<
  ProofreadingContractMember[]
> {
  return requireDb()
    .select()
    .from(proofreadingContractMembers)
    .orderBy(asc(proofreadingContractMembers.createdAt));
}

export async function getProofreadingContractMembersByContractId(
  proofreadingContractId: string,
): Promise<ProofreadingContractMember[]> {
  return requireDb()
    .select()
    .from(proofreadingContractMembers)
    .where(
      eq(
        proofreadingContractMembers.proofreadingContractId,
        proofreadingContractId,
      ),
    )
    .orderBy(asc(proofreadingContractMembers.createdAt));
}

export async function getProofreadingContractMemberById(
  id: string,
): Promise<ProofreadingContractMember | undefined> {
  const rows = await requireDb()
    .select()
    .from(proofreadingContractMembers)
    .where(eq(proofreadingContractMembers.id, id))
    .limit(1);
  return rows[0];
}

export async function createProofreadingContractMember(
  data: Omit<InsertProofreadingContractMember, "id">,
): Promise<ProofreadingContractMember> {
  const rows = await requireDb()
    .insert(proofreadingContractMembers)
    .values(data)
    .returning();
  if (!rows[0])
    throw new Error("Failed to create proofreading contract member");
  return rows[0];
}

export async function updateProofreadingContractMember(
  id: string,
  data: Partial<Omit<InsertProofreadingContractMember, "id">>,
): Promise<ProofreadingContractMember> {
  const rows = await requireDb()
    .update(proofreadingContractMembers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(proofreadingContractMembers.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Proofreading contract member ${id} not found`);
  return rows[0];
}

export async function deleteProofreadingContractMember(
  id: string,
): Promise<void> {
  const existing = await getProofreadingContractMemberById(id);
  if (!existing)
    throw new Error(`Proofreading contract member ${id} not found`);
  await requireDb()
    .delete(proofreadingContractMembers)
    .where(eq(proofreadingContractMembers.id, id));
}

export async function deleteProofreadingContractMembersByContractId(
  proofreadingContractId: string,
): Promise<void> {
  await requireDb()
    .delete(proofreadingContractMembers)
    .where(
      eq(
        proofreadingContractMembers.proofreadingContractId,
        proofreadingContractId,
      ),
    );
}

// -----------------------------------------------------------------------------
// Document tasks CRUD
// -----------------------------------------------------------------------------
export async function getDocumentTasks(): Promise<DocumentTask[]> {
  return requireDb()
    .select()
    .from(documentTasks)
    .orderBy(asc(documentTasks.createdAt));
}

export async function getDocumentTaskById(
  id: string,
): Promise<DocumentTask | undefined> {
  const rows = await requireDb()
    .select()
    .from(documentTasks)
    .where(eq(documentTasks.id, id))
    .limit(1);
  return rows[0];
}

export async function createDocumentTask(
  data: Omit<InsertDocumentTask, "id">,
): Promise<DocumentTask> {
  const rows = await requireDb().insert(documentTasks).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create document task");
  return rows[0];
}

export async function updateDocumentTask(
  id: string,
  data: Partial<Omit<InsertDocumentTask, "id">>,
): Promise<DocumentTask> {
  const rows = await requireDb()
    .update(documentTasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(documentTasks.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Document task ${id} not found`);
  return rows[0];
}

export async function deleteDocumentTask(id: string): Promise<void> {
  const existing = await getDocumentTaskById(id);
  if (!existing) throw new Error(`Document task ${id} not found`);
  await requireDb().delete(documentTasks).where(eq(documentTasks.id, id));
}

// -----------------------------------------------------------------------------
// Document contracts CRUD
// -----------------------------------------------------------------------------
export async function getDocumentContracts(): Promise<DocumentContract[]> {
  return requireDb()
    .select()
    .from(documentContracts)
    .orderBy(asc(documentContracts.createdAt));
}

export async function getDocumentContractById(
  id: string,
): Promise<DocumentContract | undefined> {
  const rows = await requireDb()
    .select()
    .from(documentContracts)
    .where(eq(documentContracts.id, id))
    .limit(1);
  return rows[0];
}

export async function createDocumentContract(
  data: Omit<InsertDocumentContract, "id">,
): Promise<DocumentContract> {
  const rows = await requireDb()
    .insert(documentContracts)
    .values(data)
    .returning();
  if (!rows[0]) throw new Error("Failed to create document contract");
  return rows[0];
}

export async function updateDocumentContract(
  id: string,
  data: Partial<Omit<InsertDocumentContract, "id">>,
): Promise<DocumentContract> {
  const rows = await requireDb()
    .update(documentContracts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(documentContracts.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Document contract ${id} not found`);
  return rows[0];
}

export async function deleteDocumentContract(id: string): Promise<void> {
  const existing = await getDocumentContractById(id);
  if (!existing) throw new Error(`Document contract ${id} not found`);
  await requireDb()
    .delete(documentContracts)
    .where(eq(documentContracts.id, id));
}

// -----------------------------------------------------------------------------
// Groups CRUD
// -----------------------------------------------------------------------------
export async function getGroups(): Promise<Group[]> {
  return requireDb().select().from(groups).orderBy(asc(groups.name));
}

export async function getGroupById(id: string): Promise<Group | undefined> {
  const rows = await requireDb()
    .select()
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1);
  return rows[0];
}

export async function createGroup(
  data: Omit<InsertGroup, "id">,
): Promise<Group> {
  const rows = await requireDb().insert(groups).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create group");
  return rows[0];
}

export async function updateGroup(
  id: string,
  data: Partial<Omit<InsertGroup, "id">>,
): Promise<Group> {
  const rows = await requireDb()
    .update(groups)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(groups.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Group ${id} not found`);
  return rows[0];
}

export async function deleteGroup(id: string): Promise<void> {
  const existing = await getGroupById(id);
  if (!existing) throw new Error(`Group ${id} not found`);
  await requireDb().delete(groups).where(eq(groups.id, id));
}

// -----------------------------------------------------------------------------
// User groups CRUD
// -----------------------------------------------------------------------------
export async function getUserGroups(): Promise<UserGroup[]> {
  return requireDb()
    .select()
    .from(userGroups)
    .orderBy(asc(userGroups.createdAt));
}

export async function getUserGroupsByUserId(
  userId: string,
): Promise<UserGroup[]> {
  return requireDb()
    .select()
    .from(userGroups)
    .where(eq(userGroups.userId, userId))
    .orderBy(asc(userGroups.createdAt));
}

export async function getUserGroupById(
  id: string,
): Promise<UserGroup | undefined> {
  const rows = await requireDb()
    .select()
    .from(userGroups)
    .where(eq(userGroups.id, id))
    .limit(1);
  return rows[0];
}

export async function createUserGroup(
  data: Omit<InsertUserGroup, "id">,
): Promise<UserGroup> {
  const rows = await requireDb().insert(userGroups).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create user group");
  return rows[0];
}

export async function deleteUserGroup(id: string): Promise<void> {
  const existing = await getUserGroupById(id);
  if (!existing) throw new Error(`User group ${id} not found`);
  await requireDb().delete(userGroups).where(eq(userGroups.id, id));
}

// -----------------------------------------------------------------------------
// Roles CRUD
// -----------------------------------------------------------------------------
export async function getRoles(): Promise<Role[]> {
  const cached = readCache(rolesCache);
  if (cached) return cached;
  const rows = await requireDb().select().from(roles).orderBy(asc(roles.name));
  rolesCache = writeCache(rows, ROLES_CACHE_TTL_MS);
  return rows;
}

export async function getRoleById(id: string): Promise<Role | undefined> {
  const rows = await requireDb()
    .select()
    .from(roles)
    .where(eq(roles.id, id))
    .limit(1);
  return rows[0];
}

export async function createRole(data: Omit<InsertRole, "id">): Promise<Role> {
  const rows = await requireDb().insert(roles).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create role");
  invalidateRolesCache();
  return rows[0];
}

export async function updateRole(
  id: string,
  data: Partial<Omit<InsertRole, "id">>,
): Promise<Role> {
  const rows = await requireDb()
    .update(roles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(roles.id, id))
    .returning();
  if (!rows[0]) throw new Error(`Role ${id} not found`);
  invalidateRolesCache();
  return rows[0];
}

export async function deleteRole(id: string): Promise<void> {
  const existing = await getRoleById(id);
  if (!existing) throw new Error(`Role ${id} not found`);
  await requireDb().delete(roles).where(eq(roles.id, id));
  invalidateRolesCache();
}

// -----------------------------------------------------------------------------
// User roles CRUD
// -----------------------------------------------------------------------------
export async function getUserRoles(): Promise<UserRoleRow[]> {
  return requireDb().select().from(userRoles).orderBy(asc(userRoles.createdAt));
}

export async function getUserRolesByUserId(
  userId: string,
): Promise<UserRoleRow[]> {
  return requireDb()
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .orderBy(asc(userRoles.createdAt));
}

export async function getUserRoleById(
  id: string,
): Promise<UserRoleRow | undefined> {
  const rows = await requireDb()
    .select()
    .from(userRoles)
    .where(eq(userRoles.id, id))
    .limit(1);
  return rows[0];
}

export async function createUserRole(
  data: Omit<InsertUserRole, "id">,
): Promise<UserRoleRow> {
  const rows = await requireDb().insert(userRoles).values(data).returning();
  if (!rows[0]) throw new Error("Failed to create user role");
  return rows[0];
}

export async function deleteUserRole(id: string): Promise<void> {
  const existing = await getUserRoleById(id);
  if (!existing) throw new Error(`User role ${id} not found`);
  await requireDb().delete(userRoles).where(eq(userRoles.id, id));
}
