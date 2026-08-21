import { describe, expect, it } from "vitest";
import { buildTraceQueryUrl, getTraceBackendConfig } from "./traceProxy";

describe("FlowGuard telemetry proxy configuration", () => {
  it("fails closed without a configured Jaeger endpoint rather than exposing browser-side credentials", () => {
    const saved = process.env.FLOWGUARD_JAEGER_BASE_URL;
    delete process.env.FLOWGUARD_JAEGER_BASE_URL;
    expect(getTraceBackendConfig("jaeger")).toBeNull();
    expect(() => buildTraceQueryUrl("jaeger", "trace-1234")).toThrow("No safe jaeger endpoint is configured");
    if (saved) process.env.FLOWGUARD_JAEGER_BASE_URL = saved;
  });

  it("rejects unsafe trace identifiers before any proxy request can be constructed", () => {
    expect(() => buildTraceQueryUrl("tempo", "../../metadata")).toThrow("Trace identifiers");
  });
});
