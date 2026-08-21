/**
 * Assurance Console — deterministic client-side fixture verifier.
 * This file enforces FlowGuard's evidence-first design philosophy: a response is not a completed process.
 */
export type Verdict = "PASS" | "FAIL" | "INCONCLUSIVE";
export type AssertionStatus = "PASS" | "FAIL" | "NOT_VERIFIED" | "INCONCLUSIVE";

export type Assertion = {
  key: string;
  label: string;
  service: string;
  operation: string;
  expected: string;
  observed: string;
  spanId: string;
  status: AssertionStatus;
  detail: string;
};

export type FixtureId = "healthy" | "payment_failure" | "shipping_missing" | "trace_disconnected";

export type Fixture = {
  id: FixtureId;
  shortLabel: string;
  label: string;
  category: "Verified baseline" | "Injected failure" | "Evidence gap";
  scenario: string;
  traceId: string;
  durationMs: number;
  runAt: string;
  assertions: Assertion[];
};

export type Evaluation = Fixture & {
  verdict: Verdict;
  firstFinding: Assertion | null;
  evidenceHash: string;
  controlKey: string;
  process: string;
  contractVersion: string;
};

const common = {
  order: {
    key: "order-created",
    label: "Order created",
    service: "checkoutservice",
    operation: "PlaceOrder",
    expected: "status = ok",
    spanId: "5c19ae71",
  },
  payment: {
    key: "payment-charged",
    label: "Payment charged",
    service: "paymentservice",
    operation: "Charge",
    expected: "status = ok",
    spanId: "8d2f41bc",
  },
  shipping: {
    key: "shipment-created",
    label: "Shipment created",
    service: "shippingservice",
    operation: "ShipOrder",
    expected: "status = ok",
    spanId: "1fa0c924",
  },
  cart: {
    key: "cart-cleared",
    label: "Cart cleared",
    service: "cartservice",
    operation: "EmptyCart",
    expected: "status = ok",
    spanId: "b431e6f0",
  },
};

export const fixtures: Record<FixtureId, Fixture> = {
  healthy: {
    id: "healthy",
    shortLabel: "Baseline",
    label: "Verified checkout baseline",
    category: "Verified baseline",
    scenario: "All required checkout operations are present, ordered, and connected through one trace.",
    traceId: "0af31e9c7b204e16",
    durationMs: 842,
    runAt: "2026-08-21T14:32:00Z",
    assertions: [
      { ...common.order, observed: "status = ok", status: "PASS", detail: "Order was created in the canonical checkout trace." },
      { ...common.payment, observed: "status = ok", status: "PASS", detail: "Payment completed before fulfilment began." },
      { ...common.shipping, observed: "status = ok", status: "PASS", detail: "Shipping instruction was emitted from the confirmed payment path." },
      { ...common.cart, observed: "status = ok", status: "PASS", detail: "Cart cleanup completed after fulfilment evidence was present." },
    ],
  },
  payment_failure: {
    id: "payment_failure",
    shortLabel: "Payment failure",
    label: "Injected payment service failure",
    category: "Injected failure",
    scenario: "The checkout request reaches the payment service, which returns an error. Downstream work is not accepted as verified.",
    traceId: "184cd912ab6a4f83",
    durationMs: 691,
    runAt: "2026-08-21T14:35:18Z",
    assertions: [
      { ...common.order, observed: "status = ok", status: "PASS", detail: "Order creation evidence is complete." },
      { ...common.payment, observed: "status = error · declined", status: "FAIL", detail: "The payment span returned an error; no completed checkout verdict is allowed." },
      { ...common.shipping, observed: "not evaluated", status: "NOT_VERIFIED", detail: "Fulfilment cannot be accepted after the first critical transaction failure." },
      { ...common.cart, observed: "not evaluated", status: "NOT_VERIFIED", detail: "Cart clearance is not accepted as evidence of a completed purchase." },
    ],
  },
  shipping_missing: {
    id: "shipping_missing",
    shortLabel: "Missing shipment",
    label: "Missing fulfilment evidence",
    category: "Injected failure",
    scenario: "Checkout and payment succeed, but the trace contains no shipment span. The response alone cannot prove fulfilment.",
    traceId: "77ce0b62d9484d10",
    durationMs: 774,
    runAt: "2026-08-21T14:38:22Z",
    assertions: [
      { ...common.order, observed: "status = ok", status: "PASS", detail: "Order creation evidence is complete." },
      { ...common.payment, observed: "status = ok", status: "PASS", detail: "Payment evidence is complete." },
      { ...common.shipping, observed: "span missing", status: "FAIL", detail: "No shipping service span is available in the required checkout trace." },
      { ...common.cart, observed: "status = ok", status: "PASS", detail: "Cart cleanup alone does not repair the missing fulfilment evidence." },
    ],
  },
  trace_disconnected: {
    id: "trace_disconnected",
    shortLabel: "Trace gap",
    label: "Disconnected trace propagation",
    category: "Evidence gap",
    scenario: "All operations may have occurred, but a disconnected parent relationship means the evidence chain cannot support a pass verdict.",
    traceId: "93aa10d4ffca4d79",
    durationMs: 803,
    runAt: "2026-08-21T14:41:07Z",
    assertions: [
      { ...common.order, observed: "status = ok", status: "PASS", detail: "Order creation evidence is complete." },
      { ...common.payment, observed: "status = ok", status: "PASS", detail: "Payment evidence is complete." },
      { ...common.shipping, observed: "parent trace absent", status: "INCONCLUSIVE", detail: "The shipping span is detached from the parent checkout trace; the evidence chain is incomplete." },
      { ...common.cart, observed: "status = ok", status: "PASS", detail: "Cart cleanup was observed, but does not restore trace continuity." },
    ],
  },
};

