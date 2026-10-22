# Support workflow upgrades

U2 is complete for its approved local/isolated scope; all assigned slice and exit checks passed. Current evidence lives in [QA](../.agent/QA.md) and [STATE](../.agent/STATE.md). These changes and migrations are local only until explicitly released. Provider/deployed proof remains U6/P13.

## Queues and return context

Inbox, Customers and Tickets show 25 records per page with exact filtered counts and Previous/Next navigation. Ordering uses activity followed by record ID, so equal timestamps remain deterministic. Search and filters run against the complete workspace dataset. Filtering starts at page one. Opening a record carries a validated return URL; its Back link restores search, status, priority and page. Invalid/repeated parameters normalize safely, and an out-of-range page offers First page. Paging uses document navigation to avoid a live-refresh race.

Queue rows distinguish subject/title, customer, actual owner, status, priority and workspace time. Clear filters recovers no-match lists. Unavailable related data is not presented as empty, and failed overview counts do not become zero. Unread/tag indicators remain in the existing gap register until their producers and controls are verified.

## Conversation and relationships

The header shows current status, priority and ownership. The composer states Public reply/customer audience or Internal note/team-only audience, and the private action is Save internal note. Human text, mode and retry identity survive incoming updates and recoverable failures. AI suggestions still require explicit adoption into an empty reply; no draft automatically replaces typing. Public replies are recorded in the conversation; a channel label does not establish an external email/API connector.

Customer profiles show conversation and ticket histories. Conversations show existing linked tickets, and tickets link the requester and original conversation. Histories have bounded previews, exact totals and filtered full-history links using the same server paging. Viewer access remains read-only.

## Corrections and ownership

Authorized owner/admin/agent users can open Edit customer details or Edit ticket details. Customer name/email/phone/company and ticket title/description/category corrections persist. Forms submit changed fields only, validate those fields, retain useful input after failure and reconcile refreshed values without submitting stale untouched data. Successful saves show canonical trimmed values and normalize customer email case; an unconfirmed network save retains the edits and asks you to review before retrying. Blank optional values and existing legacy values survive unrelated corrections. Customer email remains unique within the workspace; contact edits do not merge customers or rewrite external identities. Concurrent changes to the same field retain the last committed authorized value.

Routing includes Keep current assignment, Unassigned, Assign to me and actual current eligible teammates. Keep resolves ownership under the database lock. A chosen teammate must still be active with owner/admin/agent eligibility when saved; viewer/foreign/removed targets are rejected. Untouched status and priority are omitted, and a committed assignment returns to Keep current assignment before later saves. Server role and tenant checks remain authoritative.

Ticket creation time and history use the workspace timezone. Ticket history shows stored status/priority/assignment/title/category changes and truthful actor fallbacks. Description changes are identified without copying private descriptions into the event payload. Older sparse events explicitly say detailed changes were not recorded.

## Operational overview and human override

Overview links exact open/pending conversation and open/in-progress ticket counts to matching queues, alongside existing knowledge/AI readiness review. Missing counts say Unavailable; no readiness score or provider health is inferred.

A manual routing change, note, reply, handoff or newer customer input advances the record revision. Queued automatic work captures a database-owned revision and rule version; consumers lock and recheck the target at the final effect boundary. Leases and per-action receipts prevent duplicate effects during recovery. Stale work stops with a safe reason in existing history. A separately committed earlier effect cannot be recalled; stopped-run history discloses that completed count. The selected database batch consumer remains atomic. No new scheduler, channel or approval product was activated.

## Verification and operator recipes

[TESTING_GUIDE](../TESTING_GUIDE.md) cases C06/T03, C07/T04, C08/T05, OV01 and U2-HUMAN-01 map to UP-U2-01..09. [AI_TESTING_GUIDE](../AI_TESTING_GUIDE.md) maps the protected draft and override checks. Added result-template rows remain blank; record only work actually performed in the intended target.

Actual coverage: support-list-navigation/support-actions/support-timeline/support-overview unit tests; u2-browser traversal; u2-workflow-browser persisted tasks/roles/layout/error recovery; u2-persistence permissions/concurrent patches; u2-override final gates/leases/receipts; retained U0 consumer/security/draft regressions. See QA for exact commands, source digests, artifacts, failures and repairs.

Enlarged support text must wrap long contact/history links and the workbench brand so the Menu control remains within the viewport. Zoom acceptance waits for fonts and layout, and checks visible text/control bounds in addition to root scrolling.
