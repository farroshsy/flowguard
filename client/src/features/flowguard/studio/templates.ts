export type TraceStudioTemplate = {
  key: "payment" | "access" | "reconciliation";
  title: string;
  controlKey: string;
  domain: string;
  yaml: string;
};

export const traceStudioTemplates: TraceStudioTemplate[] = [
  {
    key: "payment",
    title: "Payment completion",
    controlKey: "CTRL-PAY-001",
    domain: "payment",
    yaml: `process: payment-completion
required:
  - service: orderservice
    operation: CreateOrder
    status: ok
  - service: paymentservice
    operation: Charge
    status: ok
  - service: ledger-service
    operation: RecordSettlement
    status: ok
ordering:
  - [orderservice.CreateOrder, paymentservice.Charge]
  - [paymentservice.Charge, ledger-service.RecordSettlement]
trace:
  require_same_trace_id: true`,
  },
  {
    key: "access",
    title: "Privileged access change",
    controlKey: "CTRL-ACC-001",
    domain: "access-control",
    yaml: `process: privileged-access-change
required:
  - service: identity-service
    operation: RequestPrivilegeChange
    status: ok
  - service: approval-service
    operation: ApprovePrivilegeChange
    status: ok
  - service: directory-service
    operation: ApplyRoleAssignment
    status: ok
  - service: audit-service
    operation: RecordAccessEvent
    status: ok
ordering:
  - [identity-service.RequestPrivilegeChange, approval-service.ApprovePrivilegeChange]
  - [approval-service.ApprovePrivilegeChange, directory-service.ApplyRoleAssignment]
  - [directory-service.ApplyRoleAssignment, audit-service.RecordAccessEvent]
trace:
  require_same_trace_id: true`,
  },
  {
    key: "reconciliation",
    title: "Data reconciliation",
    controlKey: "CTRL-REC-001",
    domain: "data-reconciliation",
    yaml: `process: reconciliation-close
required:
  - service: source-ledger
    operation: ExportDailyBalance
    status: ok
  - service: reconciliation-engine
    operation: CompareBalances
    status: ok
  - service: exception-service
    operation: RecordVariance
    status: ok
  - service: reporting-service
    operation: PublishCloseReport
    status: ok
ordering:
  - [source-ledger.ExportDailyBalance, reconciliation-engine.CompareBalances]
  - [reconciliation-engine.CompareBalances, exception-service.RecordVariance]
  - [exception-service.RecordVariance, reporting-service.PublishCloseReport]
trace:
  require_same_trace_id: true`,
  },
];
