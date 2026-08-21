/** Assurance Console — verifier tests cover deterministic evidence and conservative verdict rules. */
import { describe, expect, it } from "vitest";
import { buildGrcExport, evaluateFixture } from "./flowguard";

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
});
