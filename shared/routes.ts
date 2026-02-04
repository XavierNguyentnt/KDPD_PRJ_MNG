import { z } from "zod";
import {
  insertTaskSchema,
  insertUserSchema,
  insertContractSchema,
  insertDocumentSchema,
  insertTaskAssignmentSchema,
  insertContractMemberSchema,
  insertTranslationContractMemberSchema,
  insertProofreadingContractMemberSchema,
  insertDocumentTaskSchema,
  insertDocumentContractSchema,
  insertGroupSchema,
  insertUserGroupSchema,
  insertRoleSchema,
  insertUserRoleSchema,
  insertWorkSchema,
  insertTranslationContractSchema,
  insertProofreadingContractSchema,
  insertComponentSchema,
  insertContractStageSchema,
  tasks,
  users,
  contracts,
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
  works,
  translationContracts,
  proofreadingContracts,
  components,
  contractStages,
  notifications,
  type TaskWithAssignmentDetails,
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/auth/login",
      input: loginInputSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.internal,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout",
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.notFound,
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/auth/me",
      responses: {
        200: z.custom<typeof users.$inferSelect>().nullable(),
        401: errorSchemas.notFound,
      },
    },
  },

  tasks: {
    list: {
      method: "GET" as const,
      path: "/api/tasks",
      responses: {
        200: z.array(z.custom<TaskWithAssignmentDetails>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/tasks/:id",
      responses: {
        200: z.custom<TaskWithAssignmentDetails>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/tasks",
      input: insertTaskSchema.omit({ id: true }),
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/tasks/:id",
      input: insertTaskSchema.partial(),
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/tasks/:id",
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    refresh: {
      method: "POST" as const,
      path: "/api/tasks/refresh",
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },

  notifications: {
    list: {
      method: "GET" as const,
      path: "/api/notifications",
      responses: {
        200: z.array(z.custom<typeof notifications.$inferSelect>()),
      },
    },
    unreadCount: {
      method: "GET" as const,
      path: "/api/notifications/unread-count",
      responses: {
        200: z.object({ count: z.number() }),
      },
    },
    markRead: {
      method: "PATCH" as const,
      path: "/api/notifications/:id/read",
      responses: {
        200: z.custom<typeof notifications.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  users: {
    list: {
      method: "GET" as const,
      path: "/api/users",
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/users/:id",
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/users",
      input: insertUserSchema.omit({ id: true }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/users/:id",
      input: insertUserSchema.partial().omit({ id: true }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/users/:id",
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },

  contracts: {
    list: {
      method: "GET" as const,
      path: "/api/contracts",
      responses: {
        200: z.array(z.custom<typeof contracts.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/contracts/:id",
      responses: {
        200: z.custom<typeof contracts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/contracts",
      input: insertContractSchema.omit({ id: true }),
      responses: {
        200: z.custom<typeof contracts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/contracts/:id",
      input: insertContractSchema.partial().omit({ id: true }),
      responses: {
        200: z.custom<typeof contracts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/contracts/:id",
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },

  documents: {
    list: {
      method: "GET" as const,
      path: "/api/documents",
      responses: {
        200: z.array(z.custom<typeof documents.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/documents/:id",
      responses: {
        200: z.custom<typeof documents.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/documents",
      input: insertDocumentSchema.omit({ id: true }),
      responses: {
        200: z.custom<typeof documents.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/documents/:id",
      input: insertDocumentSchema.partial().omit({ id: true }),
      responses: {
        200: z.custom<typeof documents.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/documents/:id",
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },

  taskAssignments: {
    list: { method: "GET" as const, path: "/api/task-assignments", responses: { 200: z.array(z.custom<typeof taskAssignments.$inferSelect>()) } },
    listByTask: { method: "GET" as const, path: "/api/tasks/:taskId/assignments", responses: { 200: z.array(z.custom<typeof taskAssignments.$inferSelect>()) } },
    listByUser: { method: "GET" as const, path: "/api/users/:userId/assignments", responses: { 200: z.array(z.custom<typeof taskAssignments.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/task-assignments/:id", responses: { 200: z.custom<typeof taskAssignments.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/task-assignments", input: insertTaskAssignmentSchema.omit({ id: true }), responses: { 200: z.custom<typeof taskAssignments.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/task-assignments/:id", input: insertTaskAssignmentSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof taskAssignments.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/task-assignments/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },

  contractMembers: {
    list: { method: "GET" as const, path: "/api/contract-members", responses: { 200: z.array(z.custom<typeof contractMembers.$inferSelect>()) } },
    listByContract: { method: "GET" as const, path: "/api/contracts/:contractId/members", responses: { 200: z.array(z.custom<typeof contractMembers.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/contract-members/:id", responses: { 200: z.custom<typeof contractMembers.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/contract-members", input: insertContractMemberSchema.omit({ id: true }), responses: { 200: z.custom<typeof contractMembers.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/contract-members/:id", input: insertContractMemberSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof contractMembers.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/contract-members/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },

  translationContractMembers: {
    list: { method: "GET" as const, path: "/api/translation-contract-members", responses: { 200: z.array(z.custom<typeof translationContractMembers.$inferSelect>()) } },
    listByContract: { method: "GET" as const, path: "/api/translation-contracts/:contractId/members", responses: { 200: z.array(z.custom<typeof translationContractMembers.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/translation-contract-members/:id", responses: { 200: z.custom<typeof translationContractMembers.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/translation-contract-members", input: insertTranslationContractMemberSchema.omit({ id: true }), responses: { 200: z.custom<typeof translationContractMembers.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/translation-contract-members/:id", input: insertTranslationContractMemberSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof translationContractMembers.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/translation-contract-members/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },

  proofreadingContractMembers: {
    list: { method: "GET" as const, path: "/api/proofreading-contract-members", responses: { 200: z.array(z.custom<typeof proofreadingContractMembers.$inferSelect>()) } },
    listByContract: { method: "GET" as const, path: "/api/proofreading-contracts/:contractId/members", responses: { 200: z.array(z.custom<typeof proofreadingContractMembers.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/proofreading-contract-members/:id", responses: { 200: z.custom<typeof proofreadingContractMembers.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/proofreading-contract-members", input: insertProofreadingContractMemberSchema.omit({ id: true }), responses: { 200: z.custom<typeof proofreadingContractMembers.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/proofreading-contract-members/:id", input: insertProofreadingContractMemberSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof proofreadingContractMembers.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/proofreading-contract-members/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },

  documentTasks: {
    list: { method: "GET" as const, path: "/api/document-tasks", responses: { 200: z.array(z.custom<typeof documentTasks.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/document-tasks/:id", responses: { 200: z.custom<typeof documentTasks.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/document-tasks", input: insertDocumentTaskSchema.omit({ id: true }), responses: { 200: z.custom<typeof documentTasks.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/document-tasks/:id", input: insertDocumentTaskSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof documentTasks.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/document-tasks/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },

  documentContracts: {
    list: { method: "GET" as const, path: "/api/document-contracts", responses: { 200: z.array(z.custom<typeof documentContracts.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/document-contracts/:id", responses: { 200: z.custom<typeof documentContracts.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/document-contracts", input: insertDocumentContractSchema.omit({ id: true }), responses: { 200: z.custom<typeof documentContracts.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/document-contracts/:id", input: insertDocumentContractSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof documentContracts.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/document-contracts/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },

  groups: {
    list: { method: "GET" as const, path: "/api/groups/list", responses: { 200: z.array(z.custom<typeof groups.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/groups/list/:id", responses: { 200: z.custom<typeof groups.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/groups/list", input: insertGroupSchema.omit({ id: true }), responses: { 200: z.custom<typeof groups.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/groups/list/:id", input: insertGroupSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof groups.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/groups/list/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },

  userGroups: {
    list: { method: "GET" as const, path: "/api/user-groups", responses: { 200: z.array(z.custom<typeof userGroups.$inferSelect>()) } },
    listByUser: { method: "GET" as const, path: "/api/users/:userId/groups", responses: { 200: z.array(z.custom<typeof userGroups.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/user-groups/:id", responses: { 200: z.custom<typeof userGroups.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/user-groups", input: insertUserGroupSchema.omit({ id: true }), responses: { 200: z.custom<typeof userGroups.$inferSelect>(), 400: errorSchemas.validation } },
    delete: { method: "DELETE" as const, path: "/api/user-groups/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },

  roles: {
    list: { method: "GET" as const, path: "/api/roles/list", responses: { 200: z.array(z.custom<typeof roles.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/roles/list/:id", responses: { 200: z.custom<typeof roles.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/roles/list", input: insertRoleSchema.omit({ id: true }), responses: { 200: z.custom<typeof roles.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/roles/list/:id", input: insertRoleSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof roles.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/roles/list/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },

  userRoles: {
    list: { method: "GET" as const, path: "/api/user-roles", responses: { 200: z.array(z.custom<typeof userRoles.$inferSelect>()) } },
    listByUser: { method: "GET" as const, path: "/api/users/:userId/roles", responses: { 200: z.array(z.custom<typeof userRoles.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/user-roles/:id", responses: { 200: z.custom<typeof userRoles.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/user-roles", input: insertUserRoleSchema.omit({ id: true }), responses: { 200: z.custom<typeof userRoles.$inferSelect>(), 400: errorSchemas.validation } },
    delete: { method: "DELETE" as const, path: "/api/user-roles/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },

  works: {
    list: { method: "GET" as const, path: "/api/works", responses: { 200: z.array(z.custom<typeof works.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/works/:id", responses: { 200: z.custom<typeof works.$inferSelect>(), 404: errorSchemas.notFound } },
    create: {
      method: "POST" as const,
      path: "/api/works",
      input: insertWorkSchema
        .omit({ id: true, createdAt: true })
        .extend({
          estimateFactor: z.union([z.number(), z.string()]).transform((v) => (v === null || v === undefined ? undefined : String(v))).optional().nullable(),
        }),
      responses: { 200: z.custom<typeof works.$inferSelect>(), 400: errorSchemas.validation },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/works/:id",
      input: insertWorkSchema.partial().omit({ id: true }).extend({
        estimateFactor: z.union([z.number(), z.string()]).transform((v) => (v === null || v === undefined ? undefined : String(v))).optional().nullable(),
      }),
      responses: { 200: z.custom<typeof works.$inferSelect>(), 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/works/:id",
      responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound },
    },
    downloadTemplate: {
      method: "GET" as const,
      path: "/api/works/template",
      responses: { 200: z.any() },
    },
    import: {
      method: "POST" as const,
      path: "/api/works/import",
      responses: { 200: z.object({ success: z.number(), errors: z.array(z.string()) }), 400: errorSchemas.validation },
    },
  },

  translationContracts: {
    list: { method: "GET" as const, path: "/api/translation-contracts", responses: { 200: z.array(z.custom<typeof translationContracts.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/translation-contracts/:id", responses: { 200: z.custom<typeof translationContracts.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/translation-contracts", input: insertTranslationContractSchema.omit({ id: true }), responses: { 200: z.custom<typeof translationContracts.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/translation-contracts/:id", input: insertTranslationContractSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof translationContracts.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/translation-contracts/:id", responses: { 200: z.custom<typeof translationContracts.$inferSelect>(), 404: errorSchemas.notFound } },
  },

  proofreadingContracts: {
    list: { method: "GET" as const, path: "/api/proofreading-contracts", responses: { 200: z.array(z.custom<typeof proofreadingContracts.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/proofreading-contracts/:id", responses: { 200: z.custom<typeof proofreadingContracts.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/proofreading-contracts", input: insertProofreadingContractSchema.omit({ id: true }), responses: { 200: z.custom<typeof proofreadingContracts.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/proofreading-contracts/:id", input: insertProofreadingContractSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof proofreadingContracts.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/proofreading-contracts/:id", responses: { 200: z.custom<typeof proofreadingContracts.$inferSelect>(), 404: errorSchemas.notFound } },
  },

  components: {
    list: { method: "GET" as const, path: "/api/components", responses: { 200: z.array(z.custom<typeof components.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/components/:id", responses: { 200: z.custom<typeof components.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/components", input: insertComponentSchema.omit({ id: true }), responses: { 200: z.custom<typeof components.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/components/:id", input: insertComponentSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof components.$inferSelect>(), 404: errorSchemas.notFound } },
  },

  contractStages: {
    listByTranslationContract: { method: "GET" as const, path: "/api/translation-contracts/:contractId/stages", responses: { 200: z.array(z.custom<typeof contractStages.$inferSelect>()) } },
    listByProofreadingContract: { method: "GET" as const, path: "/api/proofreading-contracts/:contractId/stages", responses: { 200: z.array(z.custom<typeof contractStages.$inferSelect>()) } },
    create: { method: "POST" as const, path: "/api/contract-stages", input: insertContractStageSchema.omit({ id: true }), responses: { 200: z.custom<typeof contractStages.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PATCH" as const, path: "/api/contract-stages/:id", input: insertContractStageSchema.partial().omit({ id: true }), responses: { 200: z.custom<typeof contractStages.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/contract-stages/:id", responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
