import type { jsPDF } from "jspdf";

export type ExecutionRecord = {
  id: number;
  controlKey: string;
  process: string;
  verdict: "PASS" | "FAIL" | "INCONCLUSIVE";
  traceId: string;
  evidenceHash: string;
  provenanceLabel: string;
  provenanceSource: string;
  finding: unknown;
  assertions: unknown;
  executedAt: Date | string;
  createdAt: Date | string;
};

export type ExceptionRecord = {
  id: number;
  executionId: number;
  controlKey: string;
  title: string;
  status: "OPEN" | "IN_REMEDIATION" | "CLOSED";
  severity: "HIGH" | "MEDIUM" | "LOW";
  ownerLabel: string;
  dueAt: Date | string | null;
  remediation: string;
  retestStatus: "PENDING" | "PASSED" | "FAILED";
  externalGrcReference: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type EvidenceTimelinePoint = {
  date: string;
  label: string;
  totalExecutions: number;
  pass: number;
  fail: number;
  inconclusive: number;
  successRate: number;
  linkedExceptions: number;
};

export type EvidenceDashboardSummary = {
  totalExecutions: number;
  successRate: number;
  linkedExceptions: number;
  openExceptions: number;
  timeline: EvidenceTimelinePoint[];
};

function toDateKey(value: Date | string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unknown date" : parsed.toISOString().slice(0, 10);
}

function toDisplayDate(dateKey: string) {
  if (dateKey === "Unknown date") return dateKey;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${dateKey}T00:00:00Z`));
}

export function buildEvidenceDashboard(executions: ExecutionRecord[], exceptions: ExceptionRecord[]): EvidenceDashboardSummary {
  const timeline = new Map<string, Omit<EvidenceTimelinePoint, "date" | "label" | "successRate">>();
  const ensurePoint = (date: string) => {
    const existing = timeline.get(date);
    if (existing) return existing;
    const created = { totalExecutions: 0, pass: 0, fail: 0, inconclusive: 0, linkedExceptions: 0 };
    timeline.set(date, created);
    return created;
  };

  for (const execution of executions) {
    const point = ensurePoint(toDateKey(execution.executedAt));
    point.totalExecutions += 1;
    if (execution.verdict === "PASS") point.pass += 1;
    if (execution.verdict === "FAIL") point.fail += 1;
    if (execution.verdict === "INCONCLUSIVE") point.inconclusive += 1;
  }

  for (const exception of exceptions) {
    ensurePoint(toDateKey(exception.createdAt)).linkedExceptions += 1;
  }

  const points = Array.from(timeline.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, point]) => ({
      date,
      label: toDisplayDate(date),
      ...point,
      successRate: point.totalExecutions ? Math.round((point.pass / point.totalExecutions) * 100) : 0,
    }));

  const totalExecutions = executions.length;
  const passedExecutions = executions.filter(execution => execution.verdict === "PASS").length;
  return {
    totalExecutions,
    successRate: totalExecutions ? Math.round((passedExecutions / totalExecutions) * 100) : 0,
    linkedExceptions: exceptions.length,
    openExceptions: exceptions.filter(exception => exception.status !== "CLOSED").length,
    timeline: points,
  };
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const normalized = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function buildEvidenceCsv(executions: ExecutionRecord[], exceptions: ExceptionRecord[]) {
  const headers = ["record_type", "record_id", "execution_id", "control_key", "process_or_title", "verdict_or_status", "severity", "occurred_at", "trace_id", "evidence_hash", "owner", "retest_status", "remediation", "provenance", "linked_reference"];
  const executionRows = executions.map(execution => [
    "execution", execution.id, "", execution.controlKey, execution.process, execution.verdict, "", execution.executedAt, execution.traceId,
    execution.evidenceHash, "", "", execution.finding ?? "", `${execution.provenanceLabel}: ${execution.provenanceSource}`, "",
  ]);
  const exceptionRows = exceptions.map(exception => [
    "grc_exception", exception.id, exception.executionId, exception.controlKey, exception.title, exception.status, exception.severity,
    exception.createdAt, "", "", exception.ownerLabel, exception.retestStatus, exception.remediation, "", exception.externalGrcReference ?? "",
  ]);
  return [headers, ...executionRows, ...exceptionRows].map(row => row.map(csvCell).join(",")).join("\n");
}

function downloadBlob(contents: BlobPart, type: string, fileName: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function reportDate() {
  return new Date().toISOString().slice(0, 10);
}

export function downloadEvidenceCsv(executions: ExecutionRecord[], exceptions: ExceptionRecord[]) {
  downloadBlob(buildEvidenceCsv(executions, exceptions), "text/csv;charset=utf-8", `flowguard-evidence-report-${reportDate()}.csv`);
}

function textLines(document: jsPDF, text: string, x: number, y: number, maxWidth: number, leading = 14) {
  const lines = document.splitTextToSize(text, maxWidth) as string[];
  document.text(lines, x, y);
  return y + lines.length * leading;
}

export async function downloadEvidencePdf(executions: ExecutionRecord[], exceptions: ExceptionRecord[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const summary = buildEvidenceDashboard(executions, exceptions);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = 54;
  const nextPage = () => {
    if (y < pageHeight - 72) return;
    doc.addPage();
    y = 54;
  };
  const writeEntry = (heading: string, detail: string) => {
    nextPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    y = textLines(doc, heading, margin, y, pageWidth - margin * 2, 13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(73, 84, 92);
    y = textLines(doc, detail, margin, y + 2, pageWidth - margin * 2, 13) + 8;
    doc.setTextColor(25, 34, 40);
  };

  doc.setFillColor(19, 31, 37);
  doc.rect(0, 0, pageWidth, 114, "F");
  doc.setTextColor(234, 239, 235);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("FlowGuard evidence report", margin, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleString()} · Owner-scoped control evidence`, margin, 76);
  doc.setTextColor(25, 34, 40);
  y = 148;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Evidence overview", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = textLines(doc, `${summary.totalExecutions} executions · ${summary.successRate}% pass rate · ${summary.linkedExceptions} linked exceptions · ${summary.openExceptions} open or in remediation`, margin, y + 20, pageWidth - margin * 2) + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Execution evidence", margin, y);
  y += 20;
  if (!executions.length) writeEntry("No persisted execution evidence", "Persist a FlowGuard execution to include its trace identifiers, verdict, and evidence hash in this report.");
  executions.forEach(execution => writeEntry(
    `FG-EXE-${execution.id} · ${execution.controlKey} · ${execution.verdict}`,
    `Process: ${execution.process}\nExecuted: ${new Date(execution.executedAt).toLocaleString()}\nTrace: ${execution.traceId}\nEvidence hash: ${execution.evidenceHash}\nProvenance: ${execution.provenanceLabel} — ${execution.provenanceSource}`,
  ));

  nextPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Linked GRC exception history", margin, y);
  y += 20;
  if (!exceptions.length) writeEntry("No linked GRC exceptions", "Passing executions remain preserved as evidence records without an exception.");
  exceptions.forEach(exception => writeEntry(
    `EXC-${exception.id} · ${exception.controlKey} · ${exception.status}`,
    `Title: ${exception.title}\nSeverity: ${exception.severity}\nOwner: ${exception.ownerLabel}\nRetest: ${exception.retestStatus}\nDue: ${exception.dueAt ? new Date(exception.dueAt).toLocaleDateString() : "Not assigned"}\nRemediation: ${exception.remediation}`,
  ));

  doc.save(`flowguard-evidence-report-${reportDate()}.pdf`);
}
