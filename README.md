# FlowGuard

> **Technical control verification for distributed business processes.**

FlowGuard evaluates a distributed trace against an explicit YAML process contract and produces evidence-backed control outcomes. It was built as a portfolio-quality technical-control-verification module for financial-services GRC work: a process can respond successfully at an API boundary while still failing to complete payment, fulfilment, audit, or reconciliation obligations downstream.

The application is deliberately usable without external telemetry. Its clearly labelled simulated payment-failure trace demonstrates the complete control-to-exception workflow, while OpenTelemetry, Jaeger, and generic JSON imports remain available for later integration.

![FlowGuard Assurance Console showing the theme toggle and technical-control-verification landing experience](/manus-storage/flowguard-assurance-console_f72f0d11.png)

| Status | Current implementation |
|---|---|
| Product mode | Full-stack React, tRPC, Express, Drizzle ORM, and MySQL/TiDB application |
| Authentication | Manus OAuth guards persisted contracts, executions, exceptions, analytics, and reports |
| Demo mode | Self-contained simulated payment-failure trace; no Jaeger or Tempo required |
| Verification | 22 Vitest assertions cover verifier logic, studio-domain mappings, dashboard data transformations, proxy rules, and router boundaries |
| GRC handoff | See [`HANDOFF-TO-GRC.md`](./HANDOFF-TO-GRC.md) for the clean integration sequence |

## The problem it solves

Traditional monitoring often answers whether a service returned a response. FlowGuard asks whether the **business process actually completed** according to a declared contract. A checkout, for example, can return `200 OK` while a payment is declined, an order is never settled, or fulfilment evidence is absent. FlowGuard makes those gaps inspectable as deterministic assertions and converts failed or inconclusive results into reviewable GRC exceptions.

```text
Risk → Control → YAML process contract → Trace execution
     → Evidence hash + provenance → GRC exception → Remediation → Retest
```

## What FlowGuard includes

| Capability | Implementation |
|---|---|
| Process contracts | Editable YAML contracts with required service operations, statuses, ordering rules, and trace-continuity expectations |
| Trace ingestion | Browser-local import of OTLP resource spans, Jaeger exports, and compatible JSON span arrays |
| Portfolio demo | One-click, clearly labelled simulated payment-failure trace with progress feedback and success/error notifications |
| Reusable templates | Payment completion (`CTRL-PAY-001`), privileged access change (`CTRL-ACC-001`), and data reconciliation (`CTRL-REC-001`) |
| Deterministic verification | Conservative `PASS`, `FAIL`, or `INCONCLUSIVE` outcomes with first finding, assertion detail, evidence hash, and provenance |
| Persistence | Authenticated database storage for contracts, immutable executions, and exception/remediation records |
| Analytics | Owner-scoped Recharts views with text search, date, control-key, and verdict filters; execution success trends; linked-exception trends; and clickable remediation aging |
| Reporting | Filtered CSV and PDF exports containing execution evidence, exception history, and transparent BI/OJK plus ISO/IEC 27001 evidence-reference labels |
| Live telemetry boundary | Optional fail-closed Jaeger/Tempo proxy that keeps endpoint credentials on the server |
| Viewing experience | Persisted light/dark appearance control that preserves the FlowGuard visual system |

## Self-contained demonstration

The recommended portfolio walkthrough does not require a Jaeger or Tempo deployment.

1. Open FlowGuard and select **Sign in to save**.
2. In the trace studio, choose **Payment completion** and click **Load simulated payment failure**.
3. The progress indicator confirms that a **portfolio fixture**, not production telemetry, has been loaded.
4. Optionally click **Validate YAML**, then select **Save contract**.
5. Click **Run trace** to evaluate the fixture. The payment assertion fails, producing an evidence-backed control result.
6. Click **Persist evidence** to save an immutable execution record and create its linked GRC exception.
7. Review saved contracts, exception history, the filtered evidence dashboard, the remediation-aging chart, and the CSV/PDF report actions.

> **Demo integrity:** A simulated trace is deliberately labelled as simulated in the interface and its persisted provenance. It must not be represented as live operational telemetry or as proof of production compliance.

## Architecture

```text
┌──────────────────────────────── Browser ────────────────────────────────┐
│ React UI                                                                  │
│  • feature-oriented trace studio  • YAML contract editor                  │
│  • evidence dashboard • Recharts filters/aging • CSV/PDF downloads        │
└───────────────┬─────────────────────────┬────────────────────────────────┘
                │ tRPC                    │ Browser-local parsing
                ▼                         ▼
┌────────────────────────── Server ───────────────────────────────────────┐
│ Express + tRPC                                                            │
│  • protected persistence procedures • Manus OAuth context                 │
│  • fail-closed Jaeger/Tempo fetch proxy                                   │
└───────────────┬─────────────────────────┬────────────────────────────────┘
                │                         │ optional server-only credentials
                ▼                         ▼
┌──────────────────── Database ────────┐  ┌──── Telemetry backends ───────┐
│ controlContracts                      │  │ Jaeger or Tempo               │
│ controlExecutions                     │  │ only when explicitly enabled  │
│ grcExceptions                         │  └──────────────────────────────┘
└──────────────────────────────────────┘
```

