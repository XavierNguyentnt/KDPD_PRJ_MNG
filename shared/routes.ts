import { z } from "zod";
import {
  insertTaskSchema,
  insertUserSchema,
  insertContractSchema,
  insertDocumentSchema,
  tasks,
  users,
  contracts,
  documents,
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
        200: z.array(z.custom<typeof tasks.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/tasks/:id",
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
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
