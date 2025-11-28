import { integer, pgEnum, pgTable, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */

// PostgreSQL Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["open", "closed", "finalized"]);
export const requestTypeEnum = pgEnum("requestType", ["off", "morning", "early", "late", "all"]);
export const shiftTypeEnum = pgEnum("shiftType", ["morning", "early", "late", "all"]);
export const finalStatusEnum = pgEnum("finalStatus", ["scheduled", "confirmed", "cancelled"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Staff table - stores staff information
 */
export const staff = pgTable("staff", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  staffName: varchar("staffName", { length: 100 }).notNull(),
  staffCode: varchar("staffCode", { length: 50 }).unique(),
  position: varchar("position", { length: 100 }), // e.g., "店長", "ホール", "キッチン"
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;

/**
 * Shift period - defines the two shift periods per month
 * e.g., Period 1: 1-15, Period 2: 16-end of month
 */
export const shiftPeriods = pgTable("shiftPeriods", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  periodNumber: integer("periodNumber").notNull(), // 1 or 2
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  submissionDeadline: timestamp("submissionDeadline").notNull(),
  status: statusEnum("status").default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ShiftPeriod = typeof shiftPeriods.$inferSelect;
export type InsertShiftPeriod = typeof shiftPeriods.$inferInsert;

/**
 * Shift request - stores staff's shift preferences for each day
 * requestType: off (休み), morning (モーニング 7:30-15:00), early (早番 10:00-16:00), late (遅番 17:00-23:00), all (ALL 7:30-23:00)
 */
export const shiftRequests = pgTable("shiftRequests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  staffId: integer("staffId").notNull(),
  periodId: integer("periodId").notNull(),
  requestDate: timestamp("requestDate").notNull(),
  requestType: requestTypeEnum("requestType").notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ShiftRequest = typeof shiftRequests.$inferSelect;
export type InsertShiftRequest = typeof shiftRequests.$inferInsert;

/**
 * Final shift - stores the finalized shift schedule
 */
export const finalShifts = pgTable("finalShifts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  staffId: integer("staffId").notNull(),
  periodId: integer("periodId").notNull(),
  shiftDate: timestamp("shiftDate").notNull(),
  shiftType: shiftTypeEnum("shiftType").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:mm format
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:mm format
  status: finalStatusEnum("status").default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FinalShift = typeof finalShifts.$inferSelect;
export type InsertFinalShift = typeof finalShifts.$inferInsert;