## Architecture decision: modular trace studio

The principal architecture review selected a **feature-oriented studio module** as the highest-value improvement. The verifier and trace-ingestion libraries were already cohesive, deterministic, and testable; the original studio component was the main maintainability hotspot because it combined template data, workflow state, tRPC mutation orchestration, and the complete UI. The refactor preserves the existing public `LiveTraceStudio` import as a compatibility facade while giving new work a clearer feature boundary.

```text
client/src/features/flowguard/studio/
├── templates.ts          Control-template definitions
├── model.ts              Exception draft and database-vocabulary mapping
├── useTraceStudio.ts     Stateful workflow controller and tRPC orchestration
├── TraceStudioView.tsx   Presentation composition and accessible event wiring
└── index.ts              Public feature entry point
```

This layout keeps pure verification in `client/src/lib`, transport and owner-scoped persistence in the server, workflow sequencing in the controller, and visual composition in the view. It adds a few files, but reduces coupling and creates clearer seams for future GRC reuse, test coverage, and evidence-source expansion. The alternatives considered, their trade-offs, and deferred upgrades are recorded in [`docs/architecture-review.md`](./docs/architecture-review.md).

## Control templates

| Control key | Process | Example required sequence |
|---|---|---|
| `CTRL-PAY-001` | Payment completion | Create order → charge payment → record settlement |
| `CTRL-ACC-001` | Privileged access change | Request privilege → approve → apply role → record audit event |
| `CTRL-REC-001` | Data reconciliation | Export balance → compare → record variance → publish close report |

The template is a starting point, not a universal control definition. Adapt service names, operations, permitted statuses, and ordering requirements to the target organization’s actual process and evidence model.

## Data model

| Table | Record type | Primary use |
|---|---|---|
| `controlContracts` | Versioned YAML process contract | Stores the executable technical-control definition, ownership, and domain context |
| `controlExecutions` | Immutable normalized execution | Retains verdict, trace ID, evidence hash, provenance, assertions, first finding, and execution timestamp |
| `grcExceptions` | Technical exception lifecycle | Connects a failed or inconclusive execution to severity, owner, due date, remediation, retest status, and optional GRC reference |

FlowGuard retains normalized execution evidence rather than raw trace-export bytes. A retest should create a new execution record; it should not overwrite the evidence generated by the earlier run.

## Evidence dashboard and reports

The dashboard is driven only by the signed-in user’s persisted FlowGuard records. The filters narrow both the visualization and the exported report.

| Filter or chart | Purpose |
|---|---|
| Date range | Focus an audit period, incident window, or monthly review cycle |
| Evidence search | Find a control key, trace reference, `EXC-#` exception identifier, exception title, owner, or remediation text quickly |
| Control key | Isolate one technical control within a GRC control catalogue |
| Verdict | Compare `PASS`, `FAIL`, and `INCONCLUSIVE` evidence subsets |
| Success-rate timeline | Show the pass rate by execution date |
| Linked-exception timeline | Show when technical evidence created GRC casework |
| Remediation-aging chart | Categorize non-closed exceptions as overdue, due within seven days, due in 8–30 days, due after 30 days, or without a due date; select a chart bar or aging window to inspect the exact matching exception records |

CSV exports are suitable for spreadsheet or GRC-import review. PDF exports provide a readable evidence package including execution identifiers, provenance, exception lifecycle details, and the mapping disclosure.

## BI/OJK and ISO/IEC 27001 evidence references

FlowGuard adds the following reporting fields to each exported execution and exception row:

| Export field | Purpose |
|---|---|
| `bi_ojk_evidence_reference` | Describes how technical-control evidence can be linked to the organization’s approved Bank Indonesia or OJK requirement in its regulatory register |
| `iso_27001_evidence_reference` | Provides a transparent ISO/IEC 27001:2022 Annex A evidence cross-reference appropriate to the control type |
| `mapping_interpretation_note` | States that the mapping is evidence-oriented and reviewable, not a legal conclusion, certification, or claim that a requirement applies |

> **Important boundary:** The GRC regulatory register remains the source of truth for legal applicability and approved obligation IDs. FlowGuard supplies machine-generated evidence that can be attached to the mapped control; it does not replace legal advice, a regulatory assessment, or an ISO certification audit. The OJK regulations catalogue and ISO’s ISO/IEC 27001:2022 standard page are the external references used for the label boundary. [1] [2]

