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
  overdueExceptions: number;
  timeline: EvidenceTimelinePoint[];
};

export type EvidenceFilters = {
  startDate: string;
  endDate: string;
  controlKey: string;
  verdict: "" | ExecutionRecord["verdict"];
  query: string;
};

export const emptyEvidenceFilters: EvidenceFilters = { startDate: "", endDate: "", controlKey: "", verdict: "", query: "" };

export type RemediationAgingPoint = {
  bucket: "Overdue" | "Due ≤7d" | "Due 8–30d" | "Due >30d" | "No due date";
  count: number;
};

export type RemediationAgingBucket = RemediationAgingPoint["bucket"];

export type ComplianceEvidenceMapping = {
  biOjkEvidenceReference: string;
  iso27001EvidenceReference: string;
  interpretationNote: string;
};

function toDateKey(value: Date | string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unknown date" : parsed.toISOString().slice(0, 10);
}

function toDisplayDate(dateKey: string) {
  if (dateKey === "Unknown date") return dateKey;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${dateKey}T00:00:00Z`));
}

function isWithinDateRange(value: Date | string, startDate: string, endDate: string) {
  if (!startDate && !endDate) return true;
  const key = toDateKey(value);
  if (key === "Unknown date") return false;
  return (!startDate || key >= startDate) && (!endDate || key <= endDate);
}

function includesSearchTerm(values: Array<string | number | null | undefined>, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return values.some(value => String(value ?? "").toLocaleLowerCase().includes(normalizedQuery));
}

export function filterEvidence(executions: ExecutionRecord[], exceptions: ExceptionRecord[], filters: EvidenceFilters) {
  const filteredExecutions = executions.filter(execution => {
    const matchesControl = !filters.controlKey || execution.controlKey === filters.controlKey;
    const matchesVerdict = !filters.verdict || execution.verdict === filters.verdict;
    const matchesSearch = includesSearchTerm([execution.controlKey, execution.process, execution.traceId, execution.evidenceHash, `FG-EXE-${execution.id}`], filters.query);
    return matchesControl && matchesVerdict && matchesSearch && isWithinDateRange(execution.executedAt, filters.startDate, filters.endDate);
  });
  const selectedExecutionIds = new Set(filteredExecutions.map(execution => execution.id));
  const filteredExceptions = exceptions.filter(exception => {
    const matchesControl = !filters.controlKey || exception.controlKey === filters.controlKey;
    const matchesDate = isWithinDateRange(exception.createdAt, filters.startDate, filters.endDate);
    const matchesVerdict = !filters.verdict || selectedExecutionIds.has(exception.executionId);
    const matchesSearch = includesSearchTerm([exception.controlKey, exception.title, exception.ownerLabel, exception.remediation, exception.externalGrcReference, `EXC-${exception.id}`], filters.query);
    return matchesControl && matchesDate && matchesVerdict && matchesSearch;
  });
  return { executions: filteredExecutions, exceptions: filteredExceptions };
}

export function getRemediationAgingBucket(exception: ExceptionRecord, referenceDate = new Date()): RemediationAgingBucket | null {
  if (exception.status === "CLOSED") return null;
  if (!exception.dueAt || Number.isNaN(new Date(exception.dueAt).getTime())) return "No due date";
  const today = Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate());
  const due = new Date(exception.dueAt);
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const daysUntilDue = Math.round((dueDay - today) / 86_400_000);
  if (daysUntilDue < 0) return "Overdue";
  if (daysUntilDue <= 7) return "Due ≤7d";
  if (daysUntilDue <= 30) return "Due 8–30d";
  return "Due >30d";
}

export function getExceptionsForRemediationBucket(exceptions: ExceptionRecord[], bucket: RemediationAgingBucket, referenceDate = new Date()) {
  return exceptions.filter(exception => getRemediationAgingBucket(exception, referenceDate) === bucket);
}

export function buildRemediationAging(exceptions: ExceptionRecord[], referenceDate = new Date()): RemediationAgingPoint[] {
  const buckets: RemediationAgingPoint[] = [
    { bucket: "Overdue", count: 0 },
    { bucket: "Due ≤7d", count: 0 },
    { bucket: "Due 8–30d", count: 0 },
    { bucket: "Due >30d", count: 0 },
    { bucket: "No due date", count: 0 },
  ];
  for (const exception of exceptions) {
    const bucket = getRemediationAgingBucket(exception, referenceDate);
    const target = buckets.find(point => point.bucket === bucket);
    if (target) target.count += 1;
  }
  return buckets;
}

export function getComplianceEvidenceMapping(controlKey: string, recordType: "execution" | "grc_exception"): ComplianceEvidenceMapping {
  const recordSuffix = recordType === "execution"
    ? "Preserve the execution verdict, trace identifier, evidence hash, provenance, and timestamp as the source evidence record."
    : "Preserve the linked execution ID, exception status, owner, due date, remediation, and retest status as the source evidence record.";
  const interpretationNote = `This is a reviewable evidence cross-reference, not a certification or legal-compliance conclusion. ${recordSuffix}`;
  const defaultMapping: ComplianceEvidenceMapping = {
    biOjkEvidenceReference: "BI/OJK evidence reference: technical-control effectiveness, traceable provenance, exception remediation, and retest evidence. Link this record to the organization’s applicable Bank Indonesia or OJK requirement in its approved regulatory register.",
    iso27001EvidenceReference: "ISO/IEC 27001:2022 evidence reference: Annex A 8.15 Logging and 8.16 Monitoring activities.",
    interpretationNote,
  };
  if (controlKey === "CTRL-ACC-001") return {
    biOjkEvidenceReference: "BI/OJK evidence reference: privileged-access change authorization, implementation trace, and auditability. Link to the organization’s selected access-management and ICT-risk obligation in its regulatory register.",
    iso27001EvidenceReference: "ISO/IEC 27001:2022 evidence reference: Annex A 5.18 Access rights and 8.15 Logging.",
    interpretationNote,
  };
  if (controlKey === "CTRL-REC-001") return {
    biOjkEvidenceReference: "BI/OJK evidence reference: transaction-record integrity, reconciliation evidence, exception follow-up, and operational monitoring. Link to the organization’s selected payment, reporting, or ICT-risk obligation in its regulatory register.",
    iso27001EvidenceReference: "ISO/IEC 27001:2022 evidence reference: Annex A 8.15 Logging and 8.16 Monitoring activities.",
    interpretationNote,
  };
  if (controlKey === "CTRL-PAY-001") return {
    biOjkEvidenceReference: "BI/OJK evidence reference: payment-process integrity, operational traceability, technical-control failure handling, and remediation evidence. Link to the organization’s selected payment-service and ICT-risk obligation in its regulatory register.",
    iso27001EvidenceReference: "ISO/IEC 27001:2022 evidence reference: Annex A 8.15 Logging, 8.16 Monitoring activities, and 5.24 Information security incident management planning and preparation.",
    interpretationNote,
  };
  return defaultMapping;
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
  for (const exception of exceptions) ensurePoint(toDateKey(exception.createdAt)).linkedExceptions += 1;
  const points = Array.from(timeline.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([date, point]) => ({ date, label: toDisplayDate(date), ...point, successRate: point.totalExecutions ? Math.round((point.pass / point.totalExecutions) * 100) : 0 }));
  const totalExecutions = executions.length;
  const passedExecutions = executions.filter(execution => execution.verdict === "PASS").length;
  const overdueExceptions = buildRemediationAging(exceptions).find(point => point.bucket === "Overdue")?.count ?? 0;
  return { totalExecutions, successRate: totalExecutions ? Math.round((passedExecutions / totalExecutions) * 100) : 0, linkedExceptions: exceptions.length, openExceptions: exceptions.filter(exception => exception.status !== "CLOSED").length, overdueExceptions, timeline: points };
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const normalized = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function buildEvidenceCsv(executions: ExecutionRecord[], exceptions: ExceptionRecord[]) {
  const headers = ["record_type", "record_id", "execution_id", "control_key", "process_or_title", "verdict_or_status", "severity", "occurred_at", "trace_id", "evidence_hash", "owner", "retest_status", "remediation", "provenance", "linked_reference", "bi_ojk_evidence_reference", "iso_27001_evidence_reference", "mapping_interpretation_note"];
  const executionRows = executions.map(execution => {
    const mapping = getComplianceEvidenceMapping(execution.controlKey, "execution");
    return ["execution", execution.id, "", execution.controlKey, execution.process, execution.verdict, "", execution.executedAt, execution.traceId, execution.evidenceHash, "", "", execution.finding ?? "", `${execution.provenanceLabel}: ${execution.provenanceSource}`, "", mapping.biOjkEvidenceReference, mapping.iso27001EvidenceReference, mapping.interpretationNote];
  });
  const exceptionRows = exceptions.map(exception => {
    const mapping = getComplianceEvidenceMapping(exception.controlKey, "grc_exception");
    return ["grc_exception", exception.id, exception.executionId, exception.controlKey, exception.title, exception.status, exception.severity, exception.createdAt, "", "", exception.ownerLabel, exception.retestStatus, exception.remediation, "", exception.externalGrcReference ?? "", mapping.biOjkEvidenceReference, mapping.iso27001EvidenceReference, mapping.interpretationNote];
  });
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

function reportDate() { return new Date().toISOString().slice(0, 10); }

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
  const nextPage = () => { if (y < pageHeight - 72) return; doc.addPage(); y = 54; };
  const writeEntry = (heading: string, detail: string) => { nextPage(); doc.setFont("helvetica", "bold"); doc.setFontSize(10); y = textLines(doc, heading, margin, y, pageWidth - margin * 2, 13); doc.setFont("helvetica", "normal"); doc.setTextColor(73, 84, 92); y = textLines(doc, detail, margin, y + 2, pageWidth - margin * 2, 13) + 8; doc.setTextColor(25, 34, 40); };
  doc.setFillColor(19, 31, 37); doc.rect(0, 0, pageWidth, 114, "F"); doc.setTextColor(234, 239, 235); doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text("FlowGuard evidence report", margin, 52); doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`Generated ${new Date().toLocaleString()} · Owner-scoped control evidence`, margin, 76); doc.setTextColor(25, 34, 40); y = 148;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Evidence overview", margin, y); doc.setFont("helvetica", "normal"); doc.setFontSize(10); y = textLines(doc, `${summary.totalExecutions} executions · ${summary.successRate}% pass rate · ${summary.linkedExceptions} linked exceptions · ${summary.openExceptions} open or in remediation · ${summary.overdueExceptions} overdue`, margin, y + 20, pageWidth - margin * 2) + 12; y = textLines(doc, "Compliance mapping note: BI/OJK and ISO/IEC 27001:2022 labels are reviewable evidence cross-references. They do not determine regulatory applicability, certification, or legal compliance.", margin, y, pageWidth - margin * 2) + 18;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Execution evidence", margin, y); y += 20;
  if (!executions.length) writeEntry("No persisted execution evidence", "Persist a FlowGuard execution to include its trace identifiers, verdict, and evidence hash in this report.");
  executions.forEach(execution => { const mapping = getComplianceEvidenceMapping(execution.controlKey, "execution"); writeEntry(`FG-EXE-${execution.id} · ${execution.controlKey} · ${execution.verdict}`, `Process: ${execution.process}\nExecuted: ${new Date(execution.executedAt).toLocaleString()}\nTrace: ${execution.traceId}\nEvidence hash: ${execution.evidenceHash}\nProvenance: ${execution.provenanceLabel} — ${execution.provenanceSource}\nBI/OJK: ${mapping.biOjkEvidenceReference}\nISO: ${mapping.iso27001EvidenceReference}`); });
  nextPage(); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Linked GRC exception history", margin, y); y += 20;
  if (!exceptions.length) writeEntry("No linked GRC exceptions", "Passing executions remain preserved as evidence records without an exception.");
  exceptions.forEach(exception => { const mapping = getComplianceEvidenceMapping(exception.controlKey, "grc_exception"); writeEntry(`EXC-${exception.id} · ${exception.controlKey} · ${exception.status}`, `Title: ${exception.title}\nSeverity: ${exception.severity}\nOwner: ${exception.ownerLabel}\nRetest: ${exception.retestStatus}\nDue: ${exception.dueAt ? new Date(exception.dueAt).toLocaleDateString() : "Not assigned"}\nRemediation: ${exception.remediation}\nBI/OJK: ${mapping.biOjkEvidenceReference}\nISO: ${mapping.iso27001EvidenceReference}`); });
  doc.save(`flowguard-evidence-report-${reportDate()}.pdf`);
}
