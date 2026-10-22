export const retryableIngestionErrors = [
  'EMBEDDING_UNAVAILABLE',
  'EMBEDDING_INVALID',
  'STORAGE_UNAVAILABLE',
  'PERSIST_FAILED',
  'WORKER_ERROR',
  'WORKER_TIMEOUT',
  'JOB_LIMIT',
];
export function canRetryIngestion(code: string | null) {
  return !code || retryableIngestionErrors.includes(code);
}
export function sourceReadiness(source: {
  status: string;
  enabled: boolean;
  chunk_count: number;
  error_code: string | null;
}) {
  const status = {
    uploading: [
      'Upload incomplete',
      'Waiting for the file upload to finish. Not available to AI.',
    ],
    queued: [
      'Waiting for indexing',
      'Queued for an indexing worker. Not available to AI until indexing succeeds.',
    ],
    processing: [
      'Indexing',
      'A worker claimed this source. Not available to AI until all new chunks are saved.',
    ],
    failed: [
      'Indexing failed',
      canRetryIngestion(source.error_code)
        ? 'An owner or admin can retry this source. It remains unavailable to AI.'
        : 'Correct the source, then delete it and add the corrected text or file. It remains unavailable to AI.',
    ],
    ready:
      source.chunk_count > 0
        ? [
            'Ready for AI',
            'Indexed content is eligible for retrieval. Each answer still needs to pass the AI policy gates.',
          ]
        : [
            'No indexed content',
            'No indexed chunks are recorded. Ask an owner or admin to reindex this source.',
          ],
  }[source.status] ?? [
    'Readiness unavailable',
    'Refresh or ask an admin to review the source.',
  ];
  return {
    label: source.enabled ? status[0] : 'Disabled',
    detail: source.enabled
      ? status[1]
      : `Excluded from new AI retrieval. ${status[0]}. Enable it only when you want AI to use its ready content.`,
    usable:
      source.enabled && source.status === 'ready' && source.chunk_count > 0,
  };
}
