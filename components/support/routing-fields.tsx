'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { assigneeLabel } from '../../lib/support/presentation';

export function RoutingFields({
  kind,
  status,
  priority,
  assigneeId,
  members,
  currentUserId,
  revision,
}: {
  currentUserId: string;
  revision: number;
  kind: 'conversation' | 'ticket';
  status: string;
  priority: string;
  assigneeId: string | null;
  members: { id: string; role: string; label: string }[];
}) {
  const [fields, setFields] = useState({
    receivedRevision: revision,
    assignment: { value: 'keep', dirty: false },
    receivedStatus: status,
    receivedPriority: priority,
    status: { value: status, dirty: false },
    priority: { value: priority, dirty: false },
  });
  // Reconcile refreshed server values before rendering; preserve only unsaved edits.
  if (
    fields.receivedStatus !== status ||
    fields.receivedPriority !== priority ||
    fields.receivedRevision !== revision
  ) {
    setFields({
      ...fields,
      receivedRevision: revision,
      assignment:
        !fields.assignment.dirty ||
        (fields.assignment.value === 'unassigned'
          ? assigneeId === null
          : fields.assignment.value === 'me'
            ? assigneeId === currentUserId
            : assigneeId === fields.assignment.value)
          ? { value: 'keep', dirty: false }
          : fields.assignment,
      receivedStatus: status,
      receivedPriority: priority,
      status:
        fields.status.dirty && fields.status.value !== status
          ? fields.status
          : { value: status, dirty: false },
      priority:
        fields.priority.dirty && fields.priority.value !== priority
          ? fields.priority
          : { value: priority, dirty: false },
    });
  }
  const { pending } = useFormStatus();
  return (
    <>
      <div className="field">
        <label htmlFor={`${kind}-status`}>Status</label>
        <select
          id={`${kind}-status`}
          name={fields.status.dirty ? 'status' : undefined}
          value={fields.status.value}
          onChange={(e) =>
            setFields((v) => ({
              ...v,
              status: {
                value: e.target.value,
                dirty: e.target.value !== status,
              },
            }))
          }
          disabled={pending}
        >
          <option value="open">Open</option>
          {kind === 'ticket' && (
            <option value="in_progress">In progress</option>
          )}
          <option value="pending">Pending</option>
          {kind === 'ticket' && <option value="resolved">Resolved</option>}
          <option value="closed">Closed</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${kind}-priority`}>Priority</label>
        <select
          id={`${kind}-priority`}
          name={fields.priority.dirty ? 'priority' : undefined}
          value={fields.priority.value}
          onChange={(e) =>
            setFields((v) => ({
              ...v,
              priority: {
                value: e.target.value,
                dirty: e.target.value !== priority,
              },
            }))
          }
          disabled={pending}
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${kind}-assignee`}>Assignment</label>
        <select
          id={`${kind}-assignee`}
          name="assignee"
          value={fields.assignment.value}
          onChange={(event) =>
            setFields((current) => ({
              ...current,
              assignment: {
                value: event.target.value,
                dirty: event.target.value !== 'keep',
              },
            }))
          }
          disabled={pending}
        >
          <option value="keep">
            Keep current assignment ({assigneeLabel(assigneeId, members)})
          </option>
          <option value="unassigned">Unassigned</option>
          <option value="me">Assign to me</option>
          {members
            .filter((member) =>
              ['owner', 'admin', 'agent'].includes(member.role),
            )
            .map((member) => (
              <option key={member.id} value={member.id}>
                {member.label} · {member.role}
              </option>
            ))}
        </select>
      </div>
    </>
  );
}
