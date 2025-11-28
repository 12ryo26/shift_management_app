import { getDb } from "./db";
import { shiftRequests, finalShifts, shiftPeriods, staff } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Shift time definitions
 */
const SHIFT_TIMES = {
  morning: { start: "07:30", end: "15:00" },
  early: { start: "10:00", end: "16:00" },
  late: { start: "17:00", end: "23:00" },
  all: { start: "07:30", end: "23:00" },
};

/**
 * Shift creation algorithm:
 * 1. Priority: Respect "off" (休み) requests first
 * 2. Then distribute remaining shifts to balance workload
 * 3. Consider staff availability for each shift type
 */
export async function createShiftsForPeriod(periodId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all staff
  const allStaff = await db.select().from(staff).where(eq(staff.isActive, true));
  
  // Get all shift requests for this period
  const requests = await db
    .select()
    .from(shiftRequests)
    .where(eq(shiftRequests.periodId, periodId));

  // Get period dates
  const periodResult = await db
    .select()
    .from(shiftPeriods)
    .where(eq(shiftPeriods.id, periodId));

  if (periodResult.length === 0) {
    throw new Error("Period not found");
  }

  const period = periodResult[0];
  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);

  // Generate date range
  const dateRange: Date[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dateRange.push(new Date(d));
  }

  // Create shift assignments
  const shifts: Array<{
    staffId: number;
    shiftDate: Date;
    shiftType: "morning" | "early" | "late" | "all";
    startTime: string;
    endTime: string;
  }> = [];

  // Group requests by staff and date
  const requestMap = new Map<number, Map<string, string>>();
  requests.forEach(req => {
    if (!requestMap.has(req.staffId)) {
      requestMap.set(req.staffId, new Map());
    }
    const dateStr = new Date(req.requestDate).toISOString().split('T')[0];
    requestMap.get(req.staffId)!.set(dateStr, req.requestType);
  });

  // For each date, assign shifts
  dateRange.forEach(date => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Count shifts needed per type (simplified: assume 2 morning, 2 early, 2 late, 1 all per day)
    const shiftsNeeded = {
      morning: 2,
      early: 2,
      late: 2,
      all: 1,
    };

    // First pass: Assign "off" requests
    const offStaff = new Set<number>();
    allStaff.forEach(s => {
      const staffRequests = requestMap.get(s.id);
      if (staffRequests?.get(dateStr) === "off") {
        offStaff.add(s.id);
      }
    });

    // Second pass: Assign shifts to remaining staff
    const availableStaff = allStaff.filter(s => !offStaff.has(s.id));

    // Distribute shifts based on requests
    Object.entries(shiftsNeeded).forEach(([shiftType, count]) => {
      let assigned = 0;

      // First, assign staff who requested this shift type
      availableStaff.forEach(s => {
        if (assigned >= count) return;

        const staffRequests = requestMap.get(s.id);
        const requestType = staffRequests?.get(dateStr);

        if (requestType === shiftType || requestType === "all") {
          shifts.push({
            staffId: s.id,
            shiftDate: date,
            shiftType: shiftType as "morning" | "early" | "late" | "all",
            startTime: SHIFT_TIMES[shiftType as keyof typeof SHIFT_TIMES].start,
            endTime: SHIFT_TIMES[shiftType as keyof typeof SHIFT_TIMES].end,
          });
          assigned++;
        }
      });

      // If not enough assigned, fill with flexible staff
      if (assigned < count) {
        availableStaff.forEach(s => {
          if (assigned >= count) return;

          const staffRequests = requestMap.get(s.id);
          const requestType = staffRequests?.get(dateStr);

          // Check if already assigned to another shift today
          const alreadyAssigned = shifts.some(
            sh => sh.staffId === s.id && sh.shiftDate.toISOString().split('T')[0] === dateStr
          );

          if (!alreadyAssigned && (!requestType || requestType === "all")) {
            shifts.push({
              staffId: s.id,
              shiftDate: date,
              shiftType: shiftType as "morning" | "early" | "late" | "all",
              startTime: SHIFT_TIMES[shiftType as keyof typeof SHIFT_TIMES].start,
              endTime: SHIFT_TIMES[shiftType as keyof typeof SHIFT_TIMES].end,
            });
            assigned++;
          }
        });
      }
    });
  });

  // Save shifts to database
  if (shifts.length > 0) {
    await db.insert(finalShifts).values(
      shifts.map(s => ({
        ...s,
        periodId,
        status: "scheduled" as const,
      }))
    );
  }

  return shifts;
}
