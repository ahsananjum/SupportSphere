# SupportSphere AI test results

Use with [AI_TESTING_GUIDE.md](../AI_TESTING_GUIDE.md). Copy into private notes before filling with accounts/screenshots. No test is pre-passed.

Choose one result: **PASS**, **FAIL**, **BLOCKED**, **NOT RUN**. For conditional model/timing tests, record safe behaviour separately from whether the target branch was exercised. Complete the subcase checklist too.

## Run identification

| Item                                      | Your value |
| ----------------------------------------- | ---------- |
| Date/time and timezone                    |            |
| APP / production or local                 |            |
| Tested web commit / deployment            |            |
| Supabase project / AI worker version      |            |
| Provider/model IDs (no key)               |            |
| QA workspace / RUN                        |            |
| Browser profiles / device                 |            |
| Relevant manual gates verified?           |            |
| Start/end time / provider limits observed |            |

## Primary test matrix

| ID   | Test                                                                   | Result | Actual evidence / reason / limitation |
| ---- | ---------------------------------------------------------------------- | ------ | ------------------------------------- |
| AI01 | Confirm the intended app and readiness                                 |        |                                       |
| AI02 | Create the isolated AI workspace from zero                             |        |                                       |
| AI03 | AI policy fields, validation, and baseline                             |        |                                       |
| AI04 | Add the exact knowledge article and prove indexing                     |        |                                       |
| AI05 | Install the real external widget and establish a fresh session         |        |                                       |
| AI06 | Off means no generation or automatic send                              |        |                                       |
| AI07 | Real Draft only answer with citations                                  |        |                                       |
| AI08 | Inspect the complete run, triage, quality, and evidence                |        |                                       |
| AI09 | Review/edit/send a draft, protect internal notes, avoid AI loops       |        |                                       |
| AI10 | Conversation follow-up uses evidence and bounded history               |        |                                       |
| AI11 | Helpful/unhelpful feedback persists and updates instead of duplicating |        |                                       |
| AI12 | Assisted auto reply sends exactly one grounded answer                  |        |                                       |
| AI13 | Product information from an uploaded source                            |        |                                       |
| AI14 | Tone/writing guidance and its safety boundary                          |        |                                       |
| AI15 | Optional intent exclusions                                             |        |                                       |
| AI16 | Confidence/evidence thresholds and honest branch coverage              |        |                                       |
| AI17 | Unknown questions must not become invented policies                    |        |                                       |
| AI18 | Disabled sources cannot answer; re-enable restores retrieval           |        |                                       |
| AI19 | Reindex/delete affect new AI runs without duplicating evidence         |        |                                       |
| AI20 | Markdown evidence, ready/error states, and PDF boundary                |        |                                       |
| AI21 | Explicit human request bypasses model generation                       |        |                                       |
| AI22 | Billing dispute never issues a refund                                  |        |                                       |
| AI23 | Security, privacy, deletion, data loss, and legal requests             |        |                                       |
| AI24 | Handoff latch, human response, release, and resumed AI                 |        |                                       |
| AI25 | Assigned conversations belong to the human                             |        |                                       |
| AI26 | Closed conversations suppress pending generation                       |        |                                       |
| AI27 | A newer customer message supersedes an older pending one               |        |                                       |
| AI28 | Policy changes and human intervention during processing                |        |                                       |
| AI29 | Retrieved prompt-injection document is quarantined                     |        |                                       |
| AI30 | Redact a public fake canary before provider-bound text                 |        |                                       |
| AI31 | Failed quality/citation/safety gates block automatic sending           |        |                                       |
| AI32 | Provider errors, retries, terminal handoff, and recovery               |        |                                       |
| AI33 | Idempotency, input limits, workspace allowance, and test pacing        |        |                                       |
| AI34 | Queue AI triage/draft actions must reach a real consumer               |        |                                       |
| AI35 | AI handoff notifications and escalation automation                     |        |                                       |
| AI36 | AI analytics reflect actual decisions and feedback                     |        |                                       |
| AI37 | Curated evaluation: exact matching, not automatic scenario generation  |        |                                       |
| AI38 | Viewer, Agent, Admin, and Owner AI permissions                         |        |                                       |
| AI39 | Another workspace cannot read or retrieve your knowledge/runs          |        |                                       |
| AI40 | Mobile, keyboard, loading, error, and recovery behaviour               |        |                                       |
| AI41 | Developer/operator checks beyond visible behaviour                     |        |                                       |
| AI42 | Complete the AI journey, record gaps, and restore safe state           |        |                                       |

