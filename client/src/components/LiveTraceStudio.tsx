/**
 * FlowGuard trace studio. Real exports can be imported locally or retrieved through a configured server proxy.
 * Persistent actions require the existing project authentication boundary; telemetry credentials remain server-side.
 */
import { AlertTriangle, ArrowDownToLine, Check, CircleDot, FileJson, FileUp, LogIn, Network, Play, RefreshCw, Save, ServerCog, ShieldAlert, ShieldCheck, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { buildGrcExport, type ControlExecution } from "@/lib/flowguard";
import { evaluateImportedTrace, parseProcessContract, parseTraceExport, type ImportedTrace, type ProcessContract } from "@/lib/traceIngestion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

type Template = { key: "payment" | "access" | "reconciliation"; title: string; controlKey: string; domain: string; yaml: string };

const templates: Template[] = [
  { key: "payment", title: "Payment completion", controlKey: "CTRL-PAY-001", domain: "payment", yaml: `process: payment-completion
required:
  - service: orderservice
    operation: CreateOrder
    status: ok
  - service: paymentservice
    operation: Charge
    status: ok
  - service: ledger-service
    operation: RecordSettlement
    status: ok
ordering:
  - [orderservice.CreateOrder, paymentservice.Charge]
  - [paymentservice.Charge, ledger-service.RecordSettlement]
trace:
  require_same_trace_id: true` },
  { key: "access", title: "Privileged access change", controlKey: "CTRL-ACC-001", domain: "access-control", yaml: `process: privileged-access-change
required:
  - service: identity-service
    operation: RequestPrivilegeChange
    status: ok
  - service: approval-service
    operation: ApprovePrivilegeChange
    status: ok
  - service: directory-service
    operation: ApplyRoleAssignment
    status: ok
  - service: audit-service
    operation: RecordAccessEvent
    status: ok
ordering:
  - [identity-service.RequestPrivilegeChange, approval-service.ApprovePrivilegeChange]
  - [approval-service.ApprovePrivilegeChange, directory-service.ApplyRoleAssignment]
  - [directory-service.ApplyRoleAssignment, audit-service.RecordAccessEvent]
trace:
  require_same_trace_id: true` },
  { key: "reconciliation", title: "Data reconciliation", controlKey: "CTRL-REC-001", domain: "data-reconciliation", yaml: `process: reconciliation-close
required:
  - service: source-ledger
    operation: ExportDailyBalance
    status: ok
  - service: reconciliation-engine
    operation: CompareBalances
    status: ok
  - service: exception-service
    operation: RecordVariance
    status: ok
  - service: reporting-service
    operation: PublishCloseReport
    status: ok
ordering:
  - [source-ledger.ExportDailyBalance, reconciliation-engine.CompareBalances]
  - [reconciliation-engine.CompareBalances, exception-service.RecordVariance]
  - [exception-service.RecordVariance, reporting-service.PublishCloseReport]
trace:
  require_same_trace_id: true` },
];

type LocalException = { id?: number; displayId: string; status: "Open" | "In remediation" | "Closed"; severity: "High" | "Medium" | "Low"; owner: string; dueDate: string; remediation: string };
function downloadJson(payload: unknown, fileName: string) { const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url); }
function toDbSeverity(value: LocalException["severity"]) { return value.toUpperCase() as "HIGH" | "MEDIUM" | "LOW"; }
function toDbStatus(value: LocalException["status"]) { return value === "Open" ? "OPEN" : value === "In remediation" ? "IN_REMEDIATION" : "CLOSED" as const; }

