---
name: SupportSphere Command Desk
source:
  upstream: "https://designmd.ai/frknaykc/command-center"
  upstreamName: "Evreghen Command Center"
  upstreamLicense: "MIT"
  adaptation: "Original SupportSphere adaptation; do not copy upstream implementation verbatim."
colors:
  brand-50: "#F0F9FF"
  brand-100: "#E0F2FE"
  brand-500: "#0EA5E9"
  brand-600: "#0284C7"
  brand-700: "#0369A1"
  ink-950: "#0B0F14"
  ink-900: "#111827"
  ink-700: "#334155"
  ink-500: "#64748B"
  canvas: "#F7F7F5"
  surface: "#FFFFFF"
  surface-muted: "#F1F5F9"
  border: "#E2E8F0"
  success: "#15803D"
  warning: "#B45309"
  danger: "#B91C1C"
  info: "#0369A1"
  focus: "#38BDF8"
typography:
  display:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 5.25rem)"
    fontWeight: 650
    lineHeight: 0.98
    letterSpacing: "-0.045em"
  h1:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 650
    lineHeight: 1.05
  h2:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.65rem, 3vw, 2.5rem)"
    fontWeight: 620
    lineHeight: 1.12
  body:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 560
    lineHeight: 1.3
spacing:
  base: "4px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
  4xl: "64px"
radius:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "9999px"
components:
  button-primary:
    height: "40px"
    backgroundColor: "{colors.ink-950}"
    textColor: "#FFFFFF"
    rounded: "12px"
  button-secondary:
    height: "40px"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-900}"
    borderColor: "{colors.border}"
    rounded: "12px"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "16px"
  shell:
    backgroundColor: "{colors.ink-950}"
    textColor: "#FFFFFF"
    rounded: "20px"
---

# Overview

SupportSphere should feel like a calm premium support command desk: approachable enough for customer service, disciplined enough for incident handling, and polished enough to look like a funded SaaS product.

The upstream DesignMD reference is **Command Center**. Retain the powerful split personality: darker application chrome around a bright, highly readable operational workspace. SupportSphere changes the visual signal from security-oriented orange to restrained sky/cyan associated with communication, clarity, and assistance.

The interface must not look like a generic AI-generated dashboard made of identical gradient cards.

Hierarchy:

1. marketing: airy, editorial, confident;
2. application chrome: dark, compact, navigational;
3. support workspace: light, quiet, data-dense;
4. AI: subtle signal/glow/trace, not rainbow gradients;
5. risk/status: semantic color plus text/icon.

---

# Colors

## Brand

Sky/cyan is the active support signal.

Use for:

- active navigation/detail,
- focus,
- links,
- small AI accents,
- selected charts,
- routing/workflow highlights.

Do not make whole screens blue.

## Ink

Near-black provides premium shell/chrome and strong typographic hierarchy.

## Canvas

Use warm-light neutral canvas rather than sterile gray.

## Semantic colors

Success/warning/danger always pair with icon/text. Color must never be the sole meaning.

## Dark mode

A full dark workspace is optional, not required for the first release. Do not add a theme toggle unless both modes are finished. The app shell is intentionally dark while the main workspace remains light.

---

# Typography

Prefer Geist if practical and reliable. Fall back to Inter/system sans.

Principles:

- display typography is for marketing, not dense operations,
- app pages optimize scanning speed,
- sentence-case labels,
- uppercase only for tiny telemetry/status when justified,
- monospace only for IDs, code, traces, request IDs,
- do not shrink table text just to force desktop density.

---

# Layout

## Marketing

Max content width around 1200–1280px.

Hero requires:

- clear product value,
- short supporting statement,
- primary CTA,
- secondary CTA when useful,
- interactive product visualization above/beside the fold.

Do not build a giant empty hero that hides product proof below multiple screens.

Section patterns:

- editorial text + product panel,
- workflow demonstrations,
- product feature details,
- security proof,
- integration proof,
- pricing/FAQ/CTA.

