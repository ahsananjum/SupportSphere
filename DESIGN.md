# SupportSphere — Design system

Status: approved U0–U6 improvement target, updated 2026-10-18. This is the visual/interaction source for public/auth/workspace surfaces. Use one token/component vocabulary; distinguish implemented from planned capabilities. These targets do not claim the current app already meets them.

## Approved operational refinement

Apply the [assessment](docs/app-assessment-2026-10-18.md) through [the roadmap](docs/upgrade-roadmap.md). Preserve fonts/palette; use Inbox and General settings as reference surfaces before expanding shared patterns.

- Operational titles usually 28–36px desktop / 24–28px mobile, wrapping names; 4/8px spacing rhythm, about 24–32px desktop / 16px phone gutters. Validate per screen, not as rigid universal sizes.
- Group navigation: Work, Operations, Workspace, Settings. Keep authorized destinations/current workspace and reachable account controls at short heights.
- Share headings, filters/reset/pagination, status/priority/time, fields/error/help, action feedback, empty/no-match/error/loading and confirmations. Align action and section baselines across widths.
- Phones prioritize auth forms over promotion. Legal links and sign-in/recovery copy must be clear and functional.
- Collapse context before compressing the conversation. Reply/note mode changes audience label, treatment and action. AI drafts require deliberate adoption and never replace human typing; evidence stays nearby.
- Automation presentation distinguishes queued/processing/retrying/completed/skipped/failed and explains existing human controls; no invented progress or health score.
- Verify focus/background isolation/scroll in drawers/confirmations, 44px primary touch targets, 16px mobile inputs, labels/error IDs, zoom, reduced motion, screen reader and actual phone keyboard.
- Consolidate styles incrementally; no second UI framework or another blanket override layer. Human visual review precedes accepting new screenshot baselines.

Update this contract and relevant tests with shared-pattern changes. [Human-control](docs/automation-and-human-control.md) and [phase testing](docs/upgrade-testing.md) specify behavioral proof behind the visuals.

The initial shared implementation is documented in [Shared operational UI](docs/ui-foundation.md): PageHeading/SectionHeading, field associations/action feedback and record-state/time panels. These use scoped CSS modules and existing tokens; reference consumers are Inbox, conversation detail and General settings. QA/progress establish acceptance separately from source implementation.

## Intent

A calm support workbench with editorial confidence: warm paper, dark mineral ink, a small mint signal for routing and live state, and clear operational hierarchy. The app prioritizes speed, evidence, and safe actions. Marketing can be expressive; forms and team management stay quiet.

Genre: modern editorial utility. Structural families: asymmetric product-story marketing, split editorial authentication, and dense workbench application. Avoid hero–three equal cards–CTA repetition.

## Token contract

`tokens.css` is the runtime source for all colors, fonts, spacing, radii, rules, and motion values. Tailwind utilities and custom CSS consume tokens; no page invents an accent. Accent covers at most a small portion of any viewport. Semantic states always include text or an icon.

- Paper `--color-paper`: warm off-white, not pure white.
- Surface `--color-surface`: raised off-white for forms and data.
- Ink `--color-ink`: very dark blue-black; `--color-ink-soft` for supporting copy.
- Shell `--color-shell`: calm elevated light surface for workbench chrome and structural panels; `--color-shell-raised` for active/hover states.
- Accent `--color-accent`: clear mint, used for selection, progress, and a few CTAs.
- Signal `--color-signal`: deep teal for readable links on paper.
- Danger, warning, and success tokens keep their ordinary meanings.
- Focus ring remains immediate and at least 3:1 against adjacent surfaces.

## Typography

Display: Bricolage Grotesque, upright, 600–700, tight but legible. Body and controls: DM Sans, 400–700. Monospace is reserved for IDs and technical traces. Fonts are self-hosted by `next/font` when available; system fallbacks preserve layout. Marketing headings can be large and short. Operational headings are smaller and concise. Never use italic display text, gradient lettering, all-caps paragraphs, or decorative numerals.

## Layout and components

- Marketing: asymmetric hero with short copy and an illustrative **product workflow**, followed by prose-led capability sections with varied width and background. Sections avoid stark dark blocks; highlighted sections use subtle ambient radial mesh gradients (5–15% mint/teal undertones on warm paper) and elevated frosted paper cards, maintaining 100% color consistency. No invented screenshots, customers, counts, analytics, testimonials, or compliance marks.
- Auth: consistent split layout with one calm brand field and one focused form. The form remains fully readable at 320px; error and success notices live by the action.
- App: calm elevated light navigation frame around a warm light work surface. Use real workspace and membership data only. Team rows remain list items with readable controls on mobile.
- Controls: 44px minimum target, 16px mobile input text, visible labels and field errors, immediate focus ring, quiet hover/pressed states. Primary is ink or mint according to surface; secondary is outlined.
- Cards group actions or evidence. Do not nest cards or fill the interface with decorative tiles.
- Navigation has a clickable wordmark, working links, visible current location, and a mobile disclosure that never hides the primary action.
- Empty and error states state what happened and what to do next. No generic robot art.

## Motion selection

