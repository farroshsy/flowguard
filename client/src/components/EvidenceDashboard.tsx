import { Activity, CircleAlert, FileDown, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { buildEvidenceDashboard, type ExceptionRecord, type ExecutionRecord } from "@/lib/evidenceDashboard";

const successConfig = {
  successRate: { label: "Pass rate", color: "#6fc1b6" },
} satisfies ChartConfig;

const exceptionConfig = {
  linkedExceptions: { label: "Linked exceptions", color: "#d87843" },
} satisfies ChartConfig;

type EvidenceDashboardProps = {
  executions: ExecutionRecord[];
  exceptions: ExceptionRecord[];
  loading?: boolean;
  onDownloadCsv: () => void;
  onDownloadPdf: () => void;
};

export default function EvidenceDashboard({ executions, exceptions, loading = false, onDownloadCsv, onDownloadPdf }: EvidenceDashboardProps) {
  const summary = buildEvidenceDashboard(executions, exceptions);
  const hasEvidence = summary.totalExecutions > 0 || summary.linkedExceptions > 0;

  return (
    <section id="evidence-dashboard" className="fg-evidence-dashboard" aria-labelledby="evidence-dashboard-title">
      <div className="fg-dashboard-heading">
        <div>
          <p className="fg-eyebrow">Evidence intelligence</p>
          <h2 id="evidence-dashboard-title">Control posture,<br /><i>over time.</i></h2>
          <p>Charts are calculated only from your saved FlowGuard evidence and its linked GRC exception history.</p>
        </div>
        <div className="fg-report-actions" aria-label="Download evidence reports">
          <button className="fg-validate-button" onClick={onDownloadCsv} disabled={!hasEvidence || loading}><FileSpreadsheet size={15} /> Download CSV</button>
          <button className="fg-export-button" onClick={onDownloadPdf} disabled={!hasEvidence || loading}><FileDown size={15} /> Download PDF</button>
        </div>
      </div>

      <div className="fg-dashboard-kpis" aria-label="Evidence summary">
        <article><Activity size={17} /><span>Executions</span><b>{summary.totalExecutions}</b><small>Saved evidence records</small></article>
        <article><ShieldCheck size={17} /><span>Pass rate</span><b>{summary.successRate}%</b><small>PASS / all executions</small></article>
        <article><CircleAlert size={17} /><span>Linked exceptions</span><b>{summary.linkedExceptions}</b><small>{summary.openExceptions} open or in remediation</small></article>
      </div>

      {loading ? <div className="fg-dashboard-empty"><Activity size={20} /><p>Loading your owner-scoped execution history…</p></div> : !hasEvidence ? <div className="fg-dashboard-empty"><ShieldCheck size={20} /><p><b>No saved evidence yet.</b> Persist a trace execution to populate success-rate and linked-exception trends.</p></div> : <div className="fg-dashboard-grid">
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
      </div>}
    </section>
  );
}
