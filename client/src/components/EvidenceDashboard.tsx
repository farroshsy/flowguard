import { Activity, CalendarDays, CircleAlert, FileCheck2, FileDown, FileSpreadsheet, Filter, RotateCcw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { buildEvidenceDashboard, buildRemediationAging, emptyEvidenceFilters, filterEvidence, type EvidenceFilters, type ExceptionRecord, type ExecutionRecord } from "@/lib/evidenceDashboard";

const successConfig = { successRate: { label: "Pass rate", color: "#6fc1b6" } } satisfies ChartConfig;
const exceptionConfig = { linkedExceptions: { label: "Linked exceptions", color: "#d87843" } } satisfies ChartConfig;
const agingConfig = { count: { label: "Open exceptions", color: "#d9b259" } } satisfies ChartConfig;

type EvidenceDashboardProps = {
  executions: ExecutionRecord[];
  exceptions: ExceptionRecord[];
  loading?: boolean;
  onDownloadCsv: (executions: ExecutionRecord[], exceptions: ExceptionRecord[]) => void;
  onDownloadPdf: (executions: ExecutionRecord[], exceptions: ExceptionRecord[]) => void | Promise<void>;
};

export default function EvidenceDashboard({ executions, exceptions, loading = false, onDownloadCsv, onDownloadPdf }: EvidenceDashboardProps) {
  const [filters, setFilters] = useState<EvidenceFilters>(emptyEvidenceFilters);
  const controlKeys = useMemo(() => Array.from(new Set([...executions.map(record => record.controlKey), ...exceptions.map(record => record.controlKey)])).sort(), [executions, exceptions]);
  const filtered = useMemo(() => filterEvidence(executions, exceptions, filters), [executions, exceptions, filters]);
  const summary = useMemo(() => buildEvidenceDashboard(filtered.executions, filtered.exceptions), [filtered]);
  const aging = useMemo(() => buildRemediationAging(filtered.exceptions), [filtered.exceptions]);
  const hasEvidence = summary.totalExecutions > 0 || summary.linkedExceptions > 0;
  const hasActiveFilters = Boolean(filters.startDate || filters.endDate || filters.controlKey || filters.verdict);
  const updateFilter = <Key extends keyof EvidenceFilters>(key: Key, value: EvidenceFilters[Key]) => setFilters(current => ({ ...current, [key]: value }));

  return (
    <section id="evidence-dashboard" className="fg-evidence-dashboard" aria-labelledby="evidence-dashboard-title">
      <div className="fg-dashboard-heading">
        <div>
          <p className="fg-eyebrow">Evidence intelligence</p>
          <h2 id="evidence-dashboard-title">Control posture,<br /><i>over time.</i></h2>
          <p>Charts are calculated only from your saved FlowGuard evidence and its linked GRC exception history.</p>
        </div>
        <div className="fg-report-actions" aria-label="Download filtered evidence reports">
          <button className="fg-validate-button" onClick={() => onDownloadCsv(filtered.executions, filtered.exceptions)} disabled={!hasEvidence || loading}><FileSpreadsheet size={15} /> Download CSV</button>
          <button className="fg-export-button" onClick={() => void onDownloadPdf(filtered.executions, filtered.exceptions)} disabled={!hasEvidence || loading}><FileDown size={15} /> Download PDF</button>
        </div>
      </div>

      <form className="fg-dashboard-filters" onSubmit={event => event.preventDefault()} aria-label="Filter evidence dashboard">
        <div className="fg-filter-heading"><Filter size={15} /><span>Filter saved evidence</span></div>
        <label>From<input type="date" value={filters.startDate} onChange={event => updateFilter("startDate", event.target.value)} /></label>
        <label>To<input type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={event => updateFilter("endDate", event.target.value)} /></label>
        <label>Control<select value={filters.controlKey} onChange={event => updateFilter("controlKey", event.target.value)}><option value="">All controls</option>{controlKeys.map(controlKey => <option key={controlKey} value={controlKey}>{controlKey}</option>)}</select></label>
        <label>Verdict<select value={filters.verdict} onChange={event => updateFilter("verdict", event.target.value as EvidenceFilters["verdict"])}><option value="">All verdicts</option><option value="PASS">Pass</option><option value="FAIL">Fail</option><option value="INCONCLUSIVE">Inconclusive</option></select></label>
        <button className="fg-filter-reset" type="button" onClick={() => setFilters(emptyEvidenceFilters)} disabled={!hasActiveFilters}><RotateCcw size={14} /> Reset</button>
      </form>
      <div className="fg-compliance-export-note"><FileCheck2 size={15} /><p>Each export includes transparent **BI/OJK evidence-reference** and **ISO/IEC 27001:2022 evidence-reference** columns. They are reviewable GRC cross-references, not a certification or legal-compliance conclusion.</p></div>

      <div className="fg-dashboard-kpis" aria-label="Filtered evidence summary">
        <article><Activity size={17} /><span>Executions</span><b>{summary.totalExecutions}</b><small>{hasActiveFilters ? "Matching evidence records" : "Saved evidence records"}</small></article>
        <article><ShieldCheck size={17} /><span>Pass rate</span><b>{summary.successRate}%</b><small>PASS / filtered executions</small></article>
        <article><CircleAlert size={17} /><span>Open exceptions</span><b>{summary.openExceptions}</b><small>{summary.overdueExceptions} overdue items</small></article>
      </div>

      {loading ? <div className="fg-dashboard-empty"><Activity size={20} /><p>Loading your owner-scoped execution history…</p></div> : !hasEvidence ? <div className="fg-dashboard-empty"><ShieldCheck size={20} /><p><b>{hasActiveFilters ? "No evidence matches these filters." : "No saved evidence yet."}</b> {hasActiveFilters ? "Reset or broaden the date, control, or verdict filters to inspect more records." : "Persist a trace execution to populate success-rate and linked-exception trends."}</p></div> : <div className="fg-dashboard-grid">
        <article className="fg-chart-card">
          <div><p className="fg-kicker">EXECUTION QUALITY</p><h3>Success rate by run date</h3></div>
          <ChartContainer config={successConfig} className="fg-chart-container">
            <AreaChart data={summary.timeline} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
              <defs><linearGradient id="fg-success-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-successRate)" stopOpacity={0.42} /><stop offset="100%" stopColor="var(--color-successRate)" stopOpacity={0.03} /></linearGradient></defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={9} />
              <YAxis domain={[0, 100]} tickFormatter={value => `${value}%`} tickLine={false} axisLine={false} tickMargin={6} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area type="monotone" dataKey="successRate" stroke="var(--color-successRate)" strokeWidth={2.5} fill="url(#fg-success-fill)" />
            </AreaChart>
          </ChartContainer>
        </article>
        <article className="fg-chart-card">
          <div><p className="fg-kicker">GRC CASELOAD</p><h3>Linked exceptions by date</h3></div>
          <ChartContainer config={exceptionConfig} className="fg-chart-container">
            <BarChart data={summary.timeline} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={9} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={6} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Bar dataKey="linkedExceptions" fill="var(--color-linkedExceptions)" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ChartContainer>
        </article>
        <article className="fg-chart-card fg-aging-chart">
          <div><p className="fg-kicker"><CalendarDays size={13} /> REMEDIATION AGING</p><h3>Open exceptions by due-date window</h3></div>
          <ChartContainer config={agingConfig} className="fg-chart-container">
            <BarChart data={aging} layout="vertical" margin={{ top: 12, right: 16, left: 30, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis dataKey="bucket" type="category" tickLine={false} axisLine={false} width={82} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        </article>
      </div>}
    </section>
  );
}
