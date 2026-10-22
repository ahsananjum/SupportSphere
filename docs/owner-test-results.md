# SupportSphere owner test results

Use with [TESTING_GUIDE.md](../TESTING_GUIDE.md). Copy this sheet to your private notes before filling it if you will include email addresses or screenshots. Do not store passwords, keys, bearer tokens, email links, raw network exports, or real customer information here.

## Run details

| Item                            | Your value |
| ------------------------------- | ---------- |
| Date/time and timezone          |            |
| APP URL tested                  |            |
| Deployed/source commit          |            |
| Browser/device                  |            |
| QA workspace name and run label |            |
| Provider/manual gates resolved? |            |

Use exactly one result: **PASS**, **FAIL**, **BLOCKED**, **NOT RUN**. PASS means you performed the steps and saw the expected behaviour. No rows below are pre-passed.

## Behaviour checks

| ID         | Test                                                      | Result | Actual result / safe evidence |
| ---------- | --------------------------------------------------------- | ------ | ----------------------------- |
| R01        | Intended deployed version                                 |        |                               |
| P01        | Public navigation, content, 404                           |        |                               |
| P02        | Essential-cookie notice                                   |        |                               |
| P03        | Contact validation and operator delivery                  |        |                               |
| A01        | Signup and email confirmation                             |        |                               |
| A02        | Two-step login and wrong password                         |        |                               |
| A03        | Sign out and protected routes                             |        |                               |
| A04        | Password reset and invalid recovery                       |        |                               |
| A05        | Real Google OAuth return                                  |        |                               |
| W01        | Workspace creation and persisted onboarding               |        |                               |
| E01        | Fresh-workspace empty states                              |        |                               |
| S01        | General settings save/validation                          |        |                               |
| C01        | Customer creation/dedupe/search                           |        |                               |
| C02        | Manual conversation                                       |        |                               |
| C03        | Public reply/internal note                                |        |                               |
| C04        | Routing/close/reopen                                      |        |                               |
| C05        | Inbox search/filter/literal markup                        |        |                               |
| T01        | Conversation ticket/update/timeline                       |        |                               |
| T02        | Standalone ticket/search/filter                           |        |                               |
| K01        | Pasted source reaches real ready/preview                  |        |                               |
| K02        | Disable/enable/reindex                                    |        |                               |
| K03        | TXT/Markdown upload and confirmed delete                  |        |                               |
| K04        | Empty/oversized/broken PDF/readable PDF                   |        |                               |
| W02        | External host/widget installation                         |        |                               |
| W03        | Customer → inbox → human reply → private-note isolation   |        |                               |
| W04        | Offline draft/recovery                                    |        |                               |
| W05        | Foreign origin and disable/re-enable                      |        |                               |
| W06        | Size/rate limits                                          |        |                               |
| M01        | Invite delivery/acceptance/already-member                 |        |                               |
| M02        | Resend/wrong account/revoke                               |        |                               |
| M02 expiry | Actual expired invitation                                 |        |                               |
| M03        | Viewer read-only boundaries                               |        |                               |
| M04        | Agent/admin role boundaries                               |        |                               |
| M05        | Last-owner safety/removal/audit                           |        |                               |
| N01        | Persisted notification read state                         |        |                               |
| U01        | Conversation notification rule + disable                  |        |                               |
| U02        | Priority automation                                       |        |                               |
| U03        | Status automation                                         |        |                               |
| U04        | Ticket automation/idempotency                             |        |                               |
| U05        | Conditions/customer-message trigger/validation            |        |                               |
| I01        | AI settings safe bounds                                   |        |                               |
| I02        | Off enqueues no generation                                |        |                               |
| I03        | Real cited draft and deliberate human send                |        |                               |
| I04        | Feedback and run filters                                  |        |                               |
| I05        | Gated assisted auto reply                                 |        |                               |
| I06        | Human/billing/account-deletion handoff                    |        |                               |
| I07        | No evidence and excluded intent                           |        |                               |
| I08        | Untrusted knowledge injection                             |        |                               |
| I09        | High-confidence gate/AI automation/deep failure proof     |        |                               |
| H01        | HTTPS validation and successful signed delivery transport |        |                               |
| H02        | Real subscribed support events                            |        |                               |
| H03        | Edit/disable/rotate/revoke/history                        |        |                               |
| H04        | Retry and terminal failure                                |        |                               |
| H05        | Private destination + receiver signature proof            |        |                               |
| X01        | Metric deltas/date range/definitions                      |        |                               |
| X02        | Honest initial evaluation/no duplicate cases              |        |                               |
| X03        | One actual matching evaluation case                       |        |                               |
| Z01        | Foreign workspace denial/switch/removal                   |        |                               |
| V01        | Required mobile/desktop widths                            |        |                               |
| V02        | Keyboard/focus/reduced motion                             |        |                               |
| V03        | Loading/network errors/recovery                           |        |                               |
| V04        | Console/network/log privacy                               |        |                               |
| V05        | Production robots/sitemap/share/metadata                  |        |                               |
| B01        | Real database/RLS/workers/advisors                        |        |                               |
| B02        | Vercel/provider configuration/parity                      |        |                               |
| B03        | Static/security/browser/live automated gates              |        |                               |
| Cleanup    | QA rules/endpoints/data handling                          |        |                               |