Motion Primitives documentation was reviewed for Text Effect, Animated Group, In View, Animated Background, Disclosure, Glow Effect, Animated Number, Toolbar Dynamic, and advanced dialog effects. Use **Text Effect** once on the marketing hero, **In View** for a few static product-story reveals, **Animated Group** for the interactive support flow, and **Animated Background** for selected workspace navigation. The support-flow SVG marker moves to the selected stage and respects reduced motion. FAQ uses native disclosure semantics. Animated numbers require real changing metrics; a dynamic toolbar has no real actions yet; morphing dialogs and glow do not clarify current tasks.

P02 public pages use a compact editorial hero and ruled two-column sections. Security, integrations, and about use distinct schematic illustrations based on actual or explicitly planned state. Pricing is driven by one plan configuration and does not invent a price. The contact form uses an elevated paper panel with visible field errors. A concise essential-cookie notice sits above the mobile CTA and links to the cookie policy; no optional analytics runs.

Motion is never required to understand content. Marketing reveals use opacity and a small transform for 350–500ms; app transitions use 120–220ms. No looping cursor effect, layout shift, scrolling trap, or animation of long live lists. `prefers-reduced-motion: reduce` removes spatial motion and limits any fade to 150ms.

## SEO and content

Every indexable public route needs its own title, description, canonical path, semantic H1, Open Graph data, and truthful copy. Auth, invitations, and the application are noindex. `robots.txt` and `sitemap.xml` list only implemented indexable public routes; localhost must not claim a production canonical domain. The logo links home and the 404 offers a real destination. Image ALT is descriptive for informative images and omitted/hidden for decoration.

## Accessibility and verification

Keyboard focus, skip link, reduced motion, form labeling, color contrast, 320/360/390/768/1024/1280/1440 widths, no document overflow, and broken links are mandatory checks. Semantic headings and landmarks must reflect the content. Do not use color alone to indicate status.

## Exports

### tokens.css

The complete portable token map is maintained at [tokens.css](tokens.css). The live app imports it before component styles.

### Tailwind v4

```css
@theme {
  --color-paper: oklch(0.969 0.009 86);
  --color-ink: oklch(0.215 0.025 250);
  --color-accent: oklch(0.865 0.128 158);
  --font-display: var(--font-bricolage), 'Arial Narrow', sans-serif;
  --font-body: var(--font-dm), Arial, sans-serif;
}
```

### DTCG token shape

```json
{
  "color": {
    "paper": { "$type": "color", "$value": "oklch(0.969 0.009 86)" },
    "ink": { "$type": "color", "$value": "oklch(0.215 0.025 250)" },
    "accent": { "$type": "color", "$value": "oklch(0.865 0.128 158)" }
  }
}
```

### shadcn-compatible mapping

```css
:root {
  --background: var(--color-paper);
  --foreground: var(--color-ink);
  --primary: var(--color-ink);
  --primary-foreground: var(--color-paper);
  --muted: var(--color-paper-2);
  --muted-foreground: var(--color-ink-soft);
  --border: var(--color-rule);
  --ring: var(--color-focus);
  --radius: var(--radius-control);
}
```

## References and license

The earlier Command Center DesignMD remains a conceptual reference for calm workbench utility around an editorial light work surface. Motion Primitives is MIT licensed; source-owned components require its notice if copied. Its patterns are adapted for reduced motion, focus behavior, and SupportSphere's existing architecture. No external demo data is production data.

## U2 operational support behavior

Support queues use the existing paper/ink/mint typography and shared record states. Rows keep the work subject first, with customer, actual owner, status, priority and explicit workspace time nearby. Filters have a recovery action and paging remains usable at phone widths. Detail headers summarize current routing; the composer states its audience and names the private action Save internal note. Editing existing fields uses inline disclosure, associated errors, retained text, pending feedback and refreshed untouched values. Relationship/history links remain available to viewers without exposing mutations. Overview emphasizes real linked queues and existing readiness review. No new palette, font, decorative asset or approval surface was introduced.

Enlarged support text must wrap long contact/history links and the workbench brand so the Menu control remains within the viewport. Zoom acceptance waits for fonts and layout, and checks visible text/control bounds in addition to root scrolling.

## U3 knowledge and review presentation

Knowledge starts with the source library and name search; Add knowledge is optional disclosure after the list. Current readiness is stated in words with recorded attempts and explicit workspace times. Conversation suggestions put named numbered snippets beside deliberate draft use. Source review opens in a new tab; historical/failed evidence remains clearly qualified. Existing writing requires a named Keep / Replace choice and a changed suggestion/text/policy invalidates the choice. Run review prioritizes outcome, reason, next action, answer and evidence, with technical codes/trace behind a keyboard-accessible disclosure. Policy modes use labelled full-hit-area choices and associated help/errors; handoff release uses the existing named confirmation. Scoped modules retain the existing identity/tokens.

## U5 responsive auth, detail, and widget presentation

Auth collapses to a form-first phone layout: promotional context yields to the first labelled field, legal copy uses real routes, and the two-step login moves focus to the next field while retaining username autocomplete. Conversation detail uses responsive grid areas so customer, ticket, routing, and creation context precede the long thread on phones; the composer remains reachable on short viewports. Creation disclosures become full-width inline panels on narrow screens. General timezone is a select with a preserved current value, and widget settings explains exact origins beside the generated snippet. Widget history preserves the reader's scroll anchor when older messages load, while an offline draft remains editable for bounded retry.
