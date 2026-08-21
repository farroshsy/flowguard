/**
 * Assurance Console — local trace studio keeps real exports and editable contracts under the user's control.
 * It separates imported technical evidence from the deliberately simulated fixture controls above.
 */
import { AlertTriangle, ArrowDownToLine, Check, ChevronDown, CircleDot, FileJson, FileUp, Network, Play, RefreshCw, ShieldAlert, ShieldCheck, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { buildGrcExport, type ControlExecution } from "@/lib/flowguard";
import { evaluateImportedTrace, parseProcessContract, parseTraceExport, type ImportedTrace, type ProcessContract } from "@/lib/traceIngestion";

const defaultContract = `process: checkout
required:
  - service: checkoutservice
    operation: PlaceOrder
    status: ok
  - service: paymentservice
    operation: Charge
    status: ok
  - service: shippingservice
    operation: ShipOrder
    status: ok
  - service: cartservice
    operation: EmptyCart
    status: ok
ordering:
  - [checkoutservice.PlaceOrder, paymentservice.Charge]
  - [paymentservice.Charge, shippingservice.ShipOrder]
  - [shippingservice.ShipOrder, cartservice.EmptyCart]
trace:
  require_same_trace_id: true`;

type MockException = {
  id: string;
  status: "Open" | "In remediation" | "Closed";
  severity: "High" | "Medium" | "Low";
  owner: string;
  dueDate: string;
  remediation: string;
};

function downloadJson(payload: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function LiveTraceStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [contractYaml, setContractYaml] = useState(defaultContract);
  const [trace, setTrace] = useState<ImportedTrace | null>(null);
  const [contract, setContract] = useState<ProcessContract | null>(null);
  const [execution, setExecution] = useState<ControlExecution | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exception, setException] = useState<MockException | null>(null);
  const [saved, setSaved] = useState(false);

  const exportPayload = useMemo(() => execution ? buildGrcExport(execution) : null, [execution]);

  const validateContract = () => {
    try {
      const parsed = parseProcessContract(contractYaml);
      setContract(parsed);
      setError(null);
      setMessage(`Contract valid: ${parsed.process} with ${parsed.required.length} required assertions.`);
      return parsed;
    } catch (parseError) {
      setContract(null);
      setError(parseError instanceof Error ? parseError.message : "Contract validation failed.");
      setMessage(null);
      return null;
    }
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const imported = parseTraceExport(raw, file.name);
      setTrace(imported);
      setExecution(null);
      setException(null);
      setError(null);
      setMessage(`${imported.spans.length} spans imported locally from ${file.name}. Detected ${imported.sourceShape}.`);
    } catch (uploadError) {
      setTrace(null);
      setExecution(null);
      setError(uploadError instanceof Error ? uploadError.message : "Trace import failed.");
      setMessage(null);
    }
  };

  const execute = () => {
    const activeContract = contract ?? validateContract();
    if (!activeContract || !trace) {
      if (!trace) setError("Import an OpenTelemetry or Jaeger JSON trace export before running the contract.");
      return;
    }
    const result = evaluateImportedTrace(trace, activeContract);
    setExecution(result);
    setSaved(false);
    setError(null);
    setMessage(`Control execution completed: ${result.verdict}.`);
    if (result.verdict === "PASS") {
      setException(null);
    } else {
      setException({
        id: `EXC-${result.traceId.slice(0, 8).toUpperCase()}`,
        status: "Open",
        severity: result.verdict === "FAIL" ? "High" : "Medium",
        owner: "Platform Engineering",
        dueDate: "2026-08-28",
        remediation: result.firstFinding ? `Investigate ${result.firstFinding.service}/${result.firstFinding.operation}; attach a retest after the evidence gap or control failure is resolved.` : "Investigate imported control result.",
      });
    }
  };

  return <section id="live-studio" className="fg-live-studio">
    <div className="fg-section-heading">
      <div><p className="fg-eyebrow">Live trace and contract studio</p><h2>Bring your own trace.<br /><i>Keep your own evidence.</i></h2></div>
      <span><Network size={15} /> browser-local import only</span>
    </div>
    <p className="fg-live-intro">Upload an OpenTelemetry OTLP JSON export, Jaeger JSON export, or compatible JSON span list. FlowGuard reads the file in this browser session only; it does not transmit, retain, or treat the imported data as a compliance attestation.</p>

    <div className="fg-live-grid">
      <section className="fg-upload-card">
        <div className="fg-card-icon"><FileUp size={19} /></div>
        <p className="fg-kicker">01 · IMPORT REAL TELEMETRY</p>
        <h3>{trace ? trace.sourceName : "Trace export not loaded"}</h3>
        <p>{trace ? `${trace.spans.length} spans · ${trace.sourceShape} · trace ${trace.traceId}` : "Supported shapes: OTLP resourceSpans, Jaeger data[].spans, or a generic JSON spans array."}</p>
        <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json,.jsonl" onChange={event => handleUpload(event.target.files?.[0])} />
        <button className="fg-upload-button" onClick={() => inputRef.current?.click()}><Upload size={15} /> {trace ? "Replace trace export" : "Upload trace export"}</button>
      </section>
      <section className="fg-contract-card">
        <div className="fg-card-icon"><FileJson size={19} /></div>
        <p className="fg-kicker">02 · EDITABLE YAML CONTRACT</p>
        <h3>{contract ? `${contract.process} contract is valid` : "Define the expected process"}</h3>
        <p>Required operations become evidence assertions; ordering and same-trace checks remain conservative.</p>
        <button className="fg-validate-button" onClick={validateContract}><Check size={15} /> Validate YAML</button>
      </section>
    </div>

    <div className="fg-contract-editor-wrap">
      <div className="fg-editor-head"><span><FileJson size={14} /> process-contract.yaml</span><span>YAML · editable in browser</span></div>
      <textarea aria-label="Editable YAML process contract" value={contractYaml} onChange={event => { setContractYaml(event.target.value); setContract(null); setSaved(false); }} spellCheck={false} />
      <div className="fg-editor-actions">
        <div className={error ? "fg-studio-message is-error" : message ? "fg-studio-message" : "fg-studio-message muted"}>{error ? <AlertTriangle size={14} /> : message ? <Check size={14} /> : <CircleDot size={14} />}{error ?? message ?? "Validate the contract, then run it against an imported trace."}</div>
        <button className="fg-run-button" onClick={execute}><Play size={15} fill="currentColor" /> Run imported trace</button>
      </div>
    </div>

    {execution && <div className={`fg-live-result ${execution.verdict === "PASS" ? "is-pass" : execution.verdict === "FAIL" ? "is-fail" : "is-inconclusive"}`}>
      <div className="fg-live-result-head"><div><p className="fg-kicker">IMPORTED TRACE EXECUTION</p><h3>{execution.verdict === "PASS" ? "Control verified" : execution.verdict === "FAIL" ? "Control exception created" : "Evidence requires review"}</h3><p>{execution.firstFinding ? execution.firstFinding.detail : "All assertions in the selected process contract passed."}</p></div><button className="fg-export-button" onClick={() => exportPayload && downloadJson(exportPayload, `flowguard-import-${execution.traceId}.json`)}><ArrowDownToLine size={15} /> Export JSON</button></div>
      <div className="fg-live-assertions">{execution.assertions.map(assertion => <div key={assertion.key} className={`fg-live-assertion ${assertion.status.toLowerCase()}`}><span>{assertion.status === "PASS" ? <Check size={14} /> : assertion.status === "FAIL" ? <X size={14} /> : <CircleDot size={14} />}</span><div><b>{assertion.label}</b><small>{assertion.observed} · span {assertion.spanId}</small></div></div>)}</div>
    </div>}

    <section className="fg-grc-mock">
      <div className="fg-grc-mock-head"><div><p className="fg-eyebrow">Mock GRC integration</p><h3>Exception and remediation inbox</h3></div><span><ShieldAlert size={15} /> local integration model</span></div>
      {!execution && <div className="fg-empty-grc"><ShieldCheck size={21} /><p>Run an imported trace to create a mock control execution. A failed or inconclusive result becomes a local GRC exception; a pass remains an evidence record without an open exception.</p></div>}
      {execution?.verdict === "PASS" && <div className="fg-empty-grc"><ShieldCheck size={21} /><p><b>No exception created.</b> The imported execution passed the contract. The JSON export is still available as a machine-generated evidence record.</p></div>}
      {exception && <div className="fg-exception-grid">
        <div className="fg-exception-summary"><p className="fg-kicker">{exception.id} · {exception.severity.toUpperCase()}</p><h4>{execution?.firstFinding?.label ?? "Technical control exception"}</h4><p>{execution?.firstFinding?.detail}</p><div className="fg-exception-status"><span className={exception.status === "Closed" ? "closed" : "open"}>{exception.status}</span><code>{execution?.evidenceHash}</code></div></div>
        <form className="fg-remediation-form" onSubmit={event => { event.preventDefault(); setSaved(true); }}>
          <label>Control owner<select value={exception.owner} onChange={event => setException({ ...exception, owner: event.target.value })}><option>Platform Engineering</option><option>Application Security</option><option>Risk & Compliance</option></select></label>
          <label>Severity<select value={exception.severity} onChange={event => setException({ ...exception, severity: event.target.value as MockException["severity"] })}><option>High</option><option>Medium</option><option>Low</option></select></label>
          <label>Due date<input type="date" value={exception.dueDate} onChange={event => setException({ ...exception, dueDate: event.target.value })} /></label>
          <label className="full">Remediation action<textarea value={exception.remediation} onChange={event => setException({ ...exception, remediation: event.target.value })} /></label>
          <div className="fg-remediation-actions"><button className="fg-validate-button" type="submit"><Check size={14} /> Save mock remediation</button><button className="fg-close-button" type="button" onClick={() => setException({ ...exception, status: "Closed" })}><RefreshCw size={14} /> Mark retest closed</button>{saved && <span>Saved locally</span>}</div>
        </form>
      </div>}
    </section>
  </section>;
}
