# Resume one approved phase

Copy this into a new or resumed session; it selects exactly one phase from repository truth.

```text
Work in C:\SupportSphere. Resume the approved existing-feature upgrade program; do not reconstruct progress from chat memory.

Read AGENTS.md, RULES.md, docs/upgrade-execution.md, .agent/STATE.md, current HANDOFF, phase progress/test rows, PHASES.md and the approved roadmap. Inspect git branch/HEAD/status/diff, current blockers and pending operation/fixture/migration state. Read relevant PRD/architecture/design and behavioral docs before edits. Preserve unrelated/pre-existing work and verified slices.

If the active phase is NOT_STARTED/IN_PROGRESS/VERIFYING, execute its docs/upgrade-prompts/Ux.md prompt. If BLOCKED_MANUAL, verify whether the blocker actually changed and continue only independent authorized work in that same phase; do not repeat unchanged probes or skip its required acceptance. If the active phase is COMPLETE, verify its evidence and select the next NOT_STARTED phase only if all prerequisites are satisfied. If U0–U6 are complete, report current release evidence/limitations and do not restart work.

Execute only that one selected eligible phase. Loop reproduce -> meaningful test -> complete implementation -> verify -> repair -> update docs/tests/progress/QA/STATE/HANDOFF. Checkpoint exact next action and command/results/target/revision, pending remote/process/fixture status and human gates after each slice and before session boundaries. Check actual completion before replaying external operations. Old PASS counts and provider metadata remain historical.

Preserve existing product stack, roles/tenant/safety and human-control contracts. Automate routine verification safely; no new product modules, broad autonomy, recurring tasks, automatic merge or production deploy. At the phase gate prove all required acceptance, or record an exact blocking dependency and stop dependent work. Stop at the selected phase boundary and provide the next prompt plus evidence and unresolved release gates.
```
