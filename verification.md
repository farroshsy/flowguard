# Browser verification notes

## 2026-08-21

- Desktop browser smoke check loaded the FlowGuard route successfully with no rendering failure.
- The rendered page exposed the expected navigation, fixture selectors, control console, evidence table, GRC handoff, and export controls.
- The initial state correctly showed the explicitly labelled simulated **Missing fulfilment evidence** scenario with a failed `shipment-created` assertion and trace-linked JSON preview.
- Desktop and mobile full-page screenshots were captured. The mobile layout reflowed the fixture controls, workflow steps, evidence section, handoff JSON, and footer without visible clipping.
- The visual review assessed the Assurance Console design as aligned with the intended forensic, calm, exacting direction and did not require a visual revision.
- The payment-failure selector was exercised in the browser. After the client state update completed, the selected tab, scenario text, and trace identifier correctly changed to the injected payment-failure fixture (`184cd912ab6a4f83`).
- The extended console rendered the new browser-local trace import, editable YAML contract, and mock GRC inbox surfaces. A generic OpenTelemetry-compatible JSON span export was loaded through the file-input path as `live-checkout-export.json` for the next execution test.
- The imported trace was parsed as four generic JSON spans with trace ID `live-checkout-001`. Running the editable checkout contract produced a failed payment assertion, generated a local mock exception (`EXC-LIVE-CHE…`), and exposed the GRC-compatible execution result.
- The mock remediation action was saved locally and the exception was transitioned to `Closed`, confirming the browser-local exception and remediation workflow works end to end.
- Desktop and mobile full-page visual checks were repeated after the extension. The live-trace upload cards, YAML editor, execution results, and GRC exception/remediation layout remain legible without visible clipping; the visual review continued to find the Assurance Console direction suitable for delivery.
- After the full-stack upgrade, the browser rendered all three reusable templates, the Jaeger/Tempo proxy status surface, and the sign-in-aware persistence boundary. A direct client interaction confirmed that selecting the privileged access template replaces the editor with the `privileged-access-change` YAML contract and labels it `CTRL-ACC-001.yaml`.
- Desktop and mobile full-page checks confirmed that the control-template strip, the server-proxy status card, YAML editor actions, and persistence boundary fit the Assurance Console visual system and reflow without clipping. The independent desktop review recommended preserving the current visual direction without changes.
