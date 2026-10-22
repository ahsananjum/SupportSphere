# Approved upgrade execution contract

Approved by the owner on **18 October 2026**. This is the operating contract for implementing the [approved roadmap](upgrade-roadmap.md), including its human-in-the-loop automation extension. Documentation preparation is complete. Current implementation and proof are recorded in STATE/progress/QA; this contract alone does not establish completion.

## Scope and sources of truth

Improve existing SupportSphere workflows, supporting controls, UI/UX, HCI, accessibility, mobile behavior, reliability, and verification. Preserve Next.js/React/Tailwind/Supabase and the paper/ink/mint identity. No separate CRM, billing, new channel, autonomous agent platform, generic approval product, or unrelated integration is authorized by this program.

When repository documents conflict, use the owner's latest instructions, then this approved upgrade contract and the upgrade sections of RULES/PHASES/PRD/ARCHITECTURE/DESIGN. Existing security, tenant, and data-integrity constraints continue to apply. The roadmap owns work-item scope and acceptance; PHASES owns phase order/gates; STATE owns current progress; tests and actual source/runtime evidence establish what works. Historical P00–P13 records and the assessment explain the baseline, not current completion.

| Document                               | Ownership                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `AGENTS.md`                            | Short startup instructions; preserve Next's generated block.                        |
| `.agent/STATE.md`                      | Active phase/slice, exact next action, blockers, branch, current evidence pointers. |
| `.agent/UPGRADE_PROGRESS.md`           | One status row per roadmap slice, linked tests/evidence; no implied completion.     |
| `.agent/UPGRADE_TEST_MATRIX.md`        | Planned regression/acceptance coverage, one stable ID per slice.                    |
| `.agent/HANDOFF.md`                    | Current resume packet at the top; dated historical handoffs below.                  |
| `.agent/QA.md`                         | Dated actual commands/results and evidence, distinguished from older runs.          |
| `.agent/DECISIONS.md`                  | Append-only rationale; use unique `ADR-UPG-*` IDs for new upgrade decisions.        |
| `.agent/MANUAL_ACTIONS.md`             | Only owner-required unresolved actions; preserve existing gate IDs.                 |
| `docs/automation-and-human-control.md` | Product execution policy and engineering automation boundaries.                     |
| `docs/upgrade-prompts/`                | One bounded repeatable prompt for each phase, plus resume/review prompts.           |

## Startup and recovery after context compaction

1. Inspect `git status --short`, branch/HEAD, recent relevant commits/diff. Preserve unrelated and pre-existing changes, including uncommitted approved docs.
2. Read AGENTS, RULES, this contract, STATE, the current HANDOFF packet, the active PHASES section, and its roadmap items. Read the progress/test rows for that phase and the current manual-gate summary. Load the relevant PRD/architecture/design and feature/testing guides before edits.
3. Read only relevant dated sections of long QA/decision/handoff history when needed. A historical PASS, old provider version, or earlier instruction to stay in P13 must not override the current approved upgrade track. Do not reread every historical log on every loop.
4. Compare the resume packet with actual files and tests. Check whether a prior command/migration/remote operation completed before attempting it again. Record uncertainty rather than replaying a non-idempotent action.
5. Update STATE with the selected existing slice, evidence needed, and the next executable action. When a phase prompt is invoked, set that phase IN_PROGRESS only after preflight. Do not reset completed work after compaction.

Read the installed `node_modules/next/dist/docs/` guide before changing Next.js code. Load applicable database/security/design skills for implementation. Verify current provider docs at provider boundaries. These requirements do not imply a framework or provider migration.

## Two tracks, not two competing active phases

- **Upgrade track:** U0 → U1 → U2 → U3 → U4 → U5 → U6. STATE has one active upgrade phase and one current slice. Initial state is U0 / NOT_STARTED / U0.1.
- **Release track:** P13 remains BLOCKED_MANUAL, with MANUAL-008 pending provider verification and MANUAL-010/011 pending. A preserved P13 checkpoint is in `.agent/archive/STATE-P13-2026-10-17.md`.
- U0–U5 completion means their explicitly scoped repository/local/isolated acceptance passed; it never means deployment or real-provider release proof passed. Real-provider/deployed proof is required by U6 and P13. Local deterministic coverage cannot be relabelled as provider proof.
- Existing release blockers do not prevent safe local work. Do not use credentials recorded as compromised or perform production verification before the corresponding gate is resolved. If a phase requires unavailable isolated infrastructure, keep that required slice blocked; do not waive it to advance.

## The repeatable phase loop

