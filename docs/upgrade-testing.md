# Upgrade testing and evolving documentation

Approved plan: [roadmap](upgrade-roadmap.md). Execution: [phase loop](upgrade-execution.md). Automation: [human-control contract](automation-and-human-control.md). Planned coverage: [test matrix](../.agent/UPGRADE_TEST_MATRIX.md).

## What exists and what is planned

Use the existing `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e`, and `pnpm build` scripts. Existing suites live in `tests/unit`, `tests/security`, `tests/e2e`, and `tests/live`. Live suites have explicit target opt-ins; inspect each before running. The phase-aware runner and isolated fixtures are installed by U0.8; exact commands are below and in automation-inventory.md. Expanded CI/recovery remains U6.8 work.

The assessment's 52 passed / 3 skipped tests and static checks are **historical 18 October baseline evidence**. They are not results for the forthcoming upgrade. Every planned upgrade test starts NOT_RUN. Do not prefill the owner or AI result sheets.

## Slice-level procedure

1. Select the roadmap slice and matching `UP-Ux-NN` row. Record baseline commit/diff, actual environment, role(s), expected behavior and meaningful failure/negative case.
2. For a correctness fix, reproduce and add a regression where practical. For a reversible visual-only adjustment, prefer an existing browser check/screenshot and task acceptance to a brittle implementation-mirroring unit test.
3. Implement; extend the appropriate existing suite or add a focused scenario. Record the actual test file/name in the progress evidence; planned names are not proof that files exist.
4. Run focused checks. After a change/failure, rerun affected checks; broaden for new risk and the phase exit. Avoid repeated full suites when nothing relevant changed.
5. Record exact command, date, HEAD plus dirty-diff context, target type, passed/failed/skipped counts, safe artifacts and limitations in QA. A test from another commit/target cannot silently satisfy current acceptance.
6. Update guides to describe the real current control names and behavior. Keep previous IDs stable where possible; map changed cases and add regression IDs without silently dropping old requirements.

## Acceptance layers

| Layer                    | Proof                                                                                                          | Does not prove                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Unit/contract            | Parsing, policy branches, formatting, metric cohort logic, idempotency contracts.                              | Live database/RLS, real provider output or usable mobile layout.  |
| Isolated integration     | Real migrations/RPCs/RLS, job lifecycle, concurrency and durable effects with synthetic records.               | Production environment/commit parity or current Gemini access.    |
| Browser                  | Visible outcome, role-aware controls, focus/error states, preserved drafts, list traversal and mobile layouts. | Backend permission boundaries merely because a button is hidden.  |
| Visual/task review       | Placement, clarity, hierarchy, long-content readability and task success.                                      | Security, provider delivery or statistical usability guarantees.  |
| Real provider/deployment | Fresh recorded model/delivery/auth/runtime evidence at the intended deployed commit.                           | Unexecuted cases, another target, or all future quota conditions. |

U0–U5 require their local and applicable isolated integration/browser gates. Real-provider/deployed proof is explicitly owned by U6/P13. If required local/isolated verification is missing, the slice/phase remains blocked. “Not applicable” requires a reason and cannot be used to hide a required check.

## Baseline cases to preserve

- Owner/admin/agent/viewer and signed-out access; direct RPC/tenant-denial tests.
- Onboarding resume, invitation lifecycle, recovery/OAuth, existing email origin handling.
- Customer → conversation → public reply/private note → ticket → resolution/history.
- Exact-origin widget/session isolation, internal-note privacy, offline/retry/history.
- Knowledge upload limits/readiness/disable/reindex/delete and citation lifecycle.
- Off/draft/assisted/sensitive/handoff/freshness/quality/injection/provider failure controls.
- Rule/delivery event fan-out, leases, dedupe, retry, terminal failure and notifications.
- Real metric definitions, date boundaries, no-data vs failed load, large dataset totals.

## UI verification set