## Subcases that must not disappear inside an aggregate PASS

Full triage fields require scoped developer inspection in AI41. Record the following variations separately from the main run and retrieved-document detector.

| Parent | Additional subcase                 | Result | Actual evidence |
| ------ | ---------------------------------- | ------ | --------------- |
| AI08   | Positive sentiment                 |        |                 |
| AI08   | Negative sentiment                 |        |                 |
| AI08   | Urgency / suggested priority       |        |                 |
| AI08   | Spanish language / schema          |        |                 |
| AI29   | Customer-origin instruction attack |        |                 |

| Parent | Subcase                                                         | Result | Observed branch / safe evidence |
| ------ | --------------------------------------------------------------- | ------ | ------------------------------- |
| AI13   | product_info classification and actual uploaded-source citation |        |                                 |
| AI14   | Valid writing guidance                                          |        |                                 |
| AI14   | Conflicting writing guidance cannot override safety             |        |                                 |
| AI15   | How-to exclusion                                                |        |                                 |
| AI15   | Product-information exclusion                                   |        |                                 |
| AI15   | Other-requests exclusion                                        |        |                                 |
| AI16   | Actual low-confidence gate                                      |        |                                 |
| AI16   | Actual weak-evidence gate                                       |        |                                 |
| AI18   | All sources disabled                                            |        |                                 |
| AI18   | Re-enabled retrieval recovery                                   |        |                                 |
| AI19   | Unchanged reindex without duplication                           |        |                                 |
| AI19   | Cancel and confirm source deletion                              |        |                                 |
| AI19   | New retrieval after deletion / historical trace                 |        |                                 |
| AI20   | Markdown retrieval                                              |        |                                 |
| AI20   | Readable text-PDF retrieval                                     |        |                                 |
| AI20   | Malformed PDF stays ineligible                                  |        |                                 |
| AI22   | Deterministic billing dispute                                   |        |                                 |
| AI22   | Model-classified refund request                                 |        |                                 |
| AI23   | Security incident                                               |        |                                 |
| AI23   | Privacy request                                                 |        |                                 |
| AI23   | Account deletion                                                |        |                                 |
| AI23   | Data loss                                                       |        |                                 |
| AI23   | Legal request                                                   |        |                                 |
| AI23   | Model-classified authentication/account change                  |        |                                 |
| AI24   | Handoff suppresses later question                               |        |                                 |
| AI24   | Human reply while latched                                       |        |                                 |
| AI24   | Explicit release and new-input recovery                         |        |                                 |
| AI25   | Assigned guard / unassigned recovery                            |        |                                 |
| AI26   | Closed guard actually exercised                                 |        |                                 |
| AI27   | Actual in-flight supersession                                   |        |                                 |
| AI28   | In-flight Off switch                                            |        |                                 |
| AI28   | In-flight Draft-only switch                                     |        |                                 |
| AI28   | New human reply                                                 |        |                                 |
| AI28   | New internal note                                               |        |                                 |
| AI28   | New assignment                                                  |        |                                 |
| AI29   | Malicious chunk actually retrieved and rejected                 |        |                                 |
| AI30   | Source canary redaction                                         |        |                                 |
| AI30   | Customer canary redaction                                       |        |                                 |
| AI31   | Unsafe instruction resisted                                     |        |                                 |
| AI31   | Actual failed-quality/citation branch                           |        |                                 |
| AI32   | Controlled adapter failure tests                                |        |                                 |
| AI32   | Live retry / terminal failure                                   |        |                                 |
| AI32   | Fresh-input recovery after provider restoration                 |        |                                 |
| AI33   | Reload / final-send dedupe                                      |        |                                 |
| AI33   | Client offline retry                                            |        |                                 |
| AI33   | 4000-character UI boundary                                      |        |                                 |
| AI33   | Actual same-client-ID server replay (developer)                 |        |                                 |
| AI33   | Actual workspace AI rate boundary (isolated developer)          |        |                                 |
| AI34   | Queue AI triage downstream consumer                             |        |                                 |
| AI34   | Queue AI draft downstream consumer                              |        |                                 |
| AI35   | High-priority escalation control                                |        |                                 |
| AI35   | Normal-to-High escalation trigger                               |        |                                 |
| AI35   | Custom notification and linked ticket dedupe                    |        |                                 |
| AI36   | Isolated +1 count check                                         |        |                                 |
| AI36   | Feedback / retrieval / escalation denominators                  |        |                                 |
| AI37   | known-grounded seed expectation reconciliation                  |        |                                 |
| AI37   | no-evidence reason comparison                                   |        |                                 |
| AI37   | human-request exact match                                       |        |                                 |
| AI37   | billing-sensitive reason comparison                             |        |                                 |
| AI37   | draft-mode exact match with citation                            |        |                                 |
| AI38   | Viewer                                                          |        |                                 |
| AI38   | Agent                                                           |        |                                 |
| AI38   | Admin                                                           |        |                                 |
| AI38   | Direct forbidden writes (developer)                             |        |                                 |
| AI39   | Foreign run/source direct access denied                         |        |                                 |
| AI39   | Foreign knowledge excluded from original AI                     |        |                                 |
| AI39   | Optional authorized Outside retrieval positive control          |        |                                 |
| AI40   | All required widths                                             |        |                                 |
| AI40   | Keyboard/focus/reduced motion                                   |        |                                 |
| AI40   | Loading/failed saves/offline recovery                           |        |                                 |
| AI41   | Full triage/quality schema                                      |        |                                 |
| AI41   | RLS/RPC/Storage/Realtime attacks                                |        |                                 |
| AI41   | Send races / leases / duplicate finalization                    |        |                                 |
| AI41   | Provider/context/secret isolation                               |        |                                 |
| AI41   | Advisor review / deployment parity                              |        |                                 |
| AI42   | Final fresh grounded draft + assisted send                      |        |                                 |
| AI42   | Required gaps resolved / explicit scope recorded                |        |                                 |
| AI42   | Cleanup complete                                                |        |                                 |