1. **Orient:** Recover the exact phase/slice and its acceptance/test IDs. Verify prerequisites; do not start a later phase from an old prompt.
2. **Reproduce:** Inspect current behavior. For correctness changes add a meaningful failing regression when practical. For visual changes capture a baseline and define task/layout acceptance; do not add tests that merely mirror CSS.
3. **Implement one vertical slice:** Persistence/RLS/types/service/validation/action/UI/states/mobile/tests/observability as applicable. Use existing fields, records, and handlers; close the workflow end to end.
4. **Verify:** Run focused tests for the slice and affected baseline behavior. Inspect relevant roles, errors, retry, keyboard, mobile, and user-visible outcome. Infrastructure enqueue is not terminal success.
5. **Repair:** Diagnose and fix observed failures. After two unsuccessful attempts at the same cause, change the hypothesis or inspect diagnostics; do not disable the failing check or endlessly retry unchanged work. Run focused checks again after fixes.
6. **Synchronize:** Update progress/test evidence, current STATE/HANDOFF, and the behavioral docs/manual test steps changed by the slice. Record introduced/changed test names and actual commands. Checkpoint after every verified slice, before a risky operation, and before ending a session.
7. **Continue within the phase:** Pick the next incomplete eligible slice. Work on independent remaining slices in the same phase if an external gate blocks one; record the dependency. Once no meaningful unblocked work remains, set BLOCKED_MANUAL with the exact existing gate or missing input and stop dependent work.
8. **Exit gate:** Set VERIFYING, run the applicable phase gate and review evidence. Mark COMPLETE only when all required phase criteria passed or the owner explicitly removed a requirement and that decision is recorded. Skipped/blocked/not-run is not PASS.
9. **Handoff:** Record the completed phase, exact next eligible phase prompt, remaining release gates, and a concise review summary. A phase-specific prompt stops at its phase boundary. Do not launch the next phase from the same prompt; do not ask for repeated approval of the already-approved scope.

A prompt describes work in an active session. It does not create a scheduler or guarantee unattended continuation after a session stops. No recurring Codex job, hosted schedule, or auto-merge/deploy is enabled by preparing these files.

## Required checkpoint packet

Keep the current packet concise; use links for long evidence. Never include secrets, bearer URLs, private transcripts, or full environment contents.

```text
Updated: ISO date/time with timezone
Track / phase / status / current slice:
Branch / inspected HEAD / changed paths:
User scope and latest steering:
Verified slices and evidence references:
Current hypothesis / reproduced failure:
Tests changed / exact last commands / results / environment:
Pending process or remote operation / safe operation ID / completion known?:
Migration file / local applied / remote applied / types regenerated:
Fixture target / cleanup status:
Human review or manual gate / authorized scope:
Next exact action and expected result:
Remaining phase criteria / next prompt:
```

If an interruption prevents checkpointing, the next agent reconstructs from git, tests, and durable remote state. It must not assume a successful migration, send, cleanup, or deployment from the intention to run it.

## Tests and docs evolve with every slice

Use `.agent/UPGRADE_TEST_MATRIX.md` for stable planned IDs and `docs/upgrade-testing.md` for the run protocol. Each slice updates the relevant existing test files or introduces a focused test in the same framework. Record selected IDs in the progress row and actual result details in QA. Keep baseline suites; do not replace real RLS/provider checks with mocks.

Update PRD when behavior/acceptance changes, ARCHITECTURE when data/runtime contracts change, DESIGN when component/layout rules change, feature docs and owner guides when controls/copy change, README when setup/limitations change, and ADRs when a material decision changes. An unrelated doc needs no busywork edit; record “unchanged” with a reason where useful.

For app-changing phase exits run typecheck, lint, formatting, unit/integration checks, affected browser journeys, and production build; add migration replay/advisors/RLS/types checks for data changes. Use exact supported commands from the repository and installed CLI help. Markdown is ignored by default formatting, so explicitly check changed Markdown with `node node_modules/prettier/bin/prettier.cjs --ignore-path .gitignore --check <changed files>`; substitute actual file paths. Do not interpret a default ignored-file check as Markdown proof.

## Human involvement without unnecessary interruptions

Routine reversible implementation, focused tests, local docs updates, and safe isolated-fixture verification are part of executing the approved phase. Ask only for missing information or consequential authority not already provided, and finish a concrete reviewable result first. Phase approval is not permission to send real customer messages, create broader access, rotate credentials, perform destructive production operations, incur spending, or deploy.

Prepare evidence for visual review and product-policy decisions; keep the agent working on independent authorized tasks while waiting. Use existing product review surfaces. Human review of a UI or plan is not proof of RLS, delivery, or provider correctness. Final production release remains behind its existing concrete evidence and owner-controlled gates.

## Design of these instructions

The short AGENTS entry point and explicit referenced phase/checkpoint files follow the persistent-instruction approach described in [official OpenAI documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Separate phase prompts and evidence records are adapted to this repository from the [OpenAI workflow guide](https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex). The contracts above are project decisions; they do not imply all referenced files are automatically injected into every session.