## Desktop app

Dark sidebar/application frame around light operational workspace.

Typical proportions:

- sidebar ~240–272px expanded,
- compact contextual header/tool row,
- fluid main workspace,
- optional right inspector for customer/AI evidence.

Inbox can use three logical panes:

1. conversation list,
2. conversation thread,
3. customer/AI inspector.

At medium width, inspector becomes a drawer. On mobile, these become navigable screens/sheets rather than squashed columns.

## Spacing

4px base rhythm.

- dense app internals: 8–12px common gaps,
- normal app cards: 16–24px,
- marketing: larger section rhythm.

---

# Elevation & depth

1. Canvas: no shadow.
2. Card: border + extremely subtle shadow.
3. Raised popover: stronger but restrained shadow.
4. Dialog: overlay + clear elevation.
5. AI active signal: subtle cyan glow, sparingly.

Blur/frost may appear in dark shell/navigation overlays but not on every surface.

---

# Shapes

- controls: 8–12px radius,
- operational cards: 12–16px,
- marketing visual frames: 20–28px,
- pills only for tags/status/compact segmented data.

Avoid turning all buttons into pills.

---

# Components

## Marketing header

- logo left and clickable,
- concise nav,
- login + primary CTA,
- mobile menu under appropriate breakpoint,
- sticky state may add subtle blur/background after scroll.

## App sidebar

- dark shell,
- logo clickable,
- grouped navigation,
- real counts only,
- clear active state,
- settings/account at bottom,
- mobile sheet/drawer.

Motion Primitives Animated Background can highlight active nav if semantics remain clear.

## Buttons

Primary:

- near-black or brand according to context,
- clear hover/pressed/focus,
- loading state preserves width,
- destructive actions use explicit danger treatment and confirmation.

Motion Primitives Magnetic may be used only on marketing hero CTA for pointer devices and never as a required interaction.

## Inputs

- visible labels,
- standard 40–44px height,
- mobile-safe font sizing,
- field error directly associated,
- strong focus ring.

## Cards

Every card must justify itself as:

- operational grouping,
- actionable config,
- content/evidence,
- real metric.

Avoid “dashboard confetti” where every datum lives in a separate colorful card.

## Tables

- clear alignment,
- accessible sort state,
- sticky header only when useful,
- numbers aligned consistently,
- on small screens use list/card/detail strategy or a component-contained horizontal region, never page-wide overflow.

## Status badges

- semantic text + icon/dot,
- consistent vocabulary.

## Conversation list item

Show:

- customer identity,
- latest message excerpt,
- timestamp,
- unread state,
- priority/assignment when useful.

Selected state must remain obvious without color alone.

## Message bubbles

- customer/agent visually distinct,
- internal notes clearly separate,
- AI messages have a subtle AI indicator,
- no loud sci-fi gradients.

## AI citation card

- source title,
- bounded snippet,
- relevant metadata,
- click to open source context.

Do not represent raw similarity score as “confidence” unless the product clearly defines it.

## AI run timeline

Vertical sequence:

- triage,
- policy,
- retrieval,
- draft,
- quality,
- decision.

Motion can reveal completed steps but the final state must be fully readable without animation.

## Knowledge source card/row

Real statuses:

- queued,
- processing/indexing,
- ready,
- failed,
- disabled.

Any progress animation must reflect real system state.

## Empty states

Specific explanation + relevant CTA. Avoid giant generic artwork that wastes operational space.

## Toasts

Use for transient confirmation. Never make a toast the only form-error location.

## Dialogs/sheets

- focus management,
- keyboard dismissal where appropriate,
- mobile viewport fit,
- explicit destructive language.

## Cookie banner

- compact,
- responsive,
- does not overlap mobile CTA,
- controls actual analytics behavior.

---

# Motion system

Preferred library:
`https://motion-primitives.com/docs`

Use current documented installation/CLI. Keep copied primitives inside the project where the library model expects source ownership.

