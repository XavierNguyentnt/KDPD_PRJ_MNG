import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";

const resolveEnvPath = (): string | undefined => {
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
  const entryDir = entry ? path.dirname(entry) : process.cwd();
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(entryDir, ".env"),
    path.resolve(entryDir, "..", ".env"),
    path.resolve(entryDir, "..", "..", ".env"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
};

const envPath = resolveEnvPath();
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

async function main() {
  const app = express();
  const httpServer = createServer(app);

  const { securityHeaders, csrfOriginCheck } = await import("./middleware");
  const { initSession } = await import("./auth");
  const { registerRoutes } = await import("./routes");
  const { startNotificationsJob } = await import("./notifications-job");
  const { ensureDbExtensions } = await import("./db");

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: true }));

  const trustProxy = parseInt(process.env.TRUST_PROXY || "0", 10);
  if (trustProxy > 0) {
    app.set("trust proxy", trustProxy);
  }

  app.use(securityHeaders);

  if (process.env.CSRF_CHECK === "true" && process.env.CSRF_ORIGIN) {
    const raw = String(process.env.CSRF_ORIGIN ?? "");
    const normalize = (value: string) => {
      let s = String(value ?? "").trim();
      while (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'")) ||
        (s.startsWith("`") && s.endsWith("`"))
      ) {
        s = s.slice(1, -1).trim();
      }
      if (s.endsWith("/")) s = s.slice(0, -1);
      return s;
    };
    const allowedOrigins = raw
      .split(/[,\s]+/g)
      .map((s) => normalize(s))
      .filter(Boolean);
    app.use(csrfOriginCheck(allowedOrigins));
  }

  await ensureDbExtensions();
  initSession(app);

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    function redactSensitive(obj: any): any {
      const SENSITIVE_KEYS = new Set([
        "password",
        "newPassword",
        "passwordHash",
        "token",
        "accessToken",
        "refreshToken",
        "session",
        "sid",
      ]);
      if (obj == null) return obj;
      if (Array.isArray(obj)) return obj.map(redactSensitive);
      if (typeof obj === "object") {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj)) {
          out[k] = SENSITIVE_KEYS.has(k) ? "[redacted]" : redactSensitive(v);
        }
        return out;
      }
      return obj;
    }

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse && process.env.LOG_RESPONSE_BODY === "true") {
          try {
            const sanitized = redactSensitive(capturedJsonResponse);
            const text = JSON.stringify(sanitized);
            logLine += ` :: ${text.slice(0, 1000)}`;
          } catch {}
        }

        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(httpServer, app);
  startNotificationsJob();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const isWindows = process.platform === "win32";

  httpServer.listen(
    {
      port,
      host: isWindows ? "localhost" : "0.0.0.0",
      ...(isWindows ? {} : { reusePort: true }),
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
