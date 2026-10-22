const labels: Record<string, string> = {
  open: 'Open',
  pending: 'Pending',
  closed: 'Closed',
  in_progress: 'In progress',
  resolved: 'Resolved',
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
  queued: 'Queued',
  processing: 'Processing',
  retrying: 'Retrying',
  completed: 'Completed',
  succeeded: 'Completed',
  skipped: 'Skipped',
  failed: 'Failed',
  ready: 'Ready',
  uploading: 'Uploading',
  extracting: 'Extracting',
  embedding: 'Indexing',
  deleted: 'Deleted',
  draft: 'Draft for review',
  auto_sent: 'Reply sent',
  escalated: 'Human review needed',
};
export function statusLabel(value: string | null | undefined) {
  return value ? (labels[value] ?? 'Status unavailable') : 'Status unavailable';
}
export function timestampLabel(value: string, timezone = 'UTC') {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(date);
  } catch {
    return null;
  }
}
