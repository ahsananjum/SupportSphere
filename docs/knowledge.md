# P06 knowledge ingestion

## Supported sources

The app accepts pasted text or Markdown and uploads of UTF-8 TXT/MD or text PDFs. The app upload limit is 4 MiB (to fit the web request boundary); the private Storage bucket has a 5 MiB backstop. Pasted text and extracted text are limited to 80,000 characters, PDFs to 80 pages, and a source to 200 chunks. Scanned/image-only PDFs fail with a safe request to run OCR before uploading. DOCX and URL sources are not offered because their extraction and, for URLs, SSRF controls have not been verified.

## Processing and lifecycle

Creating a paste source inserts a source and queued job in one transaction. For a file, the owner/admin first reserves an `uploading` source, uploads to the exact private path `workspace/{workspaceId}/knowledge/{sourceId}/original`, and then queues the job. The authenticated Storage policy checks the source, path, and current workspace role. The cron job calls a deployed Edge Function every minute with a random token stored in Supabase Vault; the worker verifies it through a service-only RPC. No browser request waits for indexing.

A separate five-minute cron recovers upload reservations older than ten minutes. It queues a file that reached Storage but lost the browser response; a reservation without a file becomes `UPLOAD_INCOMPLETE` with a delete-and-upload-again instruction. Queue saturation becomes a visible `JOB_LIMIT` failure. A workspace can create at most 100 ingestion jobs in a rolling hour. Recovery checks the exact source Storage path and locks each source before transition, so repeated recovery runs cannot enqueue it twice.

The worker leases one queued job for four minutes, rechecks the source and file, extracts text, normalizes Unicode/line breaks, splits PDF pages into documents, makes deterministic overlapping chunks (800 characters with 100-character overlap), and uses Supabase Edge's built-in `gte-small` model for 384-dimensional embeddings. One database RPC replaces documents/chunks and marks the source ready in the same transaction. Ready cannot be observed with only partial new chunks. The HNSW cosine index and full-text GIN index support later retrieval; the search RPC requires current workspace membership and excludes disabled/non-ready sources.

An unchanged normalized content hash keeps existing document/chunk IDs on reindex, even though extraction and embedding are rerun. Equal content in *different* sources is allowed, since the owner may intentionally give it different names or access states. A content change replaces that source's documents/chunks atomically. Old chunks are not available to retrieval while reindex status is queued/processing. Failed reindex leaves old rows for recovery, but retrieval excludes them until a successful retry.

The job lease, attempt, next-run time, and safe error are persisted. Transient failures retry after 15 then 30 seconds, with three attempts maximum; permanent extraction errors fail immediately. A worker crash is recovered when its lease expires. Job/source status and safe error are shown in the UI. Structured worker logs include job/source IDs, attempt, error class, and counts, without source text or embeddings.

Only owners/admins can create, retry, reindex, toggle, or delete a source; all members can read. Source creation is limited to 30 per workspace per hour and 500 total. The UI offers Retry for recoverable worker failures and directs permanent upload/extraction failures to deletion and corrected re-upload. Authenticated Storage deletion rechecks the current owner/admin role and exact path. Deletion removes the private object, cascades documents/chunks/jobs, and writes an audit event. If object removal fails, the action leaves the source intact and shows an error.

## Environment setup

Apply all four P06 migrations, regenerate Supabase types, deploy `knowledge-worker` with JWT verification disabled, and create the `knowledge_worker_url` Vault entry with that environment's exact Supabase project origin. The first migration creates the random `knowledge_worker_token` Vault secret and worker cron schedule; the fourth creates the upload-recovery cron. The Edge Function still requires the token through its private RPC; disabling platform JWT verification does not make work public. The project URL is environment-specific operational configuration and must not be hardcoded into the migration. The live SupportSphere project uses `https://xviumgygixcklrbuynoh.supabase.co` in its Vault entry. Neither Vault secret value nor service role key belongs in source or chat.

Verify after deployment with a real queued source, `ingestion_jobs` lifecycle, Edge logs, Storage RLS probes, PDF extraction/failure, and Supabase advisors. The opt-in live suite is `P06_LIVE_TEST_PROJECT_REF=xviumgygixcklrbuynoh node --env-file=.env tests/live/p06-knowledge.mjs`; it creates and cleans temporary workspaces/users/files.