## Approved patterns

### Text Effect

Use on hero or selected marketing headings. Do not animate operational labels character-by-character.

### Animated Group

Use for feature cards, integration cards, onboarding choices, and short controlled groups. Avoid long realtime lists.

### In View

Use marketing section reveals, usually once.

### Animated Background

Use tabs, segmented controls, active navigation.

### Disclosure

Use FAQ and expandable supporting information.

### Glow Effect

Use for limited AI-active/hero emphasis. Never sacrifice contrast.

### Progressive Blur

Decorative marketing/media overlays only.

### Magnetic

Optional pointer-only marketing CTA. Disable/neutralize on touch and reduced-motion contexts.

## Timing guidance

- micro interaction: ~120–220ms,
- common UI transition: ~200–320ms,
- marketing reveal: ~350–600ms,
- ambient effects: slow and nonessential.

## Reduced motion

When `prefers-reduced-motion` is set:

- remove nonessential transforms,
- use instant or simple fade states,
- stop looping ambient animation,
- keep all information available.

## Performance

Prefer transform/opacity. Avoid layout-heavy animation in lists. Do not add WebGL/canvas/hero video merely for spectacle.

---

# Marketing page composition

## Home

1. Header
2. Hero: value + CTAs + interactive support flow
3. “Question to resolution” workflow
4. Product pillars
5. RAG/evidence visual
6. Human handoff visual
7. Realtime widget visual
8. Analytics proof
9. Security/tenant isolation
10. Integrations
11. Pricing
12. FAQ
13. Final CTA
14. Footer

## Hero product visual

Recommended composition:

- customer widget message on left,
- SupportSphere inbox center,
- AI trace/citation inspector on right,
- animated SVG connector path showing routing.

Marketing illustration may use static illustrative data only because it is explicitly a product illustration, not the authenticated dashboard.

Use inline SVG for connector routes/status indicators. Decorative SVGs get `aria-hidden`; informative ones get an accessible label or adjacent text equivalent.

---

# App interaction tone

Support work can be stressful. Product copy is calm, precise, professional.

Good:

“Knowledge indexing failed. We couldn’t extract text from this PDF. Try a text-based PDF or re-export the file.”

Bad:

“Oops! AI magic failed ✨”

---

# Responsive behavior

## 320–639px

- app nav drawer,
- one primary content pane,
- inbox list and thread are separate navigable views,
- inspector becomes bottom sheet/full sheet,
- sticky composer remains visible,
- CTA/cookie controls do not overlap,
- forms fill width appropriately.

## 640–1023px

- compact/collapsible navigation,
- two-pane inbox,
- inspector drawer.

## 1024px+

- full sidebar,
- two/three-pane support workflow.

No fixed desktop widths that create page-level overflow.

---

# Accessibility

- visible focus ring using focus token,
- dark shell links meet contrast,
- animation never carries sole meaning,
- charts have text labels/summary,
- decorative SVGs hidden from accessibility tree,
- icon-only buttons have accessible names,
- reduced-motion support,
- screen-reader live messaging for send/error states where useful,
- keyboard-friendly inbox/actions.

---

# Do

- make inbox/support operations the visual star,
- show real state and evidence,
- make AI explainable,
- keep dark shell + calm workspace contrast,
- use motion to explain routing/state,
- design error/loading/empty states intentionally,
- make mobile deliberate,
- keep marketing premium and app operational.

# Don't

- use rainbow AI gradients everywhere,
- use glassmorphism on every card,
- build twelve identical metric cards,
- use tiny low-contrast text,
- hide core actions behind hover only,
- overanimate realtime message lists,
- make destructive actions ambiguous,
- show fake “99.9% AI accuracy”,
- blindly copy upstream DesignMD implementation.

---

# Reference

Upstream visual reference:
https://designmd.ai/frknaykc/command-center

DesignMD format:
https://designmd.ai/what-is-design-md

Motion Primitives:
https://motion-primitives.com/docs
