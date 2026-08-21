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
