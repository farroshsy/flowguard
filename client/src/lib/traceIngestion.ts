/**
 * Assurance Console — browser-local OpenTelemetry / Jaeger export ingestion.
 * The adapter accepts exported data only; it never implies a live collector connection or a compliance conclusion.
 */
import { parse } from "yaml";
import type { Assertion, ControlExecution, Verdict } from "./flowguard";

export type NormalizedSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  service: string;
  operation: string;
  status: "ok" | "error" | "unset";
  startTime: number;
  attributes: Record<string, string>;
};

export type ProcessRequirement = { service: string; operation: string; status?: "ok" | "error" };
export type ProcessContract = {
  process: string;
  required: ProcessRequirement[];
  ordering?: [string, string][];
  trace?: { require_same_trace_id?: boolean };
};

export type ImportedTrace = {
  traceId: string;
  spans: NormalizedSpan[];
  sourceShape: "otlp-json" | "jaeger-json" | "generic-json";
  sourceName: string;
};

function asText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    for (const key of ["stringValue", "boolValue", "intValue", "doubleValue", "value"]) {
      if (candidate[key] !== undefined) return asText(candidate[key]);
    }
  }
  return "";
}

function attributesToRecord(attributes: unknown): Record<string, string> {
  if (!Array.isArray(attributes)) return {};
  return Object.fromEntries(attributes.map((item: any) => [String(item?.key ?? ""), asText(item?.value ?? item?.vStr ?? "")]).filter(([key]) => key));
}

function otlpStatus(span: any, attributes: Record<string, string>): "ok" | "error" | "unset" {
  const code = String(span?.status?.code ?? attributes["otel.status_code"] ?? "").toUpperCase();
  if (code === "2" || code === "ERROR" || attributes.error === "true") return "error";
  if (code === "1" || code === "OK") return "ok";
  return "unset";
}

function fromOtlp(root: any): NormalizedSpan[] {
  const spans: NormalizedSpan[] = [];
  for (const resourceSpan of root.resourceSpans ?? []) {
    const resourceAttributes = attributesToRecord(resourceSpan?.resource?.attributes);
    const service = resourceAttributes["service.name"] || "unknown-service";
    for (const scopeSpan of resourceSpan.scopeSpans ?? resourceSpan.instrumentationLibrarySpans ?? []) {
      for (const span of scopeSpan.spans ?? []) {
        const attrs = { ...resourceAttributes, ...attributesToRecord(span.attributes) };
        spans.push({
          traceId: String(span.traceId ?? ""),
          spanId: String(span.spanId ?? ""),
          parentSpanId: span.parentSpanId ? String(span.parentSpanId) : undefined,
          service: attrs["service.name"] || service,
          operation: String(span.name ?? "unknown-operation"),
          status: otlpStatus(span, attrs),
          startTime: Number(span.startTimeUnixNano ?? 0),
          attributes: attrs,
        });
      }
    }
  }
  return spans.filter(span => span.traceId && span.spanId);
}

function fromJaeger(root: any): NormalizedSpan[] {
  const traces = Array.isArray(root.data) ? root.data : [];
  const spans: NormalizedSpan[] = [];
  for (const trace of traces) {
    const processes = trace.processes ?? {};
    for (const span of trace.spans ?? []) {
      const attrs = attributesToRecord(span.tags);
      const process = processes[span.processID] ?? {};
      const hasError = attrs.error === "true" || String(attrs["otel.status_code"] ?? "").toUpperCase() === "ERROR";
      spans.push({
        traceId: String(span.traceID ?? trace.traceID ?? ""),
        spanId: String(span.spanID ?? ""),
        parentSpanId: Array.isArray(span.references) ? String(span.references.find((reference: any) => reference.refType === "CHILD_OF")?.spanID ?? "") || undefined : undefined,
        service: String(process.serviceName ?? attrs["service.name"] ?? "unknown-service"),
        operation: String(span.operationName ?? "unknown-operation"),
        status: hasError ? "error" : "ok",
        startTime: Number(span.startTime ?? 0),
        attributes: attrs,
      });
    }
  }
  return spans.filter(span => span.traceId && span.spanId);
}

function fromGeneric(root: any): NormalizedSpan[] {
  const source = Array.isArray(root) ? root : root.spans;
  if (!Array.isArray(source)) return [];
  return source.map((span: any) => ({
    traceId: String(span.traceId ?? span.traceID ?? ""),
    spanId: String(span.spanId ?? span.spanID ?? ""),
    parentSpanId: span.parentSpanId ?? span.parentSpanID,
    service: String(span.service ?? span.serviceName ?? "unknown-service"),
    operation: String(span.operation ?? span.name ?? span.operationName ?? "unknown-operation"),
    status: (String(span.status ?? "unset").toLowerCase() === "error" ? "error" : String(span.status ?? "unset").toLowerCase() === "ok" ? "ok" : "unset") as NormalizedSpan["status"],
    startTime: Number(span.startTime ?? span.startTimeUnixNano ?? 0),
    attributes: typeof span.attributes === "object" && span.attributes ? Object.fromEntries(Object.entries(span.attributes).map(([key, value]) => [key, asText(value)])) : {},
  })).filter((span: NormalizedSpan) => span.traceId && span.spanId);
}

