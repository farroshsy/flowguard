import type { ControlExecution } from "@/lib/flowguard";

export type StudioException = {
  id?: number;
  displayId: string;
  status: "Open" | "In remediation" | "Closed";
  severity: "High" | "Medium" | "Low";
  owner: string;
  dueDate: string;
  remediation: string;
};

export function toDatabaseSeverity(value: StudioException["severity"]): "HIGH" | "MEDIUM" | "LOW" {
  return value.toUpperCase() as "HIGH" | "MEDIUM" | "LOW";
}

export function toDatabaseStatus(value: StudioException["status"]): "OPEN" | "IN_REMEDIATION" | "CLOSED" {
  if (value === "Open") return "OPEN";
  if (value === "In remediation") return "IN_REMEDIATION";
  return "CLOSED";
}

export function defaultExceptionDueDate(referenceDate = new Date()): string {
  const due = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
  due.setUTCDate(due.getUTCDate() + 7);
  return due.toISOString().slice(0, 10);
}

export function createDraftException(execution: ControlExecution, referenceDate = new Date()): StudioException | null {
  if (execution.verdict === "PASS") return null;
  const firstFinding = execution.firstFinding;
  return {
    displayId: `EXC-${execution.traceId.slice(0, 8).toUpperCase()}`,
    status: "Open",
    severity: execution.verdict === "FAIL" ? "High" : "Medium",
    owner: "Platform Engineering",
    dueDate: defaultExceptionDueDate(referenceDate),
    remediation: firstFinding
      ? `Investigate ${firstFinding.service}/${firstFinding.operation}; attach a passing retest after the evidence gap or control failure is resolved.`
      : "Investigate imported control result.",
  };
}
