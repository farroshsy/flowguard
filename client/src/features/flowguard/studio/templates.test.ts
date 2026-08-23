import { describe, expect, it } from "vitest";
import { parseProcessContract } from "@/lib/traceIngestion";
import { traceStudioTemplates } from "./templates";

describe("Trace studio templates", () => {
  it("provides unique control identities with parseable executable contracts", () => {
    expect(new Set(traceStudioTemplates.map(template => template.controlKey)).size).toBe(traceStudioTemplates.length);
    traceStudioTemplates.forEach(template => {
      const contract = parseProcessContract(template.yaml);
      expect(contract.required.length).toBeGreaterThan(1);
      expect(contract.trace?.require_same_trace_id).toBe(true);
    });
  });
});
