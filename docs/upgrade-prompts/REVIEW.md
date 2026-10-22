# Review upgrade evidence and readiness

Use for a read-only assessment between implementation phases. This is not an instruction to begin another phase or change application behavior.

```text
Review the active or most recently completed SupportSphere U-phase in C:\SupportSphere. Read the execution contract, STATE/current HANDOFF, PHASES/roadmap scope, progress/test rows, actual diff and dated QA evidence. Do not modify application code, tests, dependencies, schema or external state during this review.

Compare each claimed completed slice against actual source/test files and recorded command target/revision/result. Identify missing negative/concurrency/role/tenant/mobile/accessibility/automation boundaries and stale screenshots. Rerun bounded read-only/local checks when helpful and authorized; do not trigger live writes or consume provider quota from a review prompt. Distinguish local/isolated/real-provider/deployed proof. Verify that changed controls are reflected in behavior docs and owner/AI test steps, and that no unexecuted result fields were marked passed.

Assess product automation against docs/automation-and-human-control.md: producer/consumer/policy, terminal outcome, retry/dedupe, stale/disable/revoke/human override and actionable exception evidence. Engineering automation must preserve target guards, safe cleanup, failure visibility and human review; no self-approving visual baselines or release.

Report actionable findings with priority, precise file location, failed/missing acceptance ID, user impact and next verification. State whether the next phase's prerequisites are met. Do not mark missing evidence PASS, waive a requirement, restart completed work, or close P13 gates. Return a concrete remediation list or a concise evidence-supported readiness result.
```
