# FlowGuard Import Note for the GRC Portfolio Project

## Objective

Integrate **FlowGuard** as the GRC portfolio’s technical-control-verification module. The combined GRC workflow should be:

```text
Risk → Control → FlowGuard process contract → Trace execution → Evidence → Exception → Remediation → Retest
```

FlowGuard is not a replacement GRC product. It evaluates distributed trace evidence against a YAML process contract and emits an evidence-backed control result.

## Recommended integration approach

Use a **single-product portfolio demo** first. Import the FlowGuard verifier, templates, contract/execution/exception schema, and UI concepts into the GRC project as a named module such as **Technical Control Verification**. Keep the same normalized event boundary so the verifier can later return to a separate service.

## Files to reuse

| FlowGuard path | Bring into GRC project | Purpose |
|---|---|---|
| `client/src/lib/traceIngestion.ts` | Yes | OTLP, Jaeger, and generic JSON export parsing plus conservative contract evaluation. |
| `client/src/lib/flowguard.ts` | Yes | Fixture mode, evidence hash, normalized execution model, and JSON handoff shape. |
| `client/src/components/LiveTraceStudio.tsx` | Adapt | Control templates, YAML editor, trace import, verifier result, persistence actions, and history views. |
| `server/traceProxy.ts` | Yes | Fail-closed, server-side Jaeger/Tempo trace lookup. |
| `server/routers.ts` | Merge procedures | `flowguard` tRPC router for contracts, executions, exceptions, and configured live backends. |
| `server/db.ts` | Merge helpers | Contract, execution, and exception query helpers. |
| `drizzle/schema.ts` | Merge tables | `controlContracts`, `controlExecutions`, and `grcExceptions`. |
| `docs/grc-product-integration.md` | Read first | Field mapping, security boundary, and rollout path. |

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

## Required integration sequence

First merge the schema and apply a migration. Then merge the `flowguard` router and database helpers. Next, add a GRC case-study page that selects one control, imports a trace, runs the YAML contract, and displays the execution evidence. Finally, render a failed outcome in the existing GRC exception/remediation dashboard.

The GRC product should display FlowGuard records as **machine-generated technical evidence**. Preserve `traceId`, `evidenceHash`, `provenanceLabel`, `provenanceSource`, and the first finding. Do not re-label a simulated fixture as live production telemetry.

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

1. Unzip this package beside the GRC project and read this file plus `docs/grc-product-integration.md`.
2. Read the GRC project’s existing schema and identify its control, evidence, issue, remediation, and case-study tables.
3. Merge FlowGuard’s tables and field mappings without duplicating existing GRC entities.
4. Integrate `CTRL-PAY-001` into the Fintech Risk Assessment case study first.
5. Preserve the remaining access-control and reconciliation templates as follow-on GRC automation examples.
6. Test the complete risk-to-retest flow with explicitly labelled simulated data before adding live telemetry.
