# FlowGuard extension checklist

- [x] Define the supported OpenTelemetry/Jaeger export shapes and conservative parsing rules.
- [x] Add real trace-export upload with clear live versus simulated provenance labels.
- [x] Implement trace-to-control evaluation against required service operations and statuses.
- [x] Add an editable YAML process-contract panel with parse validation and contract execution.
- [x] Retain fixture scenarios as a transparent fallback and regression harness.
- [x] Add a mock GRC integration inbox that turns failed or inconclusive executions into exceptions.
- [x] Add an exception detail view with owner, severity, remediation, due date, and retest status.
- [x] Expand verifier tests for imported traces, malformed contracts, and mock-GRC state transitions.
- [x] Run type checks, builds, browser interaction tests, desktop/mobile screenshots, and save a checkpoint.

## Connected control platform extension

- [x] Inspect the enabled full-stack capability, current database schema, and available external integration configuration.
- [x] Add payment completion, privileged access-change, and data-reconciliation YAML contract templates to the interface.
- [x] Add a server-side Jaeger/Tempo retrieval proxy that accepts only configured, validated endpoints and never exposes credentials to the browser.
- [x] Persist process contracts and GRC exceptions with provenance, evidence hashes, owner, severity, due date, remediation, and retest status.
- [x] Add database-backed saved-contract and exception history views to the FlowGuard interface.
- [x] Document the JSON/API mapping, authentication boundary, field mapping, and rollout sequence for the separate GRC product.
- [x] Run an authenticated end-to-end persistence test that saves a contract, execution, and exception; verify the records appear in the history views; then checkpoint the connected release.

## GRC handoff package

- [x] Add a clearly visible sign-in action in the FlowGuard header and live-trace workspace.
- [x] Diagnose and correct the OAuth callback failure for the visible sign-in actions.
- [x] Add a clearly labelled one-click simulated trace loader for contract-to-exception demonstration without external telemetry.
- [x] Write a concise import note for the separate GRC project chat, including files to reuse, database tables, and integration sequence.
- [x] Create a clean source ZIP excluding dependencies, local build artifacts, and transient logs.
- [x] Save a connected-control checkpoint and deliver the ZIP, import note, and checkpoint reference.

## Evidence dashboard and reporting extension

- [x] Add authenticated dashboard data for execution verdicts and linked GRC exceptions grouped over time.
- [x] Build Recharts success-rate and linked-exception-over-time visualizations using saved FlowGuard records.
- [x] Add a simulated-trace loading progress indicator plus clear success and error toast feedback.
- [x] Add downloadable CSV reports for execution evidence and GRC exception history.
- [x] Add a downloadable PDF report containing the same execution evidence and exception history.
- [x] Write tests, verify desktop and mobile rendering, and save a checkpoint for the enhancement.

## Granular analysis and compliance export extension

- [x] Add date-range, control-key, and verdict filters that recalculate dashboard metrics and charts from owner-scoped evidence.
- [x] Add a remediation-aging chart based on exception due dates, including overdue and upcoming categories.
- [x] Map exported execution and exception fields to transparent BI/OJK and ISO 27001 evidence-reference columns.
- [x] Update CSV and PDF exports with the compliance evidence mappings and an interpretation note.
- [x] Write tests, verify responsive filter and chart behavior, and save a checkpoint for the extension.
