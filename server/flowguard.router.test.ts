import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return { user: null, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("FlowGuard tRPC boundaries", () => {
  it("exposes only backend configuration availability publicly", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.flowguard.configuredBackends()).resolves.toMatchObject({ jaeger: expect.any(Boolean), tempo: expect.any(Boolean) });
  });

  it("requires an authenticated user before reading persisted contracts", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.flowguard.listContracts()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires an authenticated user before reading execution analytics", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.flowguard.listExecutions()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires an authenticated user before persisting a normalized control execution", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.flowguard.saveExecution({
      controlKey: "CTRL-PAY-001",
      process: "payment-completion",
      verdict: "FAIL",
      traceId: "trace-regression-001",
      evidenceHash: "evidence-regression-001",
      provenanceLabel: "Portfolio fixture",
      provenanceSource: "Simulated payment failure",
      finding: null,
      assertions: [],
      executedAt: new Date("2026-08-20T12:00:00Z"),
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
