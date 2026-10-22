## Approved SupportSphere upgrades

Owner approved the assessment/roadmap on 2026-10-18. Before work or after compaction read `RULES.md`, `docs/upgrade-execution.md`, `.agent/STATE.md`, and the current packet at the top of `.agent/HANDOFF.md`. Load the active U0–U6 section of `PHASES.md`, its roadmap items, and its rows in `.agent/UPGRADE_PROGRESS.md` / `.agent/UPGRADE_TEST_MATRIX.md`; read relevant PRD/ARCHITECTURE/DESIGN and feature docs before edits. Historical P00–P13 logs are evidence, not the active upgrade plan.

Use `docs/upgrade-prompts/` to execute one approved phase, enhance meaningful tests, update behavioral docs, and checkpoint the exact next action after every slice. Follow `docs/automation-and-human-control.md`. P13 release remains separately blocked; no unrelated features, sensitive autonomous actions, or unattended production release. Consult current STATE for phase/status; the owner invoked U6 and explicitly deferred U5 human device review on 2026-10-23. The review remains unproved and U6 device/release gates remain required. Preserve the generated Next block below.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
