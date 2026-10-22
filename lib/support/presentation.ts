import { statusLabel } from '../ui/presentation';

/** Labels reflect persisted authorship, never the fact that the viewer is an agent. */
export function assigneeLabel(
  id: string | null,
  members: { id: string; label: string }[],
) {
  return id
    ? (members.find((member) => member.id === id)?.label ??
        'Former or unavailable teammate')
    : 'Unassigned';
}

export function messageAuthorLabel(
  message: { sender_type: string; sender_user_id: string | null },
  currentUserId: string,
) {
  if (message.sender_type === 'customer') return 'Customer';
  const author =
    message.sender_user_id === currentUserId
      ? 'You'
      : message.sender_user_id
        ? 'Teammate'
        : 'Support agent';
  return message.sender_type === 'note' ? `Internal note · ${author}` : author;
}

export function aiOutcomeLabel(run: {
  status: string;
  decision: string | null;
  run_type?: string;
}) {
  if (run.status === 'failed') return 'AI run failed';
  if (run.status === 'skipped') return 'AI run skipped';
  if (run.status === 'queued') return 'AI run queued';
  if (run.status === 'processing') return 'AI is processing';
  if (run.status !== 'completed') return 'AI status unavailable';
  if (run.status === 'completed' && run.run_type === 'triage')
    return 'AI triage complete';
  if (run.decision === 'draft') return 'Draft for human review';
  if (run.decision === 'escalated') return 'AI handed this to a human';
  if (run.decision === 'auto_sent') return 'AI replied';
  if (run.decision === 'skipped') return 'AI run skipped';
  return 'AI run completed';
}

export function ticketEventLabel(
  event: {
    event_type: string;
    payload: unknown;
  },
  members: { id: string; label: string }[] = [],
) {
  if (event.event_type === 'created') return 'Ticket created';
  if (event.event_type !== 'updated') return 'Ticket activity recorded';
  const payload =
    event.payload &&
    typeof event.payload === 'object' &&
    !Array.isArray(event.payload)
      ? (event.payload as Record<string, unknown>)
      : {};
  const changes: string[] = [];
  if (
    Object.hasOwn(payload, 'from_assignee_user_id') &&
    Object.hasOwn(payload, 'to_assignee_user_id') &&
    payload.from_assignee_user_id !== payload.to_assignee_user_id
  )
    changes.push(
      `Assignment: ${assigneeLabel(typeof payload.from_assignee_user_id === 'string' ? payload.from_assignee_user_id : null, members)} → ${assigneeLabel(typeof payload.to_assignee_user_id === 'string' ? payload.to_assignee_user_id : null, members)}`,
    );
  if (payload.description_changed === true) changes.push('Description changed');
  for (const [field, label] of [
    ['status', 'Status'],
    ['priority', 'Priority'],
  ] as const) {
    const from = payload[`from_${field}`],
      to = payload[`to_${field}`];
    if (typeof from === 'string' && typeof to === 'string' && from !== to)
      changes.push(`${label}: ${statusLabel(from)} → ${statusLabel(to)}`);
  }
  for (const [field, label] of [
    ['title', 'Title'],
    ['description', 'Description'],
    ['category', 'Category'],
  ] as const)
    if (
      Object.hasOwn(payload, `from_${field}`) &&
      Object.hasOwn(payload, `to_${field}`) &&
      payload[`from_${field}`] !== payload[`to_${field}`]
    )
      changes.push(
        field === 'description'
          ? `${label} changed`
          : `${label}: ${typeof payload[`from_${field}`] === 'string' && payload[`from_${field}`] ? payload[`from_${field}`] : 'None'} → ${typeof payload[`to_${field}`] === 'string' && payload[`to_${field}`] ? payload[`to_${field}`] : 'None'}`,
      );
  return changes.length
    ? changes.join(' · ')
    : 'Ticket updated · Detailed changes were not recorded';
}

export function eventActorLabel(
  id: string | null,
  currentId: string,
  members: { id: string; label: string }[],
) {
  if (!id) return 'System or unavailable actor';
  return id === currentId ? 'You' : assigneeLabel(id, members);
}
