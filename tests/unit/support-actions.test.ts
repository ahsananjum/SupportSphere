import { beforeEach, describe, expect, it, vi } from 'vitest';

const { context, rpc } = vi.hoisted(() => ({ context: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/workspaces/context', () => ({
  getWorkspaceContext: context,
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(url);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
import {
  updateConversation,
  updateTicket,
  updateCustomerDetails,
  updateTicketDetails,
} from '../../app/app/support-actions';

describe('UP-U0-01 routing assignment intent', () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ error: null });
    context.mockResolvedValue({
      supabase: { rpc },
      active: { id: 'workspace', role: 'agent' },
      user: { id: 'agent-b' },
    });
  });
  for (const [kind, action] of [
    ['conversation', updateConversation],
    ['ticket', updateTicket],
  ] as const) {
    for (const assignment of [null, 'keep', 'me', 'unassigned']) {
      it(`${kind}: sends explicit ${assignment ?? 'missing → keep'} intent rather than a guessed owner`, async () => {
        const form = new FormData();
        form.set(`${kind}Id`, 'record');
        form.set('priority', 'high');
        if (assignment) form.set('assignee', assignment);
        await expect(action(form)).rejects.toThrow('notice=updated');
        expect(rpc).toHaveBeenCalledWith(
          `update_${kind}_routing`,
          expect.objectContaining({
            p_assignment: assignment ?? 'keep',
            p_priority: 'high',
          }),
        );
        expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_assignee_user_id');
      });
    }
    it(`${kind}: viewer cannot write`, async () => {
      context.mockResolvedValue({
        supabase: { rpc },
        active: { id: 'workspace', role: 'viewer' },
        user: { id: 'viewer' },
      });
      const form = new FormData();
      form.set(`${kind}Id`, 'record');
      await expect(action(form)).rejects.toThrow('error=permission');
      expect(rpc).not.toHaveBeenCalled();
    });
    it(`${kind}: rejects unknown assignment without mutation`, async () => {
      const form = new FormData();
      form.set(`${kind}Id`, 'record');
      form.set('assignee', 'agent-a');
      await expect(action(form)).rejects.toThrow('error=update');
      expect(rpc).not.toHaveBeenCalled();
    });
  }
});

describe('UP-U2-05 UP-U2-06 validated patches and explicit teammate routing', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ error: null });
    context.mockResolvedValue({
      supabase: { rpc },
      active: { id: 'workspace', role: 'agent' },
      user: { id: 'actor' },
    });
  });
  it('sends only edited fields rather than schema defaults or stale untouched values', async () => {
    const form = new FormData();
    form.set('recordId', id);
    form.set('changes', JSON.stringify({ company: 'Corrected company' }));
    expect(await updateCustomerDetails({}, form)).toEqual({
      success: 'Customer details saved.',
      values: { company: 'Corrected company' },
    });
    expect(rpc).toHaveBeenCalledWith('update_customer_fields', {
      p_workspace_id: 'workspace',
      p_customer_id: id,
      p_changes: { company: 'Corrected company' },
    });
  });
  it('returns saved canonical values for normalization-aware editor reconciliation', async () => {
    const form = new FormData();
    form.set('recordId', id);
    form.set(
      'changes',
      JSON.stringify({ email: ' NEW@EXAMPLE.INVALID ', phone: ' 54321 ' }),
    );
    expect(await updateCustomerDetails({}, form)).toEqual({
      success: 'Customer details saved.',
      values: { email: 'new@example.invalid', phone: '54321' },
    });
    expect(rpc).toHaveBeenCalledWith('update_customer_fields', {
      p_workspace_id: 'workspace',
      p_customer_id: id,
      p_changes: { email: 'new@example.invalid', phone: '54321' },
    });
  });
  it('rejects unknown mutation keys and preserves safe field validation', async () => {
    const form = new FormData();
    form.set('recordId', id);
    form.set('changes', JSON.stringify({ workspace_id: 'other' }));
    expect((await updateCustomerDetails({}, form)).message).toContain('Check');
    expect(rpc).not.toHaveBeenCalled();
    form.set('changes', JSON.stringify({ title: '  ' }));
    expect((await updateTicketDetails({}, form)).fields).toHaveProperty(
      'title',
    );
    expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects viewer edits server-side and associates duplicate-email feedback', async () => {
    const form = new FormData();
    form.set('recordId', id);
    form.set('changes', JSON.stringify({ email: 'other@example.invalid' }));
    context.mockResolvedValueOnce({
      supabase: { rpc },
      active: { id: 'workspace', role: 'viewer' },
    });
    expect((await updateCustomerDetails({}, form)).message).toContain(
      'permission',
    );
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValueOnce({
      error: { code: '23505', message: 'private internal diagnostic' },
    });
    expect(await updateCustomerDetails({}, form)).toEqual({
      message: 'Another customer already uses that email in this workspace.',
      fields: {
        email: 'Use a different email or review the existing customer.',
      },
    });
  });
  it('sends a selected UUID to the authoritative atomic teammate-routing RPC', async () => {
    const form = new FormData();
    form.set('conversationId', id);
    form.set('assignee', id);
    await expect(updateConversation(form)).rejects.toThrow('notice=updated');
    expect(rpc).toHaveBeenCalledWith('update_support_routing', {
      p_workspace_id: 'workspace',
      p_entity_type: 'conversation',
      p_entity_id: id,
      p_status: null,
      p_priority: null,
      p_assignment: 'teammate',
      p_assignee_id: id,
    });
  });
});
