/** Assurance Console — verifier tests cover deterministic evidence and conservative verdict rules. */
import { describe, expect, it } from "vitest";
import { buildGrcExport, evaluateFixture } from "./flowguard";
import { createSimulatedPaymentFailureTrace, evaluateImportedTrace, parseProcessContract, parseTraceExport } from "./traceIngestion";

describe("FlowGuard fixture verifier", () => {
  it("passes the complete checkout baseline", () => {
    const evaluation = evaluateFixture("healthy");
    expect(evaluation.verdict).toBe("PASS");
    expect(evaluation.firstFinding).toBeNull();
  });

  it("identifies payment as the first failed assertion", () => {
    const evaluation = evaluateFixture("payment_failure");
    expect(evaluation.verdict).toBe("FAIL");
    expect(evaluation.firstFinding?.service).toBe("paymentservice");
  });

  it("does not promote a disconnected trace to a pass", () => {
    const evaluation = evaluateFixture("trace_disconnected");
    expect(evaluation.verdict).toBe("INCONCLUSIVE");
    expect(evaluation.firstFinding?.status).toBe("INCONCLUSIVE");
  });

  it("exports a stable GRC-compatible evidence record", () => {
    const result = buildGrcExport(evaluateFixture("shipping_missing"));
    expect(result.controlKey).toBe("CTRL-APP-001");
    expect(result.verdict).toBe("FAIL");
    expect(result.provenance.label).toBe("Simulated Case Study");
    expect(result.assertions).toHaveLength(4);
  });

  it("evaluates an imported generic trace against an editable YAML contract", () => {
    const trace = parseTraceExport(JSON.stringify({ spans: [
      { traceId: "live-001", spanId: "a", service: "checkoutservice", operation: "PlaceOrder", status: "ok", startTime: 1 },
      { traceId: "live-001", spanId: "b", service: "paymentservice", operation: "Charge", status: "ok", startTime: 2 },
    ] }), "checkout-export.json");
    const contract = parseProcessContract("process: checkout\nrequired:\n  - service: checkoutservice\n    operation: PlaceOrder\n    status: ok\n  - service: paymentservice\n    operation: Charge\n    status: ok\ntrace:\n  require_same_trace_id: true");
    expect(evaluateImportedTrace(trace, contract).verdict).toBe("PASS");
  });

  it("fails safely when an imported trace omits a required operation", () => {
    const trace = parseTraceExport(JSON.stringify({ spans: [{ traceId: "live-002", spanId: "a", service: "checkoutservice", operation: "PlaceOrder", status: "ok", startTime: 1 }] }), "partial-export.json");
    const contract = parseProcessContract("process: checkout\nrequired:\n  - service: paymentservice\n    operation: Charge\n    status: ok");
    const evaluation = evaluateImportedTrace(trace, contract);
    expect(evaluation.verdict).toBe("FAIL");
    expect(evaluation.firstFinding?.observed).toBe("span missing");
  });

  it("labels the one-click payment-failure sample as simulated and fails the payment assertion", () => {
    const trace = createSimulatedPaymentFailureTrace();
    const contract = parseProcessContract("process: payment-completion\nrequired:\n  - service: orderservice\n    operation: CreateOrder\n    status: ok\n  - service: paymentservice\n    operation: Charge\n    status: ok");
    const evaluation = evaluateImportedTrace(trace, contract);
    expect(trace.sourceName).toContain("SIMULATED");
    expect(evaluation.verdict).toBe("FAIL");
    expect(evaluation.firstFinding?.service).toBe("paymentservice");
  });
});