## Evidence record: copy once for each run

| Field                                             | Value |
| ------------------------------------------------- | ----- |
| Test / subcase ID                                 |       |
| Conversation URL / input accepted at              |       |
| AI run URL                                        |       |
| Exact synthetic input                             |       |
| Saved policy mode/version / thresholds            |       |
| Enabled ready sources                             |       |
| Status / disposition / reason / error             |       |
| Provider / model / prompt version                 |       |
| Attempts / latency / usage where available        |       |
| Intent / confidence / evidence score              |       |
| Quality / grounding / safety                      |       |
| Citation source/chunk and supporting snippet      |       |
| Customer-visible response count before human send |       |
| Human send/release/notification/ticket evidence   |       |
| Target branch actually exercised?                 |       |
| Safe screenshot / actual result                   |       |

Never include a bearer token, email-link token, provider key, private password, service key, or raw HAR. Synthetic answers/canaries are safe test content; genuine customer content is not required.

## Gap / bug report

- Test ID and role:
- APP / tested commit:
- Selected workspace:
- Exact steps and synthetic input:
- Expected:
- Actual:
- Status/decision/reason and safe timestamp:
- Evidence URL/screenshot with secrets removed:
- Reproduced consistently or timing-dependent:
- Requirement / source concern:
- Owner setup missing, implementation defect, or branch NOT RUN:
- Next verification action:

## Final decision

- [ ] Real indexed evidence and the intended external widget were used.
- [ ] Real Gemini draft and assisted-send positive cases passed with citations.
- [ ] Off/Draft-only and all required sensitive gates passed.
- [ ] Human takeover/release and feedback persist correctly.
- [ ] No duplicate, stale, unsupported, or cross-tenant automatic reply was observed.
- [ ] Conditional cases have actual branch evidence or remain explicitly NOT RUN.
- [ ] AI automation/evaluation/trigger gaps are resolved or explicitly scoped.
- [ ] Mobile/error/accessibility and deeper backend/security evidence are recorded.
- [ ] Synthetic fixture cleanup and restored policy are recorded.
- [ ] P13 release status is based on the full release gate, not this document's existence.

AI test outcome:

Remaining failures / blockers / unexercised branches:

P13 status (IN_PROGRESS / BLOCKED_MANUAL / VERIFYING / COMPLETE):

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
