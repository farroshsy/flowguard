import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createControlContract, createControlExecution, createGrcException, listControlContracts, listControlExecutions, listGrcExceptions, updateGrcException } from "./db";
import { buildTraceQueryUrl, getTraceBackendConfig } from "./traceProxy";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const contractInput = z.object({ controlKey: z.string().min(3).max(128), title: z.string().min(3).max(256), domain: z.string().min(2).max(64), yaml: z.string().min(20).max(32_000), version: z.string().min(1).max(64).default("v1") });
const executionInput = z.object({ contractId: z.number().int().positive().optional(), controlKey: z.string().min(3).max(128), process: z.string().min(1).max(128), verdict: z.enum(["PASS", "FAIL", "INCONCLUSIVE"]), traceId: z.string().min(4).max(256), evidenceHash: z.string().min(8).max(128), provenanceLabel: z.string().min(3).max(128), provenanceSource: z.string().min(3).max(512), finding: z.unknown().nullable(), assertions: z.unknown(), executedAt: z.coerce.date() });

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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
  flowguard: router({
    listContracts: protectedProcedure.query(({ ctx }) => listControlContracts(ctx.user.id)),
    listExecutions: protectedProcedure.query(({ ctx }) => listControlExecutions(ctx.user.id)),
    saveContract: protectedProcedure.input(contractInput).mutation(async ({ ctx, input }) => ({ id: await createControlContract({ ownerId: ctx.user.id, ...input }) })),
    listExceptions: protectedProcedure.query(({ ctx }) => listGrcExceptions(ctx.user.id)),
    saveExecution: protectedProcedure.input(executionInput).mutation(async ({ ctx, input }) => ({ id: await createControlExecution({ ...input, ownerId: ctx.user.id, finding: input.finding as object | null, assertions: input.assertions as object }) })),
    createException: protectedProcedure.input(z.object({ executionId: z.number().int().positive(), controlKey: z.string().min(3).max(128), title: z.string().min(3).max(256), severity: z.enum(["HIGH", "MEDIUM", "LOW"]), ownerLabel: z.string().min(3).max(256), dueAt: z.coerce.date().nullable(), remediation: z.string().min(3).max(20_000) })).mutation(async ({ ctx, input }) => ({ id: await createGrcException({ ...input, ownerId: ctx.user.id, dueAt: input.dueAt ?? undefined, remediation: input.remediation, status: "OPEN", retestStatus: "PENDING" }) })),
    updateException: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["OPEN", "IN_REMEDIATION", "CLOSED"]).optional(), severity: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(), ownerLabel: z.string().min(3).max(256).optional(), dueAt: z.coerce.date().nullable().optional(), remediation: z.string().min(3).max(20_000).optional(), retestStatus: z.enum(["PENDING", "PASSED", "FAILED"]).optional(), externalGrcReference: z.string().max(256).nullable().optional() })).mutation(({ ctx, input }) => {
      const { id, dueAt, ...values } = input;
      return updateGrcException(ctx.user.id, id, { ...values, dueAt: dueAt ?? undefined });
    }),
    configuredBackends: publicProcedure.query(() => ({ jaeger: Boolean(getTraceBackendConfig("jaeger")), tempo: Boolean(getTraceBackendConfig("tempo")) })),
    fetchLiveTrace: protectedProcedure.input(z.object({ backend: z.enum(["jaeger", "tempo"]), traceId: z.string().min(4).max(256) })).query(async ({ input }) => {
      let target: { url: string; token?: string };
      try { target = buildTraceQueryUrl(input.backend, input.traceId); } catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Trace backend is unavailable." }); }
      const response = await fetch(target.url, { headers: target.token ? { Authorization: `Bearer ${target.token}` } : undefined, signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: `The ${input.backend} trace API returned HTTP ${response.status}.` });
      return { backend: input.backend, traceId: input.traceId, payload: await response.json() };
    }),
  }),
});

export type AppRouter = typeof appRouter;
