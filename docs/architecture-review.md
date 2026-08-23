# FlowGuard Architecture Review and Upgrade Decision

**Decision status:** Accepted and implemented in this release  
**Decision owner:** FlowGuard engineering  
**Scope:** Standalone FlowGuard portfolio application and future GRC-module reuse

## Executive assessment

FlowGuard has a sound product and security foundation. Its strongest properties are the separation between deterministic verification logic and user interface code, a server-side telemetry credential boundary, owner-scoped persistence, conservative result semantics, and a self-contained simulated demonstration path. The code is already credible for a portfolio application because it uses typed tRPC contracts, Drizzle persistence, Vitest coverage, and explicit provenance labels.

The primary maintainability risk is not the verifier. The verifier and trace-ingestion modules are mostly pure and already testable. The risk is the original `LiveTraceStudio.tsx`: one component owned templates, workflow state, trace acquisition, contract validation, execution, persistence, reporting, and every studio panel. This made a change to one capability unnecessarily likely to affect unrelated controls, and made isolated interaction testing harder.

## What is working well

| Area | Assessment | Why it should be preserved |
|---|---|---|
| Verification domain | Strong | `flowguard.ts` and `traceIngestion.ts` keep deterministic parsing and control evaluation outside the UI. |
| Security boundary | Strong | Jaeger and Tempo credentials stay in the server-side proxy and fail closed when no safe endpoint is configured. |
| Persistence boundary | Good | tRPC procedures use authenticated owner context; database updates scope exceptions by owner. |
| Evidence semantics | Strong | The product distinguishes live input, imported input, and simulation; it avoids representing fixture output as production telemetry. |
| Demonstrability | Strong | The simulated payment failure exercises contract, execution, evidence, exception, remediation, history, analytics, and export without external infrastructure. |

## Risks and weaknesses found

| Area | Current weakness | Consequence if left unchanged |
|---|---|---|
| Studio composition | Acquisition, YAML editing, execution, persistence, and remediation UI are coupled in one large component. | High regression risk and slow feature delivery as new controls, evidence sources, or remediation fields are added. |
| Workflow orchestration | UI event handlers contain business sequencing, mutation invalidation, and transient user messaging. | Logic is difficult to reason about and lacks a focused test seam. |
| Feature discoverability | Studio-specific templates and local exception mapping are not in a feature directory. | A GRC project cannot easily identify the reusable studio boundary. |
| Documentation drift | Architecture documentation can diverge from the actual folder layout after a refactor. | The handoff becomes less useful to another engineer or portfolio reviewer. |

## Upgrade options considered

| Option | Advantages | Disadvantages | Decision |
|---|---|---|---|
| **A. Keep the existing structure and add comments** | Lowest short-term cost; no move risk. | Does not create test seams or improve reuse; comments cannot reduce coupling. | Rejected. |
| **B. Extract only the server `flowguard` router** | Improves server discoverability; small, low-risk change. | The router is currently small; it does not address the principal maintainability hotspot in the studio. | Deferred. |
| **C. Introduce a client feature module with a workflow controller and focused panels** | Separates domain templates, stateful use cases, and visual panels; supports focused tests; makes GRC reuse explicit; preserves public behavior. | More files and prop contracts; requires disciplined boundaries to avoid a new “god hook.” | **Selected.** |
| **D. Rewrite the studio around a full finite-state-machine framework** | Strong lifecycle modeling and future workflow expansion. | Adds a dependency and conceptual overhead disproportionate to the current single-page portfolio scope; migration risk is higher. | Deferred until concurrent workflow requirements exist. |
| **E. Split every domain module into micro-files** | Very granular ownership. | Creates navigation overhead without measurable benefit for the cohesive verifier and ingestion modules. | Rejected. |

## Selected upgrade

The benefit of **Option C** outweighs its cost. The refactor creates `client/src/features/flowguard/studio/` as the reusable feature boundary:

```text
features/flowguard/studio/
├── templates.ts              # reusable control templates and stable domain labels
├── model.ts                  # local studio exception model and database mapping
├── useTraceStudio.ts         # stateful workflow controller and tRPC orchestration
├── TraceStudioView.tsx       # acquisition, contract, execution, and inbox presentation
└── index.ts                  # public feature entry point
```

The existing `client/src/components/LiveTraceStudio.tsx` becomes a compatibility facade. Existing page imports remain valid, while future work should import the feature entry point directly. The controller is responsible for state transitions and persistence orchestration. The presentation view renders state and invokes callbacks but does not call tRPC or construct database payloads.

## Boundaries after the upgrade

| Layer | Owns | Must not own |
|---|---|---|
| `lib/flowguard.ts`, `lib/traceIngestion.ts` | Pure verification, trace parsing, evidence construction | React state, transport, database mutation |
| `features/flowguard/studio/templates.ts` and `model.ts` | Reusable studio defaults and mapping helpers | API calls or rendering |
| `useTraceStudio.ts` | Workflow state, tRPC mutation/query orchestration, cache invalidation, user feedback | Structural page layout or visual styling |
| `TraceStudioView.tsx` | Accessible UI composition and callback wiring | Direct database access, telemetry credentials, domain persistence rules |
| `server/routers.ts` and `server/db.ts` | Authenticated API boundary and owner-scoped storage | Browser-only parsing or presentation logic |

## Consequences and guardrails

The new module adds more files, but each has a single reason to change. This is a net reduction in cognitive load because an engineer can now change templates, workflow behavior, or visual layout independently. The controller remains intentionally small enough to avoid becoming a second monolith. New capabilities should follow these rules:

1. Add verifier semantics to a pure `lib` module and test them without React.
2. Add persisted data through a tRPC procedure and owner-scoped database helper.
3. Add studio workflow transitions to `useTraceStudio.ts`.
4. Add visual controls to a focused panel rather than putting transport code in JSX.
5. Preserve provenance labels whenever a new source type is introduced.

## Validation evidence

The modularization retained the public `LiveTraceStudio` component import so that the page composition did not need a breaking change. The feature module is covered by focused tests for template parsing, trace-continuity expectations, exception-draft construction, database vocabulary mapping, and protected tRPC persistence boundaries. The complete suite has **24 passing assertions**; TypeScript type checking and the production build also pass. A post-refactor desktop review confirmed that the trace studio, evidence dashboard, and GRC exception workflow still render together in the existing assurance-console layout.

## Deferred upgrades

The following upgrades have positive future value but do not yet justify their complexity: extracting the small server router into a dedicated module, background evaluation queues for high-volume telemetry, role-specific evidence views, a formal state-machine runtime, and event-sourced evidence revision history. Reassess them when FlowGuard has multiple routes, concurrent users, high-volume telemetry, or an independently deployed verifier service.
