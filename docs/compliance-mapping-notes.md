# Compliance mapping notes

FlowGuard’s export mappings are **evidence-reference labels**, not a legal conclusion, certification decision, or complete regulatory assessment. A portfolio user must validate applicability, exact obligations, and current versioning with the relevant regulated entity and qualified compliance counsel.

| Framework reference | Export use in FlowGuard | Primary source |
|---|---|---|
| BI/OJK financial-services control evidence | Identifies technical-control execution, trace provenance, exception ownership, remediation, and retest evidence that can be linked to the user’s selected Bank Indonesia or OJK obligation in their GRC register. The export does not assert a particular regulation applies to every organization. | [OJK regulations catalogue](https://ojk.go.id/en/regulasi/otoritas-jasa-keuangan/peraturan-ojk/default.aspx) |
| ISO/IEC 27001:2022 | References an ISMS evidence record for operating effectiveness, event logging, access-control-related operations, and information-security incident/exception follow-up. The output uses a transparent cross-reference label, not an ISO certification claim. | [ISO/IEC 27001:2022](https://www.iso.org/standard/27001) |

The dashboard and report model will preserve the original control key, execution verdict, trace and evidence hash, exception lifecycle, remediation, and retest status. These are the source facts; the framework reference remains an explicit, reviewable mapping layer.
