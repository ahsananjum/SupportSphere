# Shared operational UI

U1 refines existing controls with the paper/ink/mint tokens. This document describes source behavior; dated proof is in [.agent/QA.md](../.agent/QA.md). Provider/release and actual-device checks remain U6/P13 and U5/U6 respectively.

## Headings and spacing — U1.1

`components/shared/page-heading.tsx` owns PageHeading and SectionHeading. Inbox, conversation detail and General settings are the initial consumers. A page has one semantic h1, optional context/description and a wrapping action area aligned with its baseline. Titles range from 24–36px; long names wrap. App gutters are 24–32px desktop and 16px mobile. SectionHeading keeps h2/description spacing consistent. Existing fonts and tokens are retained.

## Fields and feedback — U1.2

`components/shared/form-feedback.tsx` owns fieldDescription, FieldError and FormFeedback. General settings and support forms use actual control IDs for errors; help and errors can both describe the control. Errors remain inline, action failures use alert, pending/success use a polite status region. Pending hides stale success. Fields retain useful input after recoverable failures and React's automatic reset is prevented on these forms. The composer retains its U0 explicit adoption and retry identity.

## Record states and time — U1.3

`components/shared/record-state.tsx` owns StatusChip, Timestamp and StatePanel. `lib/ui/presentation.ts` maps stored vocabulary to readable labels; unknown states say Status unavailable. Timestamp uses an explicit workspace timezone (UTC fallback), semantic datetime and a visible timezone; invalid time says Time unavailable. StatePanel separates empty, unavailable/error, permission and loading without inventing a count. Inbox and the app loading/error boundaries use these patterns. These are presentation helpers; server role and tenant checks remain authoritative.

## Navigation — U1.4

Existing destinations are grouped into Work, Operations, Workspace and Settings. General/widget/AI/integrations settings remain owner/admin only; Security remains owner only. Onboarding still shows Setup until complete. The current workspace selector and selected destination remain explicit. The desktop sidebar and mobile drawer scroll at short heights so account controls remain reachable.

## Drawers, confirmations and disclosures — U1.5

The mobile workspace drawer isolates the header, main content and skip link, locks body scrolling, keeps Tab inside, and includes an internal Close workspace menu control. Escape/close restores Menu focus; choosing a destination focuses main content. Native modal confirmations start on Cancel, support Escape, name the affected source/destination, and preserve the original named submit button only after Confirm. Knowledge deletion, endpoint revocation/test and signing-secret rotation use this pattern. Cancellation does not submit. All existing server role and policy checks still run after confirmation.

Shared Disclosure keeps native summary keyboard behavior and adds Escape to close and return focus. Customer/ticket creation and endpoint editing stay in document flow instead of clipping an absolute panel on phones. Expanded forms retain their existing handlers and validation.

## Verify the reference task

1. Open Inbox, a long-subject conversation and General settings at 320/360/390/768/1024/1440px. Check h1/action/gutters and document overflow.
2. In General settings submit an invalid timezone; check the error's association, retained input/help, and absence of success. Correct/save, refresh and verify persistence. During a pending save check that repeated submit is unavailable.
3. Check a conversation's readable status/priority and explicit workspace time. Exercise a true empty Inbox and an isolated read failure separately: the failure must not imply an empty queue.
4. With owner/admin/agent/viewer, check group membership and direct route denial. At 1440×480 and 390×420 scroll to Sign out and back to the workspace selector; no destination disappears. At phone/tablet widths, open Menu, cycle Tab/Shift+Tab, attempt background focus, close with Escape/Close and follow a destination. Verify focus and body-scroll restoration.
5. Expand Add customer/Create ticket/Edit endpoint with Enter. Move inside and press Escape; the summary regains focus. Open a destructive confirmation on disposable data, cancel with Escape and Cancel, verify persistence is unchanged, then confirm once and verify the real record/audit outcome. Check long target names and short-height scrolling. Do not use a live customer record for this check.

Do not enter results in owner/AI result sheets until a human actually runs their assigned cases. Automated emulation is not actual-phone keyboard or screen-reader proof.

## Style ownership — U1.6

Shell rules now live in components/shared/app-navigation.module.css, scoped beneath the component root. Stable existing class hooks remain for browser tests. Forty-three shell-owned rules were removed from globals, including mobile/reduced-motion rules; older unrelated global styles remain for incremental adoption. Heading, record state, disclosure and confirmation styles have their own modules. Production comparisons cover public/login/invite at390/1440 while authenticated references cover six widths and role/keyboard states. Reference captures wait for fonts and the existing auth entrance animation to settle; no UI golden baseline is silently accepted.

## Automated-action feedback — U1.7

AutomatedActionState shares readable queued/processing/retrying/completed/skipped/failed feedback across conversation suggestions, AI lists/inspectors, rule history and webhook attempts. Retrying is derived only from persisted queued state after an attempted claim. Queued/processing never implies completion. Rule completion explicitly sends the reader to AI runs for downstream generation; triage completion does not mean a customer reply. Drafts require review and deliberate Use this draft (with a protected replacement choice for existing writing), with sending a separate human action. Known reason codes have safe explanatory copy and existing next steps; unknown codes do not leak into primary labels. Original run/policy/technical evidence remains in the inspector. Existing Off/policy/handoff/rule/endpoint/tenant/role gates are unchanged.

UP-U1-07: review all six statuses and a failed/stale decision, inspect a draft and its evidence, type human text and verify adoption is disabled, clear/adopt explicitly and verify no message is sent. Check rule-dispatch copy and delivery attempts without inferring provider success. Controlled persisted status fixtures prove presentation only; actual execution stays with the isolated producer/consumer and U6/P13 evidence.

Existing operational headings that still use the legacy page-heading hook inherit the same24–36px scale within the scoped shell. Field errors retain live alert semantics as well as control associations. Final browser coverage also exercises200% text enlargement, true empty data and touch emulation; these are distinct from actual-device/screen-reader review.
