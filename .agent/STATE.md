# Current State

Active phase: P06
Status: COMPLETE
Last updated: 2026-10-07
Current branch: master
Last known good implementation: P06 change set; final gate recorded in `.agent/QA.md`

## Objective

Complete durable, tenant-safe knowledge ingestion for pasted text, TXT/MD, and text PDFs with real embeddings, lifecycle, retry/reindex/delete, and verification.

## Completed in P06

- [x] Read repository rules, phase, PRD, architecture, design, agent files, installed Next.js guidance, and Supabase/Postgres guidance; inspected clean P05 baseline and remote schema.
- [x] Applied all four P06 migrations through `20261007031612_p06_abandoned_upload_recovery.sql` to project `xviumgygixcklrbuynoh`; regenerated live types.
- [x] Deployed `knowledge-worker` Edge Function; configured environment-specific project URL in Vault; verified active pg_cron job and worker token authorization.
- [x] Implemented private storage paths, RLS, role-checked actions, real UI, extraction/chunking/embeddings, transactional ready state, bounded retries, reindex/delete, search boundary, and onboarding entry.
- [x] Live database suite passed text PDF success, malformed PDF failure, oversized file, unauthorized storage path, cross-tenant reads/vector lookup, idempotent reindex, retry after simulated transient embedding failure, and both abandoned-upload recovery paths.
- [x] Authenticated production-build browser journey passed at 320, 360, 390, 768, and 1024 px; real paste/upload/preview/toggle/delete and storage cleanup passed after repairing delete navigation.
- [x] Initial typecheck, lint, unit suite (23 passed, 3 opt-in skipped), and production build passed. Supabase security/performance advisors reviewed.

## Remaining

- [x] Applied and verified authenticated Storage delete policy, reran live browser/storage tests, and visually inspected the settled 390 px form and drawer.
- [x] Repaired abandoned upload lifecycle, verified it live, and set VERIFYING for the full formal gate.
- [x] Final full gate, QA matrix, and handoff completed; MCP verified no temporary P06 rows/files.

## Current schema/migrations

Remote migrations include P06 through `20261007031612`. New RLS tables: `knowledge_sources`, `knowledge_documents`, `knowledge_chunks`, `ingestion_jobs`; private `knowledge-private` bucket. Types were regenerated from this live schema.

## Current integrations

Supabase Edge worker uses built-in gte-small inference; no new owner credential. Cron calls the worker each minute with a Vault-generated token. P06 web changes are verified against a local production build but are not yet deployed to Vercel. No Vercel MCP is available.

## Known notes

- Default shell sandbox helper fails setup; approved escalated shell works.
- Security advisor reports six intentional authenticated SECURITY DEFINER knowledge RPCs. Every one checks current membership/role and workspace scope. Existing service-only no-policy notices and leaked-password-protection warning remain. Performance advisor reports unused vector/FTS indexes on the sparse project.
- URL and DOCX source types are deliberately not exposed; their parsing/SSRF path is unverified.
- A `NoFallbackError` during a concurrent browser run was traced to the regression suite's intentional missing-page request on the shared server. The final P06 browser journey was rerun alone and its server log was clean.

## Next exact actions

1. P06 is complete. Preserve its applied migrations and live worker configuration.
2. Start P07 only on owner request; P06 web code has not been deployed to Vercel.
