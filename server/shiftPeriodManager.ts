import { getDb } from "./db";
import { shiftPeriods } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

/**
 * Generate shift periods for a given month
 * Period 1: 1-15, Period 2: 16-end of month
 * Submission deadline is 2 weeks before the start date
 */
export async function generateShiftPeriodsForMonth(year: number, month: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if periods already exist
  const existing = await db
    .select()
    .from(shiftPeriods)
    .where(and(
      eq(shiftPeriods.year, year),
      eq(shiftPeriods.month, month)
    ));

  if (existing.length > 0) {
    return existing;
  }

  // Period 1: 1-15
  const period1Start = new Date(year, month - 1, 1);
  const period1End = new Date(year, month - 1, 15);
  const period1Deadline = new Date(period1Start);
  period1Deadline.setDate(period1Deadline.getDate() - 14);

  await db.insert(shiftPeriods).values({
    year,
    month,
    periodNumber: 1,
    startDate: period1Start,
    endDate: period1End,
    submissionDeadline: period1Deadline,
    status: "open",
  });

  // Period 2: 16-end of month
  const period2Start = new Date(year, month - 1, 16);
  const lastDay = new Date(year, month, 0).getDate();
  const period2End = new Date(year, month - 1, lastDay);
  const period2Deadline = new Date(period2Start);
  period2Deadline.setDate(period2Deadline.getDate() - 14);

  await db.insert(shiftPeriods).values({
    year,
    month,
    periodNumber: 2,
    startDate: period2Start,
    endDate: period2End,
    submissionDeadline: period2Deadline,
    status: "open",
  });

  return [
    {
      year,
      month,
      periodNumber: 1,
      startDate: period1Start,
      endDate: period1End,
      submissionDeadline: period1Deadline,
      status: "open",
    },
    {
      year,
      month,
      periodNumber: 2,
      startDate: period2Start,
      endDate: period2End,
      submissionDeadline: period2Deadline,
      status: "open",
    },
  ];
}

/**
 * Get or create shift periods for the current month
 */
export async function ensureCurrentMonthPeriods() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return generateShiftPeriodsForMonth(year, month);
}
