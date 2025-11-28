import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

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

/**
 * Staff table - stores staff information
 */
export const staff = mysqlTable("staff", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  staffName: varchar("staffName", { length: 100 }).notNull(),
  staffCode: varchar("staffCode", { length: 50 }).unique(),
  position: varchar("position", { length: 100 }), // e.g., "店長", "ホール", "キッチン"
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;

/**
 * Shift period - defines the two shift periods per month
 * e.g., Period 1: 1-15, Period 2: 16-end of month
 */
export const shiftPeriods = mysqlTable("shiftPeriods", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  periodNumber: int("periodNumber").notNull(), // 1 or 2
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  submissionDeadline: timestamp("submissionDeadline").notNull(),
  status: mysqlEnum("status", ["open", "closed", "finalized"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftPeriod = typeof shiftPeriods.$inferSelect;
export type InsertShiftPeriod = typeof shiftPeriods.$inferInsert;

/**
 * Shift request - stores staff's shift preferences for each day
 * requestType: off (休み), morning (モーニング 8:00-14:00), early (早番 10:00-16:00), late (遅番 16:00-23:00), all (ALL 8:00-23:00)
 */
export const shiftRequests = mysqlTable("shiftRequests", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  periodId: int("periodId").notNull(),
  requestDate: timestamp("requestDate").notNull(),
  requestType: mysqlEnum("requestType", ["off", "morning", "early", "late", "all"]).notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftRequest = typeof shiftRequests.$inferSelect;
export type InsertShiftRequest = typeof shiftRequests.$inferInsert;

/**
 * Final shift - stores the finalized shift schedule
 */
export const finalShifts = mysqlTable("finalShifts", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  periodId: int("periodId").notNull(),
  shiftDate: timestamp("shiftDate").notNull(),
  shiftType: mysqlEnum("shiftType", ["morning", "early", "late", "all"]).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:mm format
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:mm format
  status: mysqlEnum("status", ["scheduled", "confirmed", "cancelled"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinalShift = typeof finalShifts.$inferSelect;
export type InsertFinalShift = typeof finalShifts.$inferInsert;
