# FlowGuard-to-GRC Product Integration

## Purpose

FlowGuard is the **technical-control verification service**. It evaluates a trace against an explicit process contract and records a normalized execution result. The separate GRC product remains the system of record for risks, control ownership, broader evidence, exceptions, remediation, and audit reporting.

> FlowGuard provides machine-generated technical evidence. It does not, by itself, certify compliance or replace a GRC control assessment.

## Integration boundary

| FlowGuard responsibility | GRC product responsibility |
|---|---|
| Store executable YAML process contracts | Map controls to risks, policies, and regulatory requirements |
| Retrieve one configured Jaeger or Tempo trace through the server | Store portfolio-wide control ownership and assessment context |
| Evaluate assertions, ordering, status, and trace continuity | Manage lifecycle, approvals, remediation governance, and reporting |
| Create a normalized `controlExecution` record | Attach the execution as evidence to the mapped GRC control |
| Create or update a technical exception | Assign business ownership, escalation, and closure approval |

## Recommended API contract

The GRC product should accept a server-to-server request after a FlowGuard execution is persisted. The first integration can be pull-based: the GRC product reads FlowGuard records using a service account. The second integration can be push-based: FlowGuard sends a signed webhook after the user enables it.

```json
{
  "event": "flowguard.control_execution.v1",
  "executionId": 42,
  "controlKey": "CTRL-PAY-001",
  "process": "payment-completion",
  "verdict": "FAIL",
  "traceId": "abc123",
  "evidenceHash": "sha256:fg-...",
  "provenance": {
    "label": "Imported Trace Export",
    "source": "jaeger:abc123"
  },
  "finding": {
    "service": "paymentservice",
    "operation": "Charge",
    "status": "FAIL"
  },
  "occurredAt": "2026-08-21T01:00:00.000Z"
}
```

## Field mapping

| FlowGuard field | GRC destination | Rule |
|---|---|---|
| `controlKey` | Control external key | Must match a GRC control key or enter an unmapped queue. |
| `verdict` | Control-test status | Map `PASS` to passed, `FAIL` to exception, and `INCONCLUSIVE` to evidence review. |
| `traceId` and `evidenceHash` | Evidence reference | Preserve both; do not replace the hash with a screen capture. |
| `provenanceLabel` and `provenanceSource` | Source/provenance fields | Retain the imported/exported distinction. |
| `finding` | Exception description | Keep the first finding plus the full assertion set as attachment or linked JSON. |
| `executionId` | External evidence reference | Write back to `externalGrcReference` after the GRC system assigns its own record ID. |

## Rollout sequence

First, configure a non-production Jaeger or Tempo endpoint in FlowGuard and run a template against a known trace. Second, persist one contract, one execution, and one failed exception in FlowGuard. Third, configure the GRC product to ingest the normalized execution JSON and map `CTRL-PAY-001`, `CTRL-ACC-001`, and `CTRL-REC-001` to its own control catalogue. Finally, enable a signed webhook or scheduled pull after the field mapping and duplicate-handling rules are accepted.

## Authentication and data handling

The trace endpoint base URL and token must remain server-side. The browser only submits a trace identifier. For the cross-product handoff, use a dedicated service credential, a tenant identifier, an idempotency key derived from `evidenceHash`, TLS, and an HMAC signature over the serialized JSON. Do not send raw trace exports or secrets to the GRC product unless its evidence-storage policy explicitly permits them.

## Current implementation state

FlowGuard now persists contracts, executions, and exceptions in its own database for authenticated users. Its Jaeger/Tempo proxy is present and fails closed until a server-side endpoint is configured. The direct outbound webhook to the separate GRC product is intentionally not enabled yet because its base URL, authentication method, and accepted schema have not been provided.
