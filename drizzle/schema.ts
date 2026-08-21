import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Executable business-process contracts owned by a FlowGuard user. YAML is configuration text, not telemetry bytes. */
export const controlContracts = mysqlTable("controlContracts", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  controlKey: varchar("controlKey", { length: 128 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  domain: varchar("domain", { length: 64 }).notNull(),
  yaml: text("yaml").notNull(),
  version: varchar("version", { length: 64 }).notNull().default("v1"),
  provenance: varchar("provenance", { length: 256 }).notNull().default("User-authored FlowGuard contract"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("controlContracts_owner_updated_idx").on(table.ownerId, table.updatedAt)]);

/** Immutable, normalized outcomes generated from a process contract and trace evidence. */
export const controlExecutions = mysqlTable("controlExecutions", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  contractId: int("contractId"),
  controlKey: varchar("controlKey", { length: 128 }).notNull(),
  process: varchar("process", { length: 128 }).notNull(),
  verdict: mysqlEnum("verdict", ["PASS", "FAIL", "INCONCLUSIVE"]).notNull(),
  traceId: varchar("traceId", { length: 256 }).notNull(),
  evidenceHash: varchar("evidenceHash", { length: 128 }).notNull(),
  provenanceLabel: varchar("provenanceLabel", { length: 128 }).notNull(),
  provenanceSource: varchar("provenanceSource", { length: 512 }).notNull(),
  finding: json("finding"),
  assertions: json("assertions").notNull(),
  executedAt: timestamp("executedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("controlExecutions_owner_created_idx").on(table.ownerId, table.createdAt), index("controlExecutions_trace_idx").on(table.traceId)]);

/** The GRC-facing exception lifecycle created from failed or inconclusive technical control executions. */
export const grcExceptions = mysqlTable("grcExceptions", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  executionId: int("executionId").notNull(),
  externalGrcReference: varchar("externalGrcReference", { length: 256 }),
  controlKey: varchar("controlKey", { length: 128 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  status: mysqlEnum("status", ["OPEN", "IN_REMEDIATION", "CLOSED"]).notNull().default("OPEN"),
  severity: mysqlEnum("severity", ["HIGH", "MEDIUM", "LOW"]).notNull().default("MEDIUM"),
  ownerLabel: varchar("ownerLabel", { length: 256 }).notNull(),
  dueAt: timestamp("dueAt"),
  remediation: text("remediation").notNull(),
  retestStatus: mysqlEnum("retestStatus", ["PENDING", "PASSED", "FAILED"]).notNull().default("PENDING"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("grcExceptions_owner_status_idx").on(table.ownerId, table.status), index("grcExceptions_execution_idx").on(table.executionId)]);

export type ControlContract = typeof controlContracts.$inferSelect;
export type InsertControlContract = typeof controlContracts.$inferInsert;
export type ControlExecution = typeof controlExecutions.$inferSelect;
export type InsertControlExecution = typeof controlExecutions.$inferInsert;
export type GrcException = typeof grcExceptions.$inferSelect;
export type InsertGrcException = typeof grcExceptions.$inferInsert;
