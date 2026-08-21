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
});
