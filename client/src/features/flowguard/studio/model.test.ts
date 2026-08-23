import { describe, expect, it } from "vitest";
import { createDraftException, defaultExceptionDueDate, toDatabaseSeverity, toDatabaseStatus } from "./model";
import type { ControlExecution } from "@/lib/flowguard";

const failedExecution = {
  verdict: "FAIL",
  traceId: "demo-trace-1234",
  firstFinding: { service: "paymentservice", operation: "Charge", label: "Payment charge failed", detail: "declined" },
} as unknown as ControlExecution;

describe("Trace studio model", () => {
  it("maps UI exception fields to the persisted vocabulary", () => {
    expect(toDatabaseSeverity("High")).toBe("HIGH");
    expect(toDatabaseStatus("In remediation")).toBe("IN_REMEDIATION");
  });

  it("creates a seven-day, evidence-linked draft exception for failed execution", () => {
    const draft = createDraftException(failedExecution, new Date("2026-08-20T12:00:00Z"));
    expect(defaultExceptionDueDate(new Date("2026-08-20T12:00:00Z"))).toBe("2026-08-27");
    expect(draft).toMatchObject({ displayId: "EXC-DEMO-TRA", severity: "High", dueDate: "2026-08-27", owner: "Platform Engineering" });
    expect(draft?.remediation).toContain("paymentservice/Charge");
  });

  it("does not create a remediation case for passing evidence", () => {
    expect(createDraftException({ ...failedExecution, verdict: "PASS" } as ControlExecution)).toBeNull();
  });
});