Record separate sub-results when part of a row works and another part is blocked. For example, “H05 private URL rejected: PASS; receiver HMAC validation: NOT RUN.”

## Required features still missing or unproven

Use the gap inventory in TESTING_GUIDE section 19. Do not turn an absent control into a PASS.

| Requirement | Missing/unproven behaviour | Owner decision or required repair | Evidence |
| ----------- | -------------------------- | --------------------------------- | -------- |
|             |                            |                                   |          |

## Bug report to send back

```text
Test ID:
APP URL / route (omit tokens):
Account role:
Selected QA workspace:
Input (synthetic only):
What I clicked:
Expected:
Actual:
Time:
Safe HTTP status / error code:
Screenshot (hide secrets):
Does refresh change the result?:
```

## Final decision

- [ ] All mandatory behaviour checks performed.
- [ ] Provider gates resolved and verified.
- [ ] Backend authorization/retry/signature/security checks performed.
- [ ] Required feature gaps repaired or explicitly removed from scope.
- [ ] Real deployed golden journey passed.
- [ ] Final release evidence updated in the repository.

If a required item is FAIL, BLOCKED, or NOT RUN, this sheet does not authorize marking P13 complete.

## U2 upgrade case mappings

Use the current guide recipes on the intended upgraded target. These are blank case mappings, not agent-entered human outcomes; preserve provider/deployment/device limitations.

| ID       | Test                                                     | Result | Actual result / safe evidence |
| -------- | -------------------------------------------------------- | ------ | ----------------------------- |
| UP-U2-01 | Complete queue traversal and preserved Back context      |        |                               |
| UP-U2-02 | Queue hierarchy and clear-filter recovery                |        |                               |
| UP-U2-03 | Explicit reply/note audience and protected draft retry   |        |                               |
| UP-U2-04 | Customer/conversation/ticket relationship navigation     |        |                               |
| UP-U2-05 | Existing-field corrections and untouched teammate values |        |                               |
| UP-U2-06 | Current eligible teammate assignment and denial cases    |        |                               |
| UP-U2-07 | Readable before/after events and actor fallback          |        |                               |
| UP-U2-08 | Exact operational queue counts and unavailable state     |        |                               |
| UP-U2-09 | Later human override, leases and no duplicate effects    |        |                               |

## U3 upgrade case mappings

Use the current guide recipes on the intended upgraded target. These are blank human result rows; local agent evidence lives in QA.

| ID       | Test                                                 | Result | Actual result / safe evidence |
| -------- | ---------------------------------------------------- | ------ | ----------------------------- |
| UP-U3-01 | Library search/paging and optional creation          |        |                               |
| UP-U3-02 | Truthful readiness/ingestion/retry                   |        |                               |
| UP-U3-03 | Named adjacent evidence and historical fallback      |        |                               |
| UP-U3-04 | Deliberate protected draft adoption                  |        |                               |
| UP-U3-05 | Outcome-first run review and retained feedback       |        |                               |
| UP-U3-06 | Policy/handoff consequences and roles                |        |                               |
| UP-U3-07 | Final policy/evidence/current-state/lease boundaries |        |                               |
