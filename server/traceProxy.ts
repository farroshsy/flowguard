/**
 * FlowGuard server-side telemetry boundary.
 * Browser code never receives service tokens; absent or invalid configuration fails closed.
 */
export type TraceBackend = "jaeger" | "tempo";

type BackendConfig = { backend: TraceBackend; baseUrl: string; token?: string };

function readConfig(backend: TraceBackend): BackendConfig | null {
  const baseUrl = backend === "jaeger" ? process.env.FLOWGUARD_JAEGER_BASE_URL : process.env.FLOWGUARD_TEMPO_BASE_URL;
  const token = backend === "jaeger" ? process.env.FLOWGUARD_JAEGER_API_TOKEN : process.env.FLOWGUARD_TEMPO_API_TOKEN;
  if (!baseUrl) return null;
  let parsed: URL;
  try { parsed = new URL(baseUrl); } catch { return null; }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") return null;
  return { backend, baseUrl: parsed.toString().replace(/\/$/, ""), token: token || undefined };
}

export function getTraceBackendConfig(backend: TraceBackend) {
  return readConfig(backend);
}

export function buildTraceQueryUrl(backend: TraceBackend, traceId: string) {
  if (!/^[a-zA-Z0-9_-]{4,256}$/.test(traceId)) throw new Error("Trace identifiers may contain only letters, numbers, hyphens, and underscores.");
  const config = readConfig(backend);
  if (!config) throw new Error(`No safe ${backend} endpoint is configured. Add its server-side base URL before requesting a live trace.`);
  const path = backend === "jaeger" ? `/api/traces/${encodeURIComponent(traceId)}` : `/api/traces/${encodeURIComponent(traceId)}`;
  return { url: `${config.baseUrl}${path}`, token: config.token };
}
