# FlowGuard Import Note for the GRC Portfolio Project

## Objective

Integrate **FlowGuard** as the GRC portfolio’s technical-control-verification module. The combined workflow should be:

```text
Risk → Control → FlowGuard process contract → Trace execution → Evidence → Exception → Remediation → Retest
```

FlowGuard is not a replacement GRC product. It evaluates distributed trace evidence against a YAML process contract, emits an evidence-backed control result, and provides an owner-scoped analytics layer for examining that evidence.

## Recommended integration approach

Use a **single-product portfolio demo** first. Import the FlowGuard verifier, templates, contract/execution/exception schema, and UI concepts into the GRC project as a named module such as **Technical Control Verification**. Preserve the normalized event boundary so the verifier can later return to a separate service.

## Files to reuse

| FlowGuard path | Bring into GRC project | Purpose |
|---|---|---|
| `client/src/lib/traceIngestion.ts` | Yes | OTLP, Jaeger, and generic JSON export parsing plus conservative contract evaluation. |
| `client/src/lib/flowguard.ts` | Yes | Fixture mode, evidence hash, normalized execution model, and JSON handoff shape. |
| `client/src/lib/evidenceDashboard.ts` | Yes | Text search; date, control-key, and verdict filtering; dashboard aggregation; remediation-aging buckets and record lookup; CSV/PDF generators; and explicit compliance evidence cross-references. |
| `client/src/components/LiveTraceStudio.tsx` | Adapt | Control templates, YAML editor, trace import, verifier result, persistence actions, and history views. |
| `client/src/components/EvidenceDashboard.tsx` | Adapt | Recharts timelines, text-search and filter controls, report actions, clickable remediation-aging windows, and an accessible exception-detail dialog. |
| `client/src/contexts/ThemeContext.tsx` and `client/src/flowguard-theme.css` | Adapt | Persisted light/dark appearance choice, light-mode surface tokens, and dashboard interaction styling. |
| `README.md` | Read | Portfolio overview, self-contained demonstration, setup and test commands, plus the managed product screenshot. |
| `server/traceProxy.ts` | Yes | Fail-closed, server-side Jaeger/Tempo trace lookup. |
| `server/routers.ts` | Merge procedures | `flowguard` tRPC router for contracts, executions, exceptions, execution history, and configured live backends. |
| `server/db.ts` | Merge helpers | Contract, execution, and exception query helpers. |
| `drizzle/schema.ts` | Merge tables | `controlContracts`, `controlExecutions`, and `grcExceptions`. |
| `docs/grc-product-integration.md` | Read first | Field mapping, security boundary, and rollout path. |
| `docs/compliance-mapping-notes.md` | Read before mapping | Evidence-reference boundary and primary sources for BI/OJK and ISO 27001 labels. |

## Database integration

The three FlowGuard tables have a distinct purpose.

| Table | Role in combined GRC portfolio |
|---|---|
| `controlContracts` | Executable technical-control specifications; link `controlKey` to the GRC control catalogue. |
| `controlExecutions` | Immutable source-linked evidence records. Do not overwrite evidence on retest; create a new execution. |
| `grcExceptions` | Technical exceptions created from failed or inconclusive executions; connect to remediation owner, due date, and retest state. |

Map FlowGuard `controlKey` values to the GRC control identifier rather than creating a parallel control taxonomy. The initial templates are:

| Key | Template | GRC meaning |
|---|---|---|
| `CTRL-PAY-001` | Payment completion | A completed payment flow must produce order, charge, settlement, and evidence in sequence. |
| `CTRL-ACC-001` | Privileged access change | A role change must include request, approval, application, and audit evidence in sequence. |
| `CTRL-REC-001` | Data reconciliation | A close process must export source data, compare balances, record variance, and publish a report in sequence. |

## Analytics and remediation monitoring

The imported dashboard should query the GRC project’s shared evidence and exception records through tRPC, then retain FlowGuard’s interactive analytics capabilities:

| Capability | GRC portfolio use |
|---|---|
| Date-range, control-key, and verdict filters | Isolate a selected test window, control, or `PASS`/`FAIL`/`INCONCLUSIVE` evidence subset without changing source records. |
| Evidence search | Find matching control keys, trace references, `EXC-#` identifiers, exception titles, owners, or remediation text without changing source records. |
| Execution success-rate timeline | Show operating-effectiveness trends from immutable executions. |
| Linked-exception timeline | Show when technical-control failures created GRC casework. |
| Remediation-aging chart and drill-down | Categorize non-closed exceptions as overdue, due within seven days, due in 8–30 days, due after 30 days, or missing a due date; selecting a bar or aging window opens the exact matching exception records. |
| Appearance preference | Preserve the user’s selected light/dark view in local storage while retaining the accessibility and information hierarchy of the assurance console. |

## Compliance evidence mapping boundary

FlowGuard exports now add `bi_ojk_evidence_reference`, `iso_27001_evidence_reference`, and `mapping_interpretation_note` fields to every execution and exception row. The fields map **source evidence**—trace identifier, evidence hash, verdict, ownership, remediation, due date, and retest status—to a reviewable GRC cross-reference. They do **not** determine a regulation’s applicability, issue a legal conclusion, or claim ISO certification.

Use the GRC project’s regulatory register as the source of truth for organization-approved BI/OJK obligation identifiers. In that register, link the FlowGuard row’s `controlKey` to the relevant obligation and preserve the FlowGuard export fields as operating-effectiveness evidence. The OJK regulations catalogue is the primary place to track official OJK publications, while ISO identifies ISO/IEC 27001:2022 as the information-security management system requirements standard. [1] [2]

## Required integration sequence

First merge the schema and apply a migration. Then merge the `flowguard` router and database helpers. Next, add a GRC case-study page that selects one control, imports a trace, runs the YAML contract, and displays the execution evidence. Add the analytics component to the portfolio dashboard and point it to the shared control, evidence, and remediation records. Preserve the text search, visible aging-window drill-down, and persisted light/dark preference. Finally, render a failed outcome in the existing GRC exception/remediation dashboard and test a filtered export.

The GRC product should display FlowGuard records as **machine-generated technical evidence**. Preserve `traceId`, `evidenceHash`, `provenanceLabel`, `provenanceSource`, first finding, exception owner, due date, remediation, and retest status. Do not re-label a simulated fixture as live production telemetry.

## Live tracing boundary

The Jaeger/Tempo proxy is optional. It is disabled until server-side environment variables are configured. Never put a telemetry endpoint token in browser code or a client-side setting.

```text
FLOWGUARD_JAEGER_BASE_URL
FLOWGUARD_JAEGER_API_TOKEN          # optional
FLOWGUARD_TEMPO_BASE_URL
FLOWGUARD_TEMPO_API_TOKEN           # optional
```

The user does not need to configure a backend for the portfolio’s first version. JSON trace upload is sufficient. Add a local Jaeger or Tempo environment only when demonstrating end-to-end live trace retrieval.

## What the next Manus chat should do

1. Unzip this package beside the GRC project and read this file, `docs/grc-product-integration.md`, and `docs/compliance-mapping-notes.md`.
2. Read the GRC project’s schema and identify its control, evidence, issue, remediation, regulatory-register, and case-study tables.
3. Merge FlowGuard’s tables and field mappings without duplicating existing GRC entities.
4. Integrate `CTRL-PAY-001` into the Fintech Risk Assessment case study first.
5. Bring in `EvidenceDashboard.tsx` and map its tRPC inputs to shared records; retain the text search, filter, remediation-aging, and aging-window drill-down logic.
6. Add a GRC regulatory-register mapping layer that assigns approved BI/OJK obligation IDs to the FlowGuard control keys.
7. Enable the existing `ThemeProvider` preference control and retain `flowguard-theme.css` so the shared dashboard supports an accessible persisted light/dark choice.
8. Test the complete risk-to-retest flow, aging-window detail dialog, and filtered CSV/PDF evidence export using explicitly labelled simulated data before adding live telemetry.

## References

[1] [OJK Regulations Catalogue](https://ojk.go.id/en/regulasi/otoritas-jasa-keuangan/peraturan-ojk/default.aspx)

[2] [ISO/IEC 27001:2022 — Information security management systems](https://www.iso.org/standard/27001)
