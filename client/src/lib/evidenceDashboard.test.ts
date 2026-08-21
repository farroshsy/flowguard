import { describe, expect, it } from "vitest";
import { buildEvidenceCsv, buildEvidenceDashboard, type ExceptionRecord, type ExecutionRecord } from "./evidenceDashboard";

const executions: ExecutionRecord[] = [
  { id: 1, controlKey: "CTRL-PAY-001", process: "payment", verdict: "PASS", traceId: "trace-a", evidenceHash: "hash-a", provenanceLabel: "Fixture", provenanceSource: "test", finding: null, assertions: [], executedAt: "2026-08-20T09:00:00Z", createdAt: "2026-08-20T09:00:00Z" },
  { id: 2, controlKey: "CTRL-PAY-001", process: "payment", verdict: "FAIL", traceId: "trace-b", evidenceHash: "hash-b", provenanceLabel: "Fixture", provenanceSource: "test", finding: { detail: "declined" }, assertions: [], executedAt: "2026-08-20T11:00:00Z", createdAt: "2026-08-20T11:00:00Z" },
  { id: 3, controlKey: "CTRL-REC-001", process: "reconciliation", verdict: "PASS", traceId: "trace-c", evidenceHash: "hash-c", provenanceLabel: "Fixture", provenanceSource: "test", finding: null, assertions: [], executedAt: "2026-08-21T08:00:00Z", createdAt: "2026-08-21T08:00:00Z" },
];

const exceptions: ExceptionRecord[] = [
  { id: 9, executionId: 2, controlKey: "CTRL-PAY-001", title: "Payment failure", status: "OPEN", severity: "HIGH", ownerLabel: "Platform Engineering", dueAt: null, remediation: "Investigate, attach retest", retestStatus: "PENDING", externalGrcReference: null, createdAt: "2026-08-20T11:30:00Z", updatedAt: "2026-08-20T11:30:00Z" },
];

describe("FlowGuard evidence dashboard", () => {
  it("groups execution outcomes and linked exception counts by day", () => {
    const summary = buildEvidenceDashboard(executions, exceptions);
    expect(summary).toMatchObject({ totalExecutions: 3, successRate: 67, linkedExceptions: 1, openExceptions: 1 });
    expect(summary.timeline).toEqual([
      expect.objectContaining({ date: "2026-08-20", totalExecutions: 2, pass: 1, fail: 1, successRate: 50, linkedExceptions: 1 }),
      expect.objectContaining({ date: "2026-08-21", totalExecutions: 1, pass: 1, fail: 0, successRate: 100, linkedExceptions: 0 }),
    ]);
  });

  it("creates a single escaped CSV report across evidence and exception history", () => {
    const csv = buildEvidenceCsv(executions, exceptions);
    expect(csv.split("\n")).toHaveLength(5);
    expect(csv).toContain('"execution"');
    expect(csv).toContain('"grc_exception"');
    expect(csv).toContain('"Investigate, attach retest"');
  });
});
