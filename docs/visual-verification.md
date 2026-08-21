# Visual verification notes

The FlowGuard Assurance Console was reviewed on 21 August 2026 at desktop (1280 px) and mobile (375 px) viewport widths.

The authenticated evidence section rendered after the trace studio with its summary metrics, execution-success timeline, linked-exception timeline, and CSV/PDF report controls. On the narrow viewport, the dashboard metrics and charts stacked into a single column with readable controls and no horizontal overflow. The current saved database evidence reflects failed portfolio-fixture executions, so the displayed pass-rate trend correctly shows 0% rather than an artificial success value.

The granular-analysis extension was reviewed at desktop (1280 px) and mobile (375 px) widths. The date, control-key, and verdict filters render above the filtered metrics; the compliance mapping note and downloadable report actions remain visible; and the remediation-aging chart follows the two trend charts. At the mobile breakpoint, filter fields, metrics, and all three charts stack in a single column without horizontal overflow.

The dashboard interaction extension was checked at desktop (1280 px) and mobile (375 px) widths. The persisted appearance control is visible in the header, while the saved-evidence search field, existing filters, report controls, and remediation-aging selector remain legible. On mobile, the header controls compress to icon-oriented actions and the dashboard form, charts, and aging-window controls collapse into a vertical touch-friendly flow without visible clipping.
