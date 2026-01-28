import { eq, asc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  contracts,
  tasks,
  documents,
  type User,
  type InsertUser,
  type Contract,
  type InsertContract,
  type Task,
  type InsertTask,
  type UpdateTaskRequest,
  type Document,
  type InsertDocument,
} from "@shared/schema";

function requireDb() {
  if (!db) {
    throw new Error("Database not configured. Set DATABASE_URL.");
  }
  return db;
}

// -----------------------------------------------------------------------------
// Users CRUD
// -----------------------------------------------------------------------------
export async function getUsers(): Promise<User[]> {
  const rows = await requireDb().select().from(users).orderBy(asc(users.displayName));
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
  return rows[0];
}

export async function updateUser(
  id: string,
  data: Partial<Omit<InsertUser, "id">>
): Promise<User> {
  const rows = await requireDb()
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (!rows[0]) throw new Error(`User ${id} not found`);
  return rows[0];
}

export async function deleteUser(id: string): Promise<void> {
  const existing = await getUserById(id);
  if (!existing) throw new Error(`User ${id} not found`);
  await requireDb().delete(users).where(eq(users.id, id));
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

export async function getContractById(id: string): Promise<Contract | undefined> {
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
  data: Partial<Omit<InsertContract, "id">>
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
  const rows = await requireDb().select().from(tasks).orderBy(asc(tasks.createdAt));
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
  data: Omit<InsertTask, "id"> & { id?: string }
): Promise<Task> {
  const id = data.id ?? `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const rows = await requireDb()
    .insert(tasks)
    .values({ ...data, id } as InsertTask)
    .returning();
  if (!rows[0]) throw new Error("Failed to create task");
  return rows[0];
}

export async function updateTaskInDb(
  id: string,
  data: UpdateTaskRequest
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

export async function getDocumentById(id: string): Promise<Document | undefined> {
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
  data: Partial<Omit<InsertDocument, "id">>
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