export const fixtureOrder: FixtureId[] = ["healthy", "payment_failure", "shipping_missing", "trace_disconnected"];

function fingerprint(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `sha256:fg-${(hash >>> 0).toString(16).padStart(8, "0")}e7a1`;
}

export function evaluateFixture(fixtureId: FixtureId): Evaluation {
  const fixture = fixtures[fixtureId];
  const failed = fixture.assertions.find(assertion => assertion.status === "FAIL") ?? null;
  const inconclusive = fixture.assertions.find(assertion => assertion.status === "INCONCLUSIVE") ?? null;
  const verdict: Verdict = failed ? "FAIL" : inconclusive ? "INCONCLUSIVE" : "PASS";

  return {
    ...fixture,
    verdict,
    firstFinding: failed ?? inconclusive,
    evidenceHash: fingerprint(`${fixture.traceId}:${fixture.assertions.map(item => `${item.key}:${item.status}`).join("|")}`),
    controlKey: "CTRL-APP-001",
    process: "checkout",
    contractVersion: "checkout-v1.0.0",
  };
}

export function buildGrcExport(evaluation: Evaluation) {
  return {
    schemaVersion: "flowguard.control-execution.v1",
    executionId: `fg-${evaluation.traceId}`,
    controlKey: evaluation.controlKey,
    process: evaluation.process,
    verdict: evaluation.verdict,
    runAt: evaluation.runAt,
    environment: "otel-demo-local-fixture",
    contractVersion: evaluation.contractVersion,
    traceId: evaluation.traceId,
    durationMs: evaluation.durationMs,
    evidenceHash: evaluation.evidenceHash,
    provenance: {
      label: "Simulated Case Study",
      source: "OpenTelemetry Astronomy Shop checkout fixture",
      note: "This result demonstrates a technical control test and does not by itself prove regulatory compliance.",
    },
    assertions: evaluation.assertions.map(assertion => ({
      key: assertion.key,
      status: assertion.status,
      service: assertion.service,
      operation: assertion.operation,
      expected: assertion.expected,
      observed: assertion.observed,
      spanId: assertion.spanId,
      explanation: assertion.detail,
    })),
    finding: evaluation.firstFinding
      ? {
          key: evaluation.firstFinding.key,
          service: evaluation.firstFinding.service,
          operation: evaluation.firstFinding.operation,
          status: evaluation.firstFinding.status,
          spanId: evaluation.firstFinding.spanId,
          explanation: evaluation.firstFinding.detail,
        }
      : null,
  };
}

export function verdictLabel(verdict: Verdict) {
  return verdict === "PASS" ? "Control verified" : verdict === "FAIL" ? "Control exception" : "Evidence inconclusive";
}