For changed routes verify 320/360/390/768/1024/1440px; relevant short heights; long subject/name/email/source/destination; loading/empty/no-match/error/pending/success; keyboard, focus return, reduced motion and zoom. Capture key before/after views. Automated emulation does not substitute for real-phone keyboard or screen-reader checks required at U5/U6.

## Documentation update map

| Changed area                      | Update with the slice                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Common shell/forms/states         | DESIGN, relevant PRD/architecture contract, UI tests and manual guide cases.                                         |
| Support/linked records/routing    | TESTING_GUIDE customer/conversation/ticket sections and requirement-gap inventory; actual result-sheet case mapping. |
| Knowledge/AI                      | docs/knowledge.md, docs/ai.md, AI_TESTING_GUIDE and relevant general-guide cases; keep unexecuted results blank.     |
| Automation/webhooks/notifications | docs/workflows.md, docs/integrations.md, automation contract, both guide recipes and producer/consumer evidence.     |
| Settings/auth/widget              | General guide setup/auth/settings/widget cases; docs/widget.md and public availability copy where changed.           |
| Analytics/evaluation              | Metric definitions, PRD, both guides and exact fixture expectations; do not alter cases to inflate pass rate.        |
| Schema/runtime/infrastructure     | ARCHITECTURE, unique ADR, migration/type status, safe operational runbook and recovery instructions.                 |
| Every verified slice              | STATE, progress row, test ID/evidence, current HANDOFF, dated QA entry.                                              |

Historical testing-guide steps remain the baseline until a slice actually changes them. Add an upgrade note/link now; replace steps only with implemented behavior and preserve known gaps until proven fixed.

## Final evidence and release

Run the full applicable repository/build/browser gate, isolated migration replay, role/RLS/security regression, accessibility/mobile review, measured performance and usability tasks. Execute new real-provider scenarios and the deployed golden journey only after the corresponding existing owner gates are verified. Record pending approval/blocked evidence explicitly. Documentation creation, scheduled execution, fixture output, and a submitted CI job are not release proof.

## U0 verification commands now implemented

- node scripts/verify-upgrade.mjs --phase U0 --layer docs
- node scripts/verify-upgrade.mjs --phase U0 --slice U0.1 --layer unit
- Set RUN_UPGRADE_LOCAL=1 explicitly, then use --layer isolated or --layer browser. These require the actual local Supabase stack; never substitute production credentials.
- --layer gate runs bounded repository/type/build checks; inspect artifacts and separately run browser/integration and changed-Markdown checks.

See [automation inventory](automation-inventory.md) for runner/fixture controls. Stable IDs map to actual tests in scripts/verify-upgrade.mjs; the runner checks coverage/links and records a worktree digest without auto-marking progress. Read pending fixture ledgers in test-results/u0/fixtures and process state before retrying.

Playwright output is isolated under test-results/playwright so its cleanup cannot erase U0 JSON evidence, screenshots or pending-fixture ledgers. UPGRADE_BROWSER_PRODUCTION=1 selects the existing local production build for the authenticated U0 journey; RUN_UPGRADE_LOCAL=1 remains mandatory.

## U1 verification commands

The bounded runner accepts --phase U1 and maps UP-U1-01..07 to actual u1-browser, u1-style, ui-presentation and automated-action tests. RUN_UPGRADE_LOCAL=1 remains mandatory for browser/isolated/gate layers. UPGRADE_BROWSER_PRODUCTION=1 selects the local production build. Final U1 browser runs all stages plus settled production pixel comparison. U1_FROM/U1_SLICE limit development-stage checks and must be recorded; a focused stage does not prove other IDs. U1_STYLE_CAPTURE=1 captures a before image only and never substitutes for the final comparison. Existing local U0 persistence and protected-draft browser regressions remain phase-exit checks. No provider/deployment or real-device proof is inferred.

## U2 verification commands

