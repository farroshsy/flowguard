/**
 * Assurance Console — FlowGuard's reader-facing demonstration UI.
 * Design philosophy: forensic, calm, exacting; the trace is a narrative and evidence outranks spectacle.
 */
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Braces,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  DatabaseZap,
  FileJson,
  GitBranch,
  Play,
  RotateCcw,
  ShieldCheck,
  TimerReset,
  TriangleAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import LiveTraceStudio from "@/components/LiveTraceStudio";
import { buildGrcExport, evaluateFixture, fixtureOrder, fixtures, type AssertionStatus, type FixtureId, verdictLabel } from "@/lib/flowguard";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

const statusMeta: Record<AssertionStatus, { label: string; icon: typeof Check; className: string }> = {
  PASS: { label: "Verified", icon: Check, className: "is-pass" },
  FAIL: { label: "Failed", icon: X, className: "is-fail" },
  NOT_VERIFIED: { label: "Blocked", icon: CircleDot, className: "is-blocked" },
  INCONCLUSIVE: { label: "Inconclusive", icon: TriangleAlert, className: "is-inconclusive" },
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

export default function Home() {
  const { isAuthenticated, user, loading } = useAuth();
  const [fixtureId, setFixtureId] = useState<FixtureId>("shipping_missing");
  const [runNumber, setRunNumber] = useState(1);
  const [replayActive, setReplayActive] = useState(false);
  const evaluation = useMemo(() => evaluateFixture(fixtureId), [fixtureId, runNumber]);
  const exportPayload = useMemo(() => buildGrcExport(evaluation), [evaluation]);
  const firstIndex = evaluation.firstFinding ? evaluation.assertions.findIndex(item => item.key === evaluation.firstFinding?.key) : -1;

  const runVerification = () => {
    setReplayActive(true);
    window.setTimeout(() => {
      setRunNumber(value => value + 1);
      setReplayActive(false);
    }, 620);
  };

  const activeFixture = fixtures[fixtureId];

  return (
    <div className="fg-shell">
      <header className="fg-topbar">
        <a className="fg-brand" href="#top" aria-label="FlowGuard home">
          <img src="/manus-storage/flowguard-mark_17e798ba.png" alt="" />
          <span>
            <b>FLOWGUARD</b>
            <em>technical control verification</em>
          </span>
        </a>
        <nav className="fg-topnav" aria-label="Primary navigation">
          <a href="#console">Control console</a>
          <a href="#contract">Process contract</a>
          <a href="#handoff">GRC handoff</a>
        </nav>
        {!loading && (isAuthenticated ? <span className="fg-auth-state">{user?.name ?? "Signed in"}</span> : <button className="fg-signin-button" onClick={startLogin}>Sign in to save</button>)}
        <button className="fg-export-button" onClick={() => downloadJson(exportPayload, `flowguard-${evaluation.traceId}.json`)}>
          <ArrowDownToLine size={15} /> Export evidence
        </button>
      </header>

      <main id="top">
        <section className="fg-hero">
          <div className="fg-hero-art" aria-hidden="true" />
          <div className="fg-hero-grid" aria-hidden="true" />
          <div className="fg-hero-copy">
            <p className="fg-chip"><span /> STANDALONE VERIFIER · OTEL DEMO FIXTURE</p>
            <p className="fg-eyebrow">Distributed process assurance</p>
            <h1>A response is not<br />a <i>completed</i> process.</h1>
            <p className="fg-hero-intro">FlowGuard reads a distributed trace as evidence, not decoration. It checks whether a checkout actually reached order, payment, fulfilment, and cart clearance—then isolates the first broken control.</p>
            <div className="fg-hero-actions">
              <button className="fg-primary" onClick={() => document.getElementById("console")?.scrollIntoView({ behavior: "smooth" })}>
                Open control console <ArrowRight size={16} />
              </button>
              <button className="fg-text-action" onClick={() => setFixtureId("payment_failure")}>
                View an injected failure <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <aside className="fg-hero-docket">
            <span>CONTROL / APP-001</span>
            <strong>Critical checkout transaction completeness</strong>
            <p>Every completed checkout must retain one valid trace across all required business steps.</p>
          </aside>
        </section>

        <section className="fg-signal-strip" aria-label="FlowGuard demonstration metrics">
          <div><b>4</b><span>required assertions</span><small>order · payment · shipping · cart</small></div>
          <div><b>1</b><span>first finding</span><small>no noisy cascade of secondary alerts</small></div>
          <div><b>3</b><span>verdict classes</span><small>pass · fail · inconclusive</small></div>
          <div><b>JSON</b><span>handoff ready</span><small>normalized control execution record</small></div>
        </section>

        <section id="console" className="fg-workbench">
          <aside className="fg-rail" aria-label="Control sections">
            <p>CONTROL REVIEW</p>
            {[
              ["01", "Execution"],
              ["02", "Trace path"],
              ["03", "Evidence"],
              ["04", "GRC handoff"],
            ].map(([number, label]) => (
              <a href={`#${label === "Execution" ? "console" : label === "Trace path" ? "trace" : label === "Evidence" ? "contract" : "handoff"}`} key={label}>
                <span>{number}</span>{label}<ChevronRight size={14} />
              </a>
            ))}
            <div className="fg-rail-note">
              <ShieldCheck size={17} />
              <p><b>Conservative verdicts.</b> Missing or disconnected evidence never becomes a pass.</p>
            </div>
          </aside>

          <div className="fg-console-content">
            <section className="fg-section-lead">
              <span>01</span>
              <div>
                <p className="fg-eyebrow">Fixture control execution</p>
                <h2>Run a control.<br /><i>Read the evidence.</i></h2>
              </div>
              <p>Choose a deliberately bounded OpenTelemetry checkout fixture. FlowGuard evaluates a versioned process contract entirely in the browser.</p>
            </section>

            <div className="fg-fixture-board">
              <div className="fg-fixture-picker" role="tablist" aria-label="Demo fixtures">
                {fixtureOrder.map(id => {
                  const fixture = fixtures[id];
                  return <button key={id} className={id === fixtureId ? "active" : ""} onClick={() => { setFixtureId(id); setReplayActive(false); }} role="tab" aria-selected={id === fixtureId}>
                    <span>{fixture.shortLabel}</span>
                    <small>{fixture.category}</small>
                  </button>;
                })}
              </div>
              <div className="fg-fixture-summary">
                <div>
                  <p className="fg-kicker">SELECTED SCENARIO</p>
                  <h3>{activeFixture.label}</h3>
                  <p>{activeFixture.scenario}</p>
                </div>
                <button className="fg-run-button" onClick={runVerification} disabled={replayActive}>
                  {replayActive ? <RotateCcw className="spin" size={16} /> : <Play size={16} fill="currentColor" />} {replayActive ? "Replaying trace…" : "Run verification"}
                </button>
              </div>
            </div>

            <div className={`fg-verdict-panel verdict-${evaluation.verdict.toLowerCase()}`}>
              <div className="fg-verdict-main">
                <div className="fg-verdict-icon">{evaluation.verdict === "PASS" ? <BadgeCheck size={25} /> : evaluation.verdict === "FAIL" ? <TriangleAlert size={25} /> : <CircleDot size={25} />}</div>
                <div>
                  <p className="fg-kicker">CONTROL EXECUTION / {evaluation.controlKey}</p>
                  <h3>{verdictLabel(evaluation.verdict)}</h3>
                  <p>{evaluation.firstFinding ? `${evaluation.firstFinding.label} is the first condition that prevents a verified checkout verdict.` : "All required process conditions are present in a continuous trace."}</p>
                </div>
              </div>
              <dl className="fg-verdict-meta">
                <div><dt>Trace</dt><dd>{evaluation.traceId}</dd></div>
                <div><dt>Duration</dt><dd>{evaluation.durationMs} ms</dd></div>
                <div><dt>Run</dt><dd>#{runNumber.toString().padStart(2, "0")}</dd></div>
              </dl>
            </div>

            <section id="trace" className="fg-trace-section">
              <div className="fg-section-heading">
                <div><p className="fg-eyebrow">02 · Trace path</p><h2>The business workflow, <i>not just the response.</i></h2></div>
                <span><GitBranch size={15} /> canonical trace only</span>
              </div>
              <div className={`fg-trace-canvas ${replayActive ? "is-replaying" : ""}`}>
                <div className="fg-trace-watermark" aria-hidden="true" />
                {evaluation.assertions.map((assertion, index) => {
                  const meta = statusMeta[assertion.status];
                  const Icon = meta.icon;
                  return <div className={`fg-trace-step ${meta.className} ${index === firstIndex ? "is-first-finding" : ""}`} key={assertion.key}>
                    <div className="fg-step-number">0{index + 1}</div>
                    <div className="fg-step-node"><Icon size={16} /></div>
                    <div className="fg-step-copy"><b>{assertion.label}</b><span>{assertion.service}</span></div>
                    {index < evaluation.assertions.length - 1 && <div className="fg-trace-link"><ArrowRight size={15} /></div>}
                  </div>;
                })}
              </div>
              <p className="fg-trace-caption"><CircleDot size={13} /> FlowGuard reports the first hard failure or evidence gap; subsequent steps are retained as context, not promoted to a valid completion state.</p>
            </section>

            <section id="contract" className="fg-evidence-section">
              <div className="fg-section-heading">
                <div><p className="fg-eyebrow">03 · Evidence docket</p><h2>Every verdict has <i>a traceable reason.</i></h2></div>
                <span><FileJson size={15} /> contract: checkout-v1.0.0</span>
              </div>
              <div className="fg-evidence-layout">
                <div className="fg-assertion-table-wrap">
                  <table className="fg-assertion-table">
                    <thead><tr><th>Assertion</th><th>Observed</th><th>Evidence</th><th>Verdict</th></tr></thead>
                    <tbody>
                      {evaluation.assertions.map(assertion => {
                        const meta = statusMeta[assertion.status];
                        const Icon = meta.icon;
                        return <tr key={assertion.key} className={assertion.key === evaluation.firstFinding?.key ? "is-finding" : ""}>
                          <td><b>{assertion.label}</b><small>{assertion.service}/{assertion.operation}</small></td>
                          <td><code>{assertion.observed}</code></td>
                          <td><code>{assertion.spanId}</code></td>
                          <td><span className={`fg-status ${meta.className}`}><Icon size={12} /> {meta.label}</span></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
                <aside className="fg-evidence-card">
                  <img src="/manus-storage/flowguard-evidence_7bafb689.jpg" alt="Abstract visual representation of connected evidence nodes" />
                  <div>
                    <p className="fg-kicker">EVIDENCE INTEGRITY</p>
                    <h3>{evaluation.evidenceHash}</h3>
                    <p>Fixture verdicts are deterministic. This simulated control execution is suitable for a GRC evidence handoff, not a compliance claim.</p>
                  </div>
                </aside>
              </div>
            </section>

            <section id="handoff" className="fg-handoff-section">
              <div className="fg-handoff-copy">
                <p className="fg-eyebrow">04 · GRC-compatible handoff</p>
                <h2>From trace signal<br />to <i>control evidence.</i></h2>
                <p>FlowGuard stays separate from a GRC platform. It exports a normalized execution record that a risk, control, exception, and remediation workflow can consume.</p>
                <div className="fg-handoff-flow">
                  <span>Trace fixture</span><ArrowRight size={15} /><span>Control verdict</span><ArrowRight size={15} /><span>Evidence JSON</span><ArrowRight size={15} /><span>GRC exception</span>
                </div>
                <button className="fg-primary fg-secondary-primary" onClick={() => downloadJson(exportPayload, `flowguard-${evaluation.traceId}.json`)}><FileJson size={16} /> Download control execution</button>
              </div>
              <div className="fg-json-card">
                <div className="fg-json-head"><span><Braces size={15} /> CONTROL EXECUTION</span><small>schema v1</small></div>
                <pre>{JSON.stringify({ controlKey: exportPayload.controlKey, verdict: exportPayload.verdict, traceId: exportPayload.traceId, evidenceHash: exportPayload.evidenceHash, finding: exportPayload.finding }, null, 2)}</pre>
              </div>
            </section>

            <section className="fg-proof-section">
              <div className="fg-proof-image"><img src="/manus-storage/flowguard-replay_5ab29ee7.jpg" alt="Abstract illustration of a replay path with a first failure marker" /></div>
              <div className="fg-proof-copy">
                <p className="fg-eyebrow">A bounded demonstration</p>
                <h2>Replay the fixture.<br />Keep the <i>claim boundary.</i></h2>
                <p>FlowGuard demonstrates a technical-control test over a public distributed checkout example. It does not replace OpenTelemetry, certify an organisation, or prove regulatory compliance from one trace.</p>
                <div className="fg-proof-points"><span><ClipboardCheck size={16} /> Process contract</span><span><TimerReset size={16} /> Deterministic fixture</span><span><DatabaseZap size={16} /> Evidence export</span></div>
              </div>
            </section>

            <LiveTraceStudio />
          </div>
        </section>
      </main>

      <footer className="fg-footer">
        <div className="fg-brand"><img src="/manus-storage/flowguard-mark_17e798ba.png" alt="" /><span><b>FLOWGUARD</b><em>technical control verification</em></span></div>
        <p>Standalone portfolio prototype. OpenTelemetry checkout fixtures are used as a simulated case study and are not live production telemetry.</p>
        <a href="#top">Return to console <ArrowRight size={14} /></a>
      </footer>
    </div>
  );
}