## Local setup

Use a current Node.js LTS release and the project’s pinned pnpm version.

```bash
pnpm install
pnpm dev
```

The application expects the full-stack runtime to provide database and OAuth configuration. In a Manus project, these are injected automatically. For a separate environment, configure the runtime’s database connection and authentication variables before using protected persistence procedures.

| Command | Purpose |
|---|---|
| `pnpm dev` | Run the development server |
| `pnpm test` | Execute the Vitest suite |
| `pnpm check` | Run TypeScript without emitting output |
| `pnpm build` | Build the client and server production bundle |
| `pnpm start` | Run the built production server |
| `pnpm db:push` | Generate and apply database migrations when the schema changes in your deployment environment |

## Optional live telemetry

The demo and imported-trace workflow work without a telemetry backend. When you are ready to retrieve a single trace through the server-side proxy, configure one of the following sets of environment variables:

```text
FLOWGUARD_JAEGER_BASE_URL
FLOWGUARD_JAEGER_API_TOKEN          # optional

FLOWGUARD_TEMPO_BASE_URL
FLOWGUARD_TEMPO_API_TOKEN           # optional
```

The browser submits a trace identifier only. FlowGuard validates the identifier and fails closed when no matching backend is configured. Endpoint URLs and API tokens must remain server-side.

## Security and provenance principles

| Principle | FlowGuard behavior |
|---|---|
| Authentication | Persisted contracts, executions, exceptions, analytics, and report data are owner-scoped through protected tRPC procedures |
| Telemetry credentials | Jaeger/Tempo credentials stay on the server-side proxy and are not exposed to browser code |
| Evidence integrity | Each execution retains its evidence hash, trace identifier, provenance label, provenance source, assertions, and first finding |
| Data minimization | Raw imported trace exports remain in the browser until a user explicitly persists a normalized execution record |
| Fixture integrity | Simulated fixtures are visibly and persistently distinguished from imported or live trace sources |
| Compliance boundary | BI/OJK and ISO labels are cross-references for GRC evidence tracking, not legal, regulatory, or certification conclusions |

## Tests and verification

The current suite contains **22 passing assertions** across verifier behavior, imported-trace parsing, simulated fixtures, studio exception mapping, evidence search and remediation-aging transformations, compliance mapping, router authentication boundaries, and proxy configuration. The application has also been checked on desktop and mobile viewports.

```bash
pnpm test
pnpm check
pnpm build
```

## GRC portfolio integration

FlowGuard is designed to be embedded in a broader financial-services GRC portfolio. The target GRC product should map `controlKey` to its existing control catalogue, attach `controlExecutions` as machine-generated evidence, and use `grcExceptions` as technical input to its remediation workflow.

Read these documents before integrating:

| Document | Use |
|---|---|
| [`HANDOFF-TO-GRC.md`](./HANDOFF-TO-GRC.md) | Clean-source handoff instructions, file reuse matrix, and suggested next-chat sequence |
| [`docs/grc-product-integration.md`](./docs/grc-product-integration.md) | Technical API payload, security boundary, and rollout approach |
| [`docs/compliance-mapping-notes.md`](./docs/compliance-mapping-notes.md) | BI/OJK and ISO/IEC 27001 evidence-reference boundary and sources |
| [`docs/architecture-review.md`](./docs/architecture-review.md) | Principal review, upgrade trade-offs, selected modularization, and deferred scaling decisions |

## Repository map

```text
client/src/lib/flowguard.ts             Core verifier, fixtures, evidence hash, and normalized output
client/src/lib/traceIngestion.ts        OTLP / Jaeger / JSON ingestion and YAML contract parsing
client/src/lib/evidenceDashboard.ts     Filters, analytics, remediation aging, compliance mappings, CSV/PDF reports
client/src/features/flowguard/studio/   Templates, workflow controller, exception model, and studio presentation boundary
client/src/components/LiveTraceStudio.tsx  Compatibility facade for the feature-oriented trace studio
client/src/components/EvidenceDashboard.tsx Filterable Recharts analytics and report controls
client/src/flowguard-theme.css           Appearance-toggle, light-mode, search, and aging-detail styling
server/routers.ts                       tRPC procedures and access boundary
server/traceProxy.ts                    Fail-closed server-side Jaeger/Tempo retrieval proxy
server/db.ts                            Database helpers
drizzle/schema.ts                        Contract, execution, and exception schema
```

## License

MIT. See [`package.json`](./package.json).

## References

[1] [OJK Regulations Catalogue](https://ojk.go.id/en/regulasi/otoritas-jasa-keuangan/peraturan-ojk/default.aspx)

[2] [ISO/IEC 27001:2022 — Information security management systems](https://www.iso.org/standard/27001)
