import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import type { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import memorystore from "memorystore";
import { pool } from "./db";
import * as dbStorage from "./db-storage";
import type { UserWithRolesAndGroups } from "@shared/schema";

const SESSION_SECRET = process.env.SESSION_SECRET || "kdpd-session-secret-change-in-production";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_SECURE =
  (process.env.SESSION_SECURE ??
    (process.env.NODE_ENV === "production" ? "true" : "false")) === "true";

// -----------------------------------------------------------------------------
// Passport: Local strategy (email + password)
// -----------------------------------------------------------------------------
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: false,
    },
    async (email, password, done) => {
      try {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await dbStorage.getUserByEmail(email);
        const userWithRg = user ? await dbStorage.getUserByIdWithRolesAndGroups(user.id) : undefined;
        if (!user) {
          if (process.env.NODE_ENV === "development") {
            console.log("[auth] Login failed: no user for email", normalizedEmail, "- run KDPD_DB_seed_admin.sql on Neon?");
          }
          return done(null, false, { message: "Invalid email or password" });
        }
        if (!user.isActive) {
          return done(null, false, { message: "Account is disabled" });
        }
        const hash = user.passwordHash;
        if (!hash) {
          if (process.env.NODE_ENV === "development") {
            console.log("[auth] Login failed: user has no password set:", normalizedEmail);
          }
          return done(null, false, { message: "Account has no password set" });
        }
        const ok = await bcrypt.compare(password, hash);
        if (!ok) {
          if (process.env.NODE_ENV === "development") {
            console.log("[auth] Login failed: wrong password for", normalizedEmail, "- admin: Admin01092016@, seed users: 123456");
          }
          return done(null, false, { message: "Invalid email or password" });
        }
        return done(null, userWithRg ?? user);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("Database not configured")) {
          return done(null, false, { message: "Database not configured" });
        }
        return done(err);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await dbStorage.getUserByIdWithRolesAndGroups(id);
    done(null, user ?? null);
  } catch (err) {
    done(err);
  }
});

// -----------------------------------------------------------------------------
// Session store: Postgres if DATABASE_URL, else MemoryStore
// -----------------------------------------------------------------------------
function getSessionStore(): session.Store {
  if (pool) {
    const PgSession = connectPgSimple(session);
    return new PgSession({
      pool,
      createTableIfMissing: true,
      tableName: "session",
    });
  }
  const MemoryStore = memorystore(session);
  return new MemoryStore({ checkPeriod: 86400000 });
}

export function initSession(app: Express): void {
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: getSessionStore(),
      cookie: {
        secure: SESSION_SECURE,
        httpOnly: true,
        maxAge: SESSION_MAX_AGE_MS,
        sameSite: "lax",
      },
      name: "kdpd.sid",
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
}

export { passport };
