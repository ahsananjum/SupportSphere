# SupportSphere — Design system

Status: active for the current-page design refinement; P02 implementation is deferred by the owner. This document is the visual and interaction source of truth for marketing, authentication, invitations, and the authenticated workspace. Every page uses the same tokens and component vocabulary. Product claims must describe implemented behavior or clearly identify a planned capability.

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

Motion Primitives documentation was reviewed for Text Effect, Animated Group, In View, Animated Background, Disclosure, Glow Effect, Animated Number, Toolbar Dynamic, and advanced dialog effects. Use **Text Effect** once on the marketing hero, **In View** for a few static product-story reveals, **Animated Group** for a short workflow sequence, and **Animated Background** for selected workspace navigation. FAQ uses native disclosure semantics. The other candidates are deferred: animated numbers need real changing metrics, a dynamic toolbar has no real actions yet, and morphing dialogs or glow add complexity without improving the current auth/team tasks.

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
{"color":{"paper":{"$type":"color","$value":"oklch(0.969 0.009 86)"},"ink":{"$type":"color","$value":"oklch(0.215 0.025 250)"},"accent":{"$type":"color","$value":"oklch(0.865 0.128 158)"}}}
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
