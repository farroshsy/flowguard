import { describe, expect, it } from "vitest";
import { buildEvidenceCsv, buildEvidenceDashboard, buildRemediationAging, emptyEvidenceFilters, filterEvidence, getComplianceEvidenceMapping, getExceptionsForRemediationBucket, type ExceptionRecord, type ExecutionRecord } from "./evidenceDashboard";

const executions: ExecutionRecord[] = [
  { id: 1, controlKey: "CTRL-PAY-001", process: "payment", verdict: "PASS", traceId: "trace-a", evidenceHash: "hash-a", provenanceLabel: "Fixture", provenanceSource: "test", finding: null, assertions: [], executedAt: "2026-08-20T09:00:00Z", createdAt: "2026-08-20T09:00:00Z" },
  { id: 2, controlKey: "CTRL-PAY-001", process: "payment", verdict: "FAIL", traceId: "trace-b", evidenceHash: "hash-b", provenanceLabel: "Fixture", provenanceSource: "test", finding: { detail: "declined" }, assertions: [], executedAt: "2026-08-20T11:00:00Z", createdAt: "2026-08-20T11:00:00Z" },
  { id: 3, controlKey: "CTRL-REC-001", process: "reconciliation", verdict: "PASS", traceId: "trace-c", evidenceHash: "hash-c", provenanceLabel: "Fixture", provenanceSource: "test", finding: null, assertions: [], executedAt: "2026-08-21T08:00:00Z", createdAt: "2026-08-21T08:00:00Z" },
];

const exceptions: ExceptionRecord[] = [
  { id: 9, executionId: 2, controlKey: "CTRL-PAY-001", title: "Payment failure", status: "OPEN", severity: "HIGH", ownerLabel: "Platform Engineering", dueAt: "2026-08-19T00:00:00Z", remediation: "Investigate, attach retest", retestStatus: "PENDING", externalGrcReference: null, createdAt: "2026-08-20T11:30:00Z", updatedAt: "2026-08-20T11:30:00Z" },
];

describe("FlowGuard evidence dashboard", () => {
  it("groups execution outcomes and linked exception counts by day", () => {
    const summary = buildEvidenceDashboard(executions, exceptions);
    expect(summary).toMatchObject({ totalExecutions: 3, successRate: 67, linkedExceptions: 1, openExceptions: 1, overdueExceptions: expect.any(Number) });
    expect(summary.timeline).toEqual([expect.objectContaining({ date: "2026-08-20", totalExecutions: 2, pass: 1, fail: 1, successRate: 50, linkedExceptions: 1 }), expect.objectContaining({ date: "2026-08-21", totalExecutions: 1, pass: 1, fail: 0, successRate: 100, linkedExceptions: 0 })]);
  });

  it("creates a single escaped CSV report across evidence and exception history", () => {
    const csv = buildEvidenceCsv(executions, exceptions);
    expect(csv.split("\n")).toHaveLength(5);
    expect(csv).toContain('"execution"');
    expect(csv).toContain('"grc_exception"');
    expect(csv).toContain('"Investigate, attach retest"');
    expect(csv).toContain('"bi_ojk_evidence_reference"');
    expect(csv).toContain('"ISO/IEC 27001:2022 evidence reference: Annex A 8.15 Logging, 8.16 Monitoring activities, and 5.24 Information security incident management planning and preparation."');
  });

  it("filters evidence by date, control, and verdict while retaining only linked exception results", () => {
    const result = filterEvidence(executions, exceptions, { ...emptyEvidenceFilters, startDate: "2026-08-20", endDate: "2026-08-20", controlKey: "CTRL-PAY-001", verdict: "FAIL" });
    expect(result.executions.map(record => record.id)).toEqual([2]);
    expect(result.exceptions.map(record => record.id)).toEqual([9]);
  });

  it("searches persisted execution evidence and exception identifiers or titles", () => {
    const executionResult = filterEvidence(executions, exceptions, { ...emptyEvidenceFilters, query: "reconciliation" });
    expect(executionResult.executions.map(record => record.id)).toEqual([3]);
    expect(executionResult.exceptions).toEqual([]);
    const exceptionResult = filterEvidence(executions, exceptions, { ...emptyEvidenceFilters, query: "EXC-9" });
    expect(exceptionResult.executions).toEqual([]);
    expect(exceptionResult.exceptions.map(record => record.title)).toEqual(["Payment failure"]);
  });

  it("buckets open exception due dates and exposes transparent control mappings", () => {
    expect(buildRemediationAging(exceptions, new Date("2026-08-20T12:00:00Z"))).toEqual([{ bucket: "Overdue", count: 1 }, { bucket: "Due ≤7d", count: 0 }, { bucket: "Due 8–30d", count: 0 }, { bucket: "Due >30d", count: 0 }, { bucket: "No due date", count: 0 }]);
    expect(getComplianceEvidenceMapping("CTRL-ACC-001", "execution").iso27001EvidenceReference).toContain("5.18 Access rights");
  });

  it("returns the exact non-closed exceptions represented by a remediation-aging bar", () => {
    expect(getExceptionsForRemediationBucket(exceptions, "Overdue", new Date("2026-08-20T12:00:00Z")).map(record => record.id)).toEqual([9]);
    expect(getExceptionsForRemediationBucket(exceptions, "Due ≤7d", new Date("2026-08-20T12:00:00Z"))).toEqual([]);
  });
});
