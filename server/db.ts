import { eq, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, staff, shiftPeriods, shiftRequests, finalShifts } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Staff queries
export async function getOrCreateStaffByUserId(userId: number, staffName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(staff).where(eq(staff.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  await db.insert(staff).values({
    userId,
    staffName,
    isActive: true,
  });

  const result = await db.select().from(staff).where(eq(staff.userId, userId)).limit(1);
  return result[0];
}

export async function getStaffByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(staff).where(eq(staff.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Shift period queries
export async function getCurrentShiftPeriod() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const result = await db
    .select()
    .from(shiftPeriods)
    .where(and(
      lte(shiftPeriods.startDate, now),
      gte(shiftPeriods.endDate, now),
      eq(shiftPeriods.status, "open")
    ))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getShiftPeriodById(periodId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(shiftPeriods).where(eq(shiftPeriods.id, periodId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getShiftPeriodsByYearMonth(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(shiftPeriods)
    .where(and(
      eq(shiftPeriods.year, year),
      eq(shiftPeriods.month, month)
    ));
}

// Shift request queries
export async function getShiftRequestsByStaffAndPeriod(staffId: number, periodId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(shiftRequests)
    .where(and(
      eq(shiftRequests.staffId, staffId),
      eq(shiftRequests.periodId, periodId)
    ));
}

export async function getShiftRequestsByPeriod(periodId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(shiftRequests)
    .where(eq(shiftRequests.periodId, periodId));
}

// Final shift queries
export async function getFinalShiftsByStaffAndPeriod(staffId: number, periodId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(finalShifts)
    .where(and(
      eq(finalShifts.staffId, staffId),
      eq(finalShifts.periodId, periodId)
    ));
}

export async function getFinalShiftsByPeriod(periodId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(finalShifts)
    .where(eq(finalShifts.periodId, periodId));
}
