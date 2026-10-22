# Upgrade phase prompts

Owner approved the assessment/roadmap on **18 October 2026**. Documentation preparation is complete; implementation begins when a phase prompt is invoked. Read [the execution contract](../upgrade-execution.md), [roadmap](../upgrade-roadmap.md), [automation policy](../automation-and-human-control.md), [current state](../../.agent/STATE.md) and [test protocol](../upgrade-testing.md).

## How to use

Open the appropriate file and copy its text block into an agent session working in `C:\SupportSphere`. The agent loops within that phase through implementation, verification, repair and docs/test updates, then stops at its boundary. The same prompt resumes incomplete work after context compaction; it must not reset verified slices. Each phase reads current scope/evidence from files rather than relying on this chat.

| Phase | Outcome                                                                      | Copyable prompt |
| ----- | ---------------------------------------------------------------------------- | --------------- |
| U0    | Correctness, safe baseline, automation inventory and verification foundation | [U0](U0.md)     |
| U1    | Reusable UI, grouped navigation and consistent feedback                      | [U1](U1.md)     |
| U2    | Complete support queues, conversation, customer and ticket workflow          | [U2](U2.md)     |
| U3    | Knowledge and understandable human-controlled AI review                      | [U3](U3.md)     |
| U4    | Reliable automations, notifications, webhooks, team and audit                | [U4](U4.md)     |
| U5    | Mobile/device/accessibility, setup/widget/public copy and polish             | [U5](U5.md)     |
| U6    | Quality/automation proof, human release review and original release gates    | [U6](U6.md)     |

Additional prompts: [resume one eligible phase](RESUME.md) · [review evidence without changing the app](REVIEW.md).

Short entry point when the full file is accessible to the agent:

```text
Read docs/upgrade-prompts/RESUME.md and execute its prompt. Recover current state from the repository, complete only one eligible approved phase, keep docs/tests/checkpoints current, and stop at its boundary.
```

To explicitly start the first phase:

```text
Execute docs/upgrade-prompts/U0.md in C:\SupportSphere. Follow the approved loop and resume records. Implement and verify U0 only, enhance its meaningful tests, update docs after each slice, and hand off before U1.
```

## What looping does and does not mean

The loop is a bounded work/review/recovery procedure for an active session. It does not keep the app running after the session ends, create a scheduler, bypass tool permissions, or guarantee zero human input. No recurring Codex task is configured. Existing production release gates remain open; scoped local phase completion cannot close them.

Approvals already recorded apply to this upgrade scope. Do not request redundant approval for routine reversible implementation. Consequential production, credentials/access, sensitive communications and other actions still follow actual authority and the [human-control contract](../automation-and-human-control.md). Continue independent approved work while a real gate is pending.