The runner now maps UP-U2-01..09 to actual unit, u2-browser, u2-workflow-browser, u2-keyboard-browser, u2-persistence and u2-override tests. RUN_UPGRADE_LOCAL=1 remains mandatory for browser/isolated/gate. UPGRADE_BROWSER_PRODUCTION=1 uses the existing local production build. U2_FROM/U2_SLICE narrow workflow development checks and must be disclosed; remove both for final browser acceptance. Browser files and fixture suites run serially. The U2 isolated layer also retains U0 real consumer/role/metric regression; the protected-draft U0 production browser and baseline Playwright suite are separate exit checks. Migration replay/types/schema metadata and changed-Markdown checks remain explicit operations. No skipped provider or human-device check is relabelled PASS.

## U3 verification commands

The runner maps UP-U3-01..07 to actual knowledge/AI/policy browser suites, knowledge/evidence/review/policy unit tests and u3-policy-boundaries. Set RUN_UPGRADE_LOCAL=1 for gate/isolated/browser; UPGRADE_BROWSER_PRODUCTION=1 uses the local production build. Browser files run serially and the final U3 browser command runs all three files without test-name/stage limits. Isolated runs retain u0-persistence/u2-persistence/u2-override plus U3 actual processor/readiness/policy/lease/concurrency/role/tenant tests. Explicit name-limited regression runs are not full phase proof. Existing U0 draft browser, applicable U1 review and original Playwright baseline remain exit regressions. Full replay, generated type parity, schema/grant/RLS metadata, changed-Markdown/checker and actual fixture/process cleanup are recorded separately. Controlled documents/model/embedding tests never prove current parser/Edge/Gemini/provider/deployment; those remain U6/P13. Actual phone/screen-reader review remains U5/U6.

## U4 verification commands

U4 proof uses the phase-aware runner: `node scripts/verify-upgrade.mjs --phase U4 --layer unit`, `--layer isolated`, `--layer browser` with `RUN_UPGRADE_LOCAL=1` and `UPGRADE_BROWSER_PRODUCTION=1`, `--layer gate`, and `--layer docs`. The browser journey covers six widths and stale version conflict; isolated tests cover producer-to-terminal automation, deduped notification, disabled skip, webhook retry/dedupe and tenant/role denial. Final local proof does not establish hosted/provider/deployment behavior; those remain U6/P13 gates.

## U5 verification commands

U5 focused coverage is mapped in `scripts/verify-upgrade.mjs`: `node scripts/verify-upgrade.mjs --phase U5 --layer unit` runs the widget transcript regression and documentation checker; `RUN_UPGRADE_LOCAL=1 UPGRADE_BROWSER_PRODUCTION=1 node scripts/verify-upgrade.mjs --phase U5 --layer browser` runs the auth, detail, settings, widget, public-copy, and six-width overflow journeys. The browser artifact includes reduced-motion captures and short-height composer checks. U5 has no schema or isolated processor change, so an isolated migration layer is not applicable; the local browser target still uses disposable fixture users/workspaces and cleans them in `finally`. Actual phone keyboard and screen-reader review remain human gates and are never inferred from emulation.

## U6 verification commands

U6 uses the same guarded local target and records source/build parity before browser execution. Run `RUN_UPGRADE_LOCAL=1 node scripts/verify-upgrade.mjs --phase U6 --layer gate` for typegen, TypeScript, lint, formatting, unit/security suites and the webpack production build; the passing artifact writes `.next-u0/upgrade-build.json`. Then run `RUN_UPGRADE_LOCAL=1 node scripts/verify-upgrade.mjs --phase U6 --layer unit`, `--layer isolated`, and `--layer browser`. The isolated layer retains U0–U4 persistence, role/tenant, scale, concurrency, lease, retry and terminal tests plus the U6 metric boundaries. The browser layer runs the prior U0–U5 journeys together with the U6 six-width, short-height, zoom, reduced-motion, semantic-control and bounded lab-timing checks. The runner clears inherited slice limits and rejects stale or missing build proof before browser work.

U6 local evidence does not prove real phone keyboard or screen-reader behavior, field p75 Core Web Vitals, Gemini/receiver delivery, hosted migration parity, Vercel commit/environment parity, or the deployed golden journey. Those remain explicit human/provider/deployment gates; do not convert skipped or blocked results into PASS.