export function parseTraceExport(rawText: string, sourceName: string): ImportedTrace {
  let root: any;
  try {
    root = JSON.parse(rawText);
  } catch {
    throw new Error("The trace export must be valid JSON. Export one trace as OTLP JSON, Jaeger JSON, or a simple span array.");
  }
  const otlp = fromOtlp(root);
  const jaeger = otlp.length ? [] : fromJaeger(root);
  const generic = otlp.length || jaeger.length ? [] : fromGeneric(root);
  const spans = otlp.length ? otlp : jaeger.length ? jaeger : generic;
  if (!spans.length) throw new Error("No supported spans were found. Expected OTLP resourceSpans, Jaeger data[].spans, or a generic spans array.");
  const traceId = spans[0].traceId;
  return { traceId, spans, sourceShape: otlp.length ? "otlp-json" : jaeger.length ? "jaeger-json" : "generic-json", sourceName };
}

export function parseProcessContract(rawYaml: string): ProcessContract {
  let parsed: unknown;
  try {
    parsed = parse(rawYaml);
  } catch (error) {
    throw new Error(`The process contract could not be parsed: ${error instanceof Error ? error.message : "unknown YAML error"}`);
  }
  const contract = parsed as ProcessContract;
  if (!contract || typeof contract.process !== "string" || !contract.process.trim()) throw new Error("The contract requires a non-empty process name.");
  if (!Array.isArray(contract.required) || !contract.required.length) throw new Error("The contract requires at least one required service operation.");
  for (const requirement of contract.required) {
    if (!requirement || typeof requirement.service !== "string" || typeof requirement.operation !== "string") throw new Error("Each required item needs service and operation strings.");
    if (requirement.status && requirement.status !== "ok" && requirement.status !== "error") throw new Error("Required status must be either ok or error.");
  }
  if (contract.ordering && !contract.ordering.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(item => typeof item === "string"))) throw new Error("Each ordering rule must be a two-item string pair such as [paymentservice.Charge, shippingservice.ShipOrder].");
  return contract;
}

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) { value ^= input.charCodeAt(index); value = Math.imul(value, 16777619); }
  return `sha256:fg-${(value >>> 0).toString(16).padStart(8, "0")}live`;
}

function assertionForRequirement(requirement: ProcessRequirement, spans: NormalizedSpan[]): Assertion {
  const matching = spans.filter(span => span.service === requirement.service && span.operation === requirement.operation).sort((left, right) => left.startTime - right.startTime);
  const expectedStatus = requirement.status ?? "ok";
  const first = matching[0];
  const label = `${requirement.service}/${requirement.operation}`;
  if (!first) return { key: label, label, service: requirement.service, operation: requirement.operation, expected: `status = ${expectedStatus}`, observed: "span missing", spanId: "—", status: "FAIL", detail: `No ${label} span was found in the imported trace.` };
  if (first.status === "unset") return { key: label, label, service: requirement.service, operation: requirement.operation, expected: `status = ${expectedStatus}`, observed: "status = unset", spanId: first.spanId, status: "INCONCLUSIVE", detail: `${label} has no explicit OpenTelemetry status, so the control cannot be verified.` };
  if (first.status !== expectedStatus) return { key: label, label, service: requirement.service, operation: requirement.operation, expected: `status = ${expectedStatus}`, observed: `status = ${first.status}`, spanId: first.spanId, status: "FAIL", detail: `${label} did not meet the required status.` };
  return { key: label, label, service: requirement.service, operation: requirement.operation, expected: `status = ${expectedStatus}`, observed: `status = ${first.status}`, spanId: first.spanId, status: "PASS", detail: `${label} was present and satisfied its explicit status condition.` };
}

function lookupStart(token: string, spans: NormalizedSpan[]) {
  const [service, ...operationParts] = token.split(".");
  const operation = operationParts.join(".");
  return spans.filter(span => span.service === service && span.operation === operation).sort((left, right) => left.startTime - right.startTime)[0];
}

export function evaluateImportedTrace(trace: ImportedTrace, contract: ProcessContract): ControlExecution {
  const assertions = contract.required.map(requirement => assertionForRequirement(requirement, trace.spans));
  if (contract.trace?.require_same_trace_id && new Set(trace.spans.map(span => span.traceId)).size > 1) {
    assertions.push({ key: "trace-continuity", label: "Trace continuity", service: "trace", operation: "continuity", expected: "one trace identifier", observed: "multiple trace identifiers", spanId: "—", status: "INCONCLUSIVE", detail: "The imported export contains multiple trace identifiers; FlowGuard will not promote mixed evidence to a pass." });
  }
  for (const [beforeToken, afterToken] of contract.ordering ?? []) {
    const before = lookupStart(beforeToken, trace.spans);
    const after = lookupStart(afterToken, trace.spans);
    if (before && after && before.startTime > after.startTime) {
      assertions.push({ key: `order:${beforeToken}:${afterToken}`, label: "Process ordering", service: beforeToken.split(".")[0], operation: `${beforeToken} → ${afterToken}`, expected: `${beforeToken} before ${afterToken}`, observed: "reverse order observed", spanId: after.spanId, status: "FAIL", detail: "The declared business-process ordering rule was violated." });
    }
  }
  const failure = assertions.find(assertion => assertion.status === "FAIL") ?? null;
  const inconclusive = assertions.find(assertion => assertion.status === "INCONCLUSIVE") ?? null;
  const verdict: Verdict = failure ? "FAIL" : inconclusive ? "INCONCLUSIVE" : "PASS";
  return {
    verdict,
    firstFinding: failure ?? inconclusive,
    evidenceHash: hash(`${trace.traceId}:${contract.process}:${assertions.map(item => `${item.key}:${item.status}`).join("|")}`),
    controlKey: "CTRL-APP-001",
    process: contract.process,
    contractVersion: "user-contract-v1",
    assertions,
    traceId: trace.traceId,
    durationMs: 0,
    runAt: new Date().toISOString(),
    environment: `imported-${trace.sourceShape}`,
    provenanceLabel: "Imported Trace Export",
    provenanceSource: trace.sourceName,
  };
}
