# FlowGuard design exploration

## Three directions

### Theme Name: Assurance Console
**Very Brief Intro:** A forensic control room in midnight blue, where trace evidence appears as calm, deliberate instrumentation rather than neon cybersecurity theatre. The feeling is confident, inspectable, and operational.
**Probability:** 0.07

### Theme Name: Paper Trail
**Very Brief Intro:** A warm editorial audit dossier that treats every control verdict as a signed evidence record. The feeling is procedural, human-readable, and quietly authoritative.
**Probability:** 0.04

### Theme Name: Signal Garden
**Very Brief Intro:** A pale, systems-thinking workspace that turns service dependencies into living pathways and focuses on clarity over intensity. The feeling is optimistic, analytical, and accessible.
**Probability:** 0.09

## Chosen approach: Assurance Console

### Design Movement
Contemporary mission-control interfaces blended with the restraint of high-assurance financial infrastructure. It uses the visual language of a forensic operations room rather than cyberpunk or generic SaaS dashboards.

### Core Principles
1. **Evidence before spectacle:** Every colour, connection, and status badge exists to clarify a technical verdict.
2. **Calm severity:** Failure is visible through a warm ember signal, while passing controls use a restrained mineral green.
3. **Trace as narrative:** The event path is the primary composition, with the first broken assertion visually isolated.
4. **Purposeful asymmetry:** A persistent evidence rail and a spacious main console establish a reading hierarchy without a generic centered dashboard.

### Color Philosophy
Near-black midnight and graphite establish focused technical depth. Mineral white and fogged slate provide readable evidence surfaces. Oxidized copper is the signature alert/identity color: it feels like a stamped finding rather than a generic red error. Verdigris is reserved for verified passing states. Text is high-contrast pearl, never low-contrast blue-gray on dark surfaces.

### Layout Paradigm
An asymmetric analyst desk: compact left control rail, broad incident canvas, and a narrow right evidence docket on desktop. On mobile it becomes a linear review sequence: verdict, trace, assertion, evidence, export.

### Signature Elements
1. A “control pulse” mark: three offset signal bars around a central verified dot.
2. Fine-grid trace paper texture within dark surfaces.
3. Copper inline fault marker that isolates the first failing service in a workflow timeline.

### Interaction Philosophy
Interactions feel like reviewing an evidence record. Choosing a fixture changes the verdict instantly; replay animates only the trace path and respects reduced motion; export provides a visible GRC-compatible JSON artifact.

### Animation
Use short 160–240ms ease-out transitions for card focus, state changes, and drawer reveals. Replay progresses a small node pulse across the trace; the failing node settles in copper rather than flashing. Stagger related evidence rows by 40ms. Disable nonessential motion when the operating system requests reduced motion.

### Typography System
Use **Space Grotesk** for technical labels, interface controls, and metrics. Use **DM Serif Display** for the principal verdict and analytical framing. Use **IBM Plex Mono** for trace IDs, span IDs, contracts, and exported evidence. The hierarchy is intentionally editorial: serif decision, sans explanation, mono proof.

### Brand Essence
**FlowGuard makes distributed process controls inspectable, replayable, and ready for GRC evidence.**

Personality: **forensic, calm, exacting.**

### Brand Voice
Headlines are direct and evidence-led; CTAs are operational rather than promotional. Microcopy never claims compliance from a single trace.

Example lines:

> “A response is not a completed process.”

> “Trace the control. Isolate the first failure.”

### Wordmark & Logo
The mark is a bold, text-free signal-gate symbol: three rising vertical segments surrounding a small central aperture, suggesting a protected transaction moving through verified stages. The wordmark pairs the mark with a tightly tracked Space Grotesk label.

### Signature Brand Color
**Oxidized Copper — `#D47A47`**. It is used only for active findings, fault markers, and the core logo signal.

## Style Decisions

- No blue-purple gradients, rounded “pill everywhere” components, or centered-card landing layouts.
- Critical text must remain high-contrast against the dark evidence canvas.
- The interface represents a simulated OpenTelemetry checkout fixture; every verdict is labelled as a demo control execution, not a live compliance attestation.
