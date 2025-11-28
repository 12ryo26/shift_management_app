import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getOrCreateStaffByUserId,
  getStaffByUserId,
  getCurrentShiftPeriod,
  getShiftPeriodById,
  getShiftRequestsByStaffAndPeriod,
  getShiftRequestsByPeriod,
  getFinalShiftsByStaffAndPeriod,
  getFinalShiftsByPeriod,
  getDb,
} from "./db";
import { shiftRequests, finalShifts, shiftPeriods } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Shift management routers
  staff: router({
    getOrCreate: protectedProcedure
      .input(z.object({ staffName: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return getOrCreateStaffByUserId(ctx.user.id, input.staffName);
      }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return getStaffByUserId(ctx.user.id);
    }),
  }),

  shiftPeriod: router({
    ensureCurrentMonth: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      const { ensureCurrentMonthPeriods } = await import("./shiftPeriodManager");
      return ensureCurrentMonthPeriods();
    }),

    getCurrent: publicProcedure.query(async () => {
      return getCurrentShiftPeriod();
    }),

    getById: publicProcedure
      .input(z.object({ periodId: z.number() }))
      .query(async ({ input }) => {
        return getShiftPeriodById(input.periodId);
      }),

    getByYearMonth: publicProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => {
        const { getShiftPeriodsByYearMonth } = await import("./db");
        return getShiftPeriodsByYearMonth(input.year, input.month);
      }),

    generateForMonth: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        const { generateShiftPeriodsForMonth } = await import("./shiftPeriodManager");
        return generateShiftPeriodsForMonth(input.year, input.month);
      }),
  }),

  shiftRequest: router({
    submit: protectedProcedure
      .input(z.object({
        periodId: z.number(),
        requests: z.array(z.object({
          requestDate: z.date(),
          requestType: z.enum(["off", "morning", "early", "late", "all"]),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const staffRecord = await getStaffByUserId(ctx.user.id);
        if (!staffRecord) throw new Error("Staff record not found");

        // Delete existing requests for this period
        await db
          .delete(shiftRequests)
          .where(and(
            eq(shiftRequests.staffId, staffRecord.id),
            eq(shiftRequests.periodId, input.periodId)
          ));

        // Insert new requests
        const insertData = input.requests.map(req => ({
          staffId: staffRecord.id,
          periodId: input.periodId,
          requestDate: req.requestDate,
          requestType: req.requestType,
          notes: req.notes || null,
        }));

        await db.insert(shiftRequests).values(insertData);

        return { success: true };
      }),

    getByPeriod: protectedProcedure
      .input(z.object({ periodId: z.number() }))
      .query(async ({ input, ctx }) => {
        const staffRecord = await getStaffByUserId(ctx.user.id);
        if (!staffRecord) return [];
        return getShiftRequestsByStaffAndPeriod(staffRecord.id, input.periodId);
      }),

    getAllByPeriod: protectedProcedure
      .input(z.object({ periodId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Only admins can view all requests
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        return getShiftRequestsByPeriod(input.periodId);
      }),
  }),

  finalShift: router({
    getByPeriod: protectedProcedure
      .input(z.object({ periodId: z.number() }))
      .query(async ({ input, ctx }) => {
        const staffRecord = await getStaffByUserId(ctx.user.id);
        if (!staffRecord) return [];
        return getFinalShiftsByStaffAndPeriod(staffRecord.id, input.periodId);
      }),

    getAllByPeriod: protectedProcedure
      .input(z.object({ periodId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Only admins can view all shifts
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        return getFinalShiftsByPeriod(input.periodId);
      }),

    autoCreate: protectedProcedure
      .input(z.object({ periodId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can create shifts
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        const { createShiftsForPeriod } = await import("./shiftCreationLogic");
        return createShiftsForPeriod(input.periodId);
      }),

    create: protectedProcedure
      .input(z.object({
        periodId: z.number(),
        shifts: z.array(z.object({
          staffId: z.number(),
          shiftDate: z.date(),
          shiftType: z.enum(["morning", "early", "late", "all"]),
          startTime: z.string(),
          endTime: z.string(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can create shifts
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Delete existing final shifts for this period
        await db.delete(finalShifts).where(eq(finalShifts.periodId, input.periodId));

        // Insert new shifts
        const insertData = input.shifts.map(shift => ({
          staffId: shift.staffId,
          periodId: input.periodId,
          shiftDate: shift.shiftDate,
          shiftType: shift.shiftType,
          startTime: shift.startTime,
          endTime: shift.endTime,
          status: "scheduled" as const,
        }));

        await db.insert(finalShifts).values(insertData);

        // Update period status to finalized
        await db
          .update(shiftPeriods)
          .set({ status: "finalized" })
          .where(eq(shiftPeriods.id, input.periodId));

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