export default function LiveTraceStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
  const [activeTemplate, setActiveTemplate] = useState<Template>(templates[0]);
  const [contractYaml, setContractYaml] = useState(templates[0].yaml);
  const [trace, setTrace] = useState<ImportedTrace | null>(null);
  const [contract, setContract] = useState<ProcessContract | null>(null);
  const [execution, setExecution] = useState<ControlExecution | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exception, setException] = useState<LocalException | null>(null);
  const [liveBackend, setLiveBackend] = useState<"jaeger" | "tempo">("jaeger");
  const [liveTraceId, setLiveTraceId] = useState("");
  const [contractId, setContractId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const backendStatus = trpc.flowguard.configuredBackends.useQuery();
  const fetchLive = trpc.flowguard.fetchLiveTrace.useQuery({ backend: liveBackend, traceId: liveTraceId || "trace-pending" }, { enabled: false, retry: false });
  const saveContract = trpc.flowguard.saveContract.useMutation();
  const saveExecution = trpc.flowguard.saveExecution.useMutation();
  const createException = trpc.flowguard.createException.useMutation();
  const updateException = trpc.flowguard.updateException.useMutation();
  const savedContracts = trpc.flowguard.listContracts.useQuery(undefined, { enabled: isAuthenticated });
  const savedExceptions = trpc.flowguard.listExceptions.useQuery(undefined, { enabled: isAuthenticated });
  const exportPayload = useMemo(() => execution ? buildGrcExport(execution) : null, [execution]);

  const selectTemplate = (template: Template) => { setActiveTemplate(template); setContractYaml(template.yaml); setContract(null); setExecution(null); setException(null); setContractId(null); setMessage(`${template.title} template loaded. Review and adapt it before execution.`); setError(null); };
  const validateContract = () => { try { const parsed = parseProcessContract(contractYaml); setContract(parsed); setError(null); setMessage(`Contract valid: ${parsed.process} with ${parsed.required.length} required assertions.`); return parsed; } catch (parseError) { setContract(null); setError(parseError instanceof Error ? parseError.message : "Contract validation failed."); setMessage(null); return null; } };
  const setImported = (imported: ImportedTrace) => { setTrace(imported); setExecution(null); setException(null); setError(null); setMessage(`${imported.spans.length} spans loaded from ${imported.sourceName}. Detected ${imported.sourceShape}.`); };
  const handleUpload = async (file?: File) => { if (!file) return; try { setImported(parseTraceExport(await file.text(), file.name)); } catch (uploadError) { setTrace(null); setExecution(null); setError(uploadError instanceof Error ? uploadError.message : "Trace import failed."); setMessage(null); } };
  const loadLiveTrace = async () => { if (!liveTraceId.trim()) { setError("Enter a trace identifier before requesting a configured Jaeger or Tempo endpoint."); return; } try { const result = await fetchLive.refetch(); if (!result.data) throw result.error ?? new Error("No trace payload was returned."); setImported(parseTraceExport(JSON.stringify(result.data.payload), `${result.data.backend}:${result.data.traceId}`)); } catch (liveError) { setError(liveError instanceof Error ? liveError.message : "Live trace retrieval failed. Check the configured endpoint and trace identifier."); } };
  const execute = () => { const activeContractValue = contract ?? validateContract(); if (!activeContractValue || !trace) { if (!trace) setError("Import an export or request a configured live trace before running the contract."); return; } const result = evaluateImportedTrace(trace, activeContractValue); result.controlKey = activeTemplate.controlKey; setExecution(result); setError(null); setMessage(`Control execution completed: ${result.verdict}. Persist it to create an immutable evidence record.`); setException(result.verdict === "PASS" ? null : { displayId: `EXC-${result.traceId.slice(0, 8).toUpperCase()}`, status: "Open", severity: result.verdict === "FAIL" ? "High" : "Medium", owner: "Platform Engineering", dueDate: "2026-08-28", remediation: result.firstFinding ? `Investigate ${result.firstFinding.service}/${result.firstFinding.operation}; attach a passing retest after the evidence gap or control failure is resolved.` : "Investigate imported control result." }); };
  const persistContract = async () => { const parsed = contract ?? validateContract(); if (!parsed) return; try { const saved = await saveContract.mutateAsync({ controlKey: activeTemplate.controlKey, title: activeTemplate.title, domain: activeTemplate.domain, yaml: contractYaml, version: "v1" }); setContractId(saved.id); setMessage(`Contract saved as FG-CON-${saved.id}.`); await utils.flowguard.listContracts.invalidate(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Sign in to save the contract."); } };
  const persistExecution = async () => { if (!execution) return; try { const saved = await saveExecution.mutateAsync({ contractId: contractId ?? undefined, controlKey: execution.controlKey, process: execution.process, verdict: execution.verdict, traceId: execution.traceId, evidenceHash: execution.evidenceHash, provenanceLabel: execution.provenanceLabel, provenanceSource: execution.provenanceSource, finding: execution.firstFinding, assertions: execution.assertions, executedAt: new Date(execution.runAt) }); if (exception && !exception.id) { const created = await createException.mutateAsync({ executionId: saved.id, controlKey: execution.controlKey, title: execution.firstFinding?.label ?? "Technical control exception", severity: toDbSeverity(exception.severity), ownerLabel: exception.owner, dueAt: new Date(`${exception.dueDate}T00:00:00Z`), remediation: exception.remediation }); setException({ ...exception, id: created.id, displayId: `EXC-${created.id}` }); await utils.flowguard.listExceptions.invalidate(); } setMessage(`Execution saved as FG-EXE-${saved.id}${exception ? " with a linked GRC exception." : "."}`); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Sign in to persist the execution."); } };
  const persistException = async () => { if (!exception) return; if (!exception.id) { await persistExecution(); return; } try { await updateException.mutateAsync({ id: exception.id, status: toDbStatus(exception.status), severity: toDbSeverity(exception.severity), ownerLabel: exception.owner, dueAt: new Date(`${exception.dueDate}T00:00:00Z`), remediation: exception.remediation, retestStatus: exception.status === "Closed" ? "PASSED" : "PENDING" }); setMessage(`Exception ${exception.displayId} updated in the FlowGuard database.`); await utils.flowguard.listExceptions.invalidate(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Sign in to update the exception."); } };

  return <section id="live-studio" className="fg-live-studio"><div className="fg-section-heading"><div><p className="fg-eyebrow">Trace, contract, and evidence studio</p><h2>Bring your own trace.<br /><i>Keep your own evidence.</i></h2></div><span><Network size={15} /> import or configured proxy</span></div><p className="fg-live-intro">Import an OpenTelemetry OTLP JSON or Jaeger export locally, or retrieve a single trace through a configured server proxy. Imported telemetry remains in the browser until you explicitly persist a normalized execution record.</p>
    <div className="fg-template-strip"><p className="fg-kicker">CONTROL TEMPLATES</p><div>{templates.map(template => <button key={template.key} className={activeTemplate.key === template.key ? "active" : ""} onClick={() => selectTemplate(template)}>{template.title}<small>{template.controlKey}</small></button>)}</div></div>
    <div className="fg-live-grid"><section className="fg-upload-card"><div className="fg-card-icon"><FileUp size={19} /></div><p className="fg-kicker">01 · IMPORT TRACE EXPORT</p><h3>{trace ? trace.sourceName : "Trace export not loaded"}</h3><p>{trace ? `${trace.spans.length} spans · ${trace.sourceShape} · trace ${trace.traceId}` : "Supported shapes: OTLP resourceSpans, Jaeger data[].spans, or a compatible JSON spans array."}</p><input ref={inputRef} className="sr-only" type="file" accept="application/json,.json,.jsonl" onChange={event => handleUpload(event.target.files?.[0])} /><button className="fg-upload-button" onClick={() => inputRef.current?.click()}><Upload size={15} /> {trace ? "Replace trace export" : "Upload trace export"}</button></section>
      <section className="fg-contract-card"><div className="fg-card-icon"><ServerCog size={19} /></div><p className="fg-kicker">02 · CONFIGURED LIVE ENDPOINT</p><h3>{backendStatus.data?.[liveBackend] ? `${liveBackend === "jaeger" ? "Jaeger" : "Tempo"} proxy available` : "No live endpoint configured"}</h3><p>Endpoint and token remain server-side. Supply the trace identifier only; FlowGuard never exposes connection credentials to this browser.</p><div className="fg-live-endpoint-controls"><select value={liveBackend} onChange={event => setLiveBackend(event.target.value as "jaeger" | "tempo")}><option value="jaeger">Jaeger</option><option value="tempo">Tempo</option></select><input value={liveTraceId} placeholder="Trace ID" onChange={event => setLiveTraceId(event.target.value)} /><button className="fg-validate-button" onClick={loadLiveTrace} disabled={!backendStatus.data?.[liveBackend] || fetchLive.isFetching}><Network size={14} /> {fetchLive.isFetching ? "Retrieving…" : "Retrieve trace"}</button></div></section></div>
    <div className="fg-contract-editor-wrap"><div className="fg-editor-head"><span><FileJson size={14} /> {activeTemplate.controlKey}.yaml</span><span>YAML · editable in browser</span></div><textarea aria-label="Editable YAML process contract" value={contractYaml} onChange={event => { setContractYaml(event.target.value); setContract(null); setContractId(null); }} spellCheck={false} /><div className="fg-editor-actions"><div className={error ? "fg-studio-message is-error" : message ? "fg-studio-message" : "fg-studio-message muted"}>{error ? <AlertTriangle size={14} /> : message ? <Check size={14} /> : <CircleDot size={14} />}{error ?? message ?? "Choose a template, validate its contract, and run it against a trace."}</div><div className="fg-editor-button-row"><button className="fg-validate-button" onClick={validateContract}><Check size={15} /> Validate YAML</button><button className="fg-validate-button" onClick={persistContract} disabled={saveContract.isPending}><Save size={15} /> Save contract</button><button className="fg-run-button" onClick={execute}><Play size={15} fill="currentColor" /> Run trace</button></div></div></div>
    {execution && <div className={`fg-live-result ${execution.verdict === "PASS" ? "is-pass" : execution.verdict === "FAIL" ? "is-fail" : "is-inconclusive"}`}><div className="fg-live-result-head"><div><p className="fg-kicker">CONTROL EXECUTION · {execution.controlKey}</p><h3>{execution.verdict === "PASS" ? "Control verified" : execution.verdict === "FAIL" ? "Control exception created" : "Evidence requires review"}</h3><p>{execution.firstFinding ? execution.firstFinding.detail : "All assertions in the selected process contract passed."}</p></div><div className="fg-result-actions"><button className="fg-export-button" onClick={() => exportPayload && downloadJson(exportPayload, `flowguard-import-${execution.traceId}.json`)}><ArrowDownToLine size={15} /> Export JSON</button><button className="fg-validate-button" onClick={persistExecution} disabled={saveExecution.isPending}><Save size={15} /> Persist evidence</button></div></div><div className="fg-live-assertions">{execution.assertions.map(assertion => <div key={assertion.key} className={`fg-live-assertion ${assertion.status.toLowerCase()}`}><span>{assertion.status === "PASS" ? <Check size={14} /> : assertion.status === "FAIL" ? <X size={14} /> : <CircleDot size={14} />}</span><div><b>{assertion.label}</b><small>{assertion.observed} · span {assertion.spanId}</small></div></div>)}</div></div>}
    <section className="fg-grc-mock"><div className="fg-grc-mock-head"><div><p className="fg-eyebrow">GRC integration boundary</p><h3>Exception and remediation inbox</h3></div><span><ShieldAlert size={15} /> {isAuthenticated ? "database-backed" : "sign in to persist"}</span></div>{!execution && <div className="fg-empty-grc"><ShieldCheck size={21} /><p>Run a trace to create a normalized control execution. Failed or inconclusive evidence can be persisted as a GRC exception; a pass remains an evidence record without an open exception.</p></div>}{execution?.verdict === "PASS" && <div className="fg-empty-grc"><ShieldCheck size={21} /><p><b>No exception required.</b> Persist the passing execution if you need a machine-generated evidence record for your GRC product.</p></div>}{exception && <div className="fg-exception-grid"><div className="fg-exception-summary"><p className="fg-kicker">{exception.displayId} · {exception.severity.toUpperCase()}</p><h4>{execution?.firstFinding?.label ?? "Technical control exception"}</h4><p>{execution?.firstFinding?.detail}</p><div className="fg-exception-status"><span className={exception.status === "Closed" ? "closed" : "open"}>{exception.status}</span><code>{execution?.evidenceHash}</code></div></div><form className="fg-remediation-form" onSubmit={event => { event.preventDefault(); persistException(); }}><label>Control owner<select value={exception.owner} onChange={event => setException({ ...exception, owner: event.target.value })}><option>Platform Engineering</option><option>Application Security</option><option>Risk & Compliance</option></select></label><label>Severity<select value={exception.severity} onChange={event => setException({ ...exception, severity: event.target.value as LocalException["severity"] })}><option>High</option><option>Medium</option><option>Low</option></select></label><label>Due date<input type="date" value={exception.dueDate} onChange={event => setException({ ...exception, dueDate: event.target.value })} /></label><label className="full">Remediation action<textarea value={exception.remediation} onChange={event => setException({ ...exception, remediation: event.target.value })} /></label><div className="fg-remediation-actions"><button className="fg-validate-button" type="submit"><Save size={14} /> {exception.id ? "Save exception" : "Persist execution + exception"}</button><button className="fg-close-button" type="button" onClick={() => setException({ ...exception, status: "Closed" })}><RefreshCw size={14} /> Mark retest closed</button>{!isAuthenticated && <button className="fg-close-button" type="button" onClick={startLogin}><LogIn size={13} /> Sign in to persist</button>}</div></form></div>}{isAuthenticated && <><div className="fg-persistence-ledger"><p><b>{savedContracts.data?.length ?? 0}</b> saved contracts</p><p><b>{savedExceptions.data?.length ?? 0}</b> persisted exceptions</p></div><div className="fg-history-grid"><section><p className="fg-kicker">SAVED CONTRACTS</p>{savedContracts.data?.length ? <ul>{savedContracts.data.map(record => <li key={record.id}><b>{record.controlKey}</b><span>{record.title}</span><small>{record.version} · {new Date(record.updatedAt).toLocaleDateString()}</small></li>)}</ul> : <p className="fg-history-empty">No saved contracts yet.</p>}</section><section><p className="fg-kicker">OPEN AND CLOSED EXCEPTIONS</p>{savedExceptions.data?.length ? <ul>{savedExceptions.data.map(record => <li key={record.id}><b>EXC-{record.id}</b><span>{record.title}</span><small>{record.status.replaceAll("_", " ")} · {record.severity}</small></li>)}</ul> : <p className="fg-history-empty">No persisted exceptions yet.</p>}</section></div></>}</section></section>;
}
