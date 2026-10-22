import { describe, expect, it } from 'vitest';
import {
  getConversation,
  getCustomer,
  getTicket,
  listConversations,
  listTickets,
} from '../../lib/support/queries';

function client(results: { data: unknown; error: unknown; count?: number }[]) {
  return {
    from() {
      const result = results.shift();
      if (!result) throw new Error('Unexpected query');
      const chain = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === 'then')
              return Promise.resolve(result).then.bind(Promise.resolve(result));
            return () => chain;
          },
        },
      );
      return chain;
    },
  } as never;
}
const ok = (data: unknown) => ({ data, error: null });
const failed = { data: null, error: { message: 'private diagnostic' } };

describe('UP-U0-07 related errors never become empty history', () => {
  it('fails both enriched lists if customer lookup fails', async () => {
    for (const query of [listConversations, listTickets])
      await expect(
        query(client([ok([{ id: 'r', customer_id: 'c' }]), failed]), 'w', {}),
      ).rejects.toThrow('Customer details');
  });
  it('fails conversation customer and message loads', async () => {
    await expect(
      getConversation(
        client([ok({ customer_id: 'c' }), failed, ok([])]),
        'w',
        'c',
      ),
    ).rejects.toThrow('Customer details');
    await expect(
      getConversation(
        client([ok({ customer_id: 'c' }), ok(null), failed]),
        'w',
        'c',
      ),
    ).rejects.toThrow('messages');
  });
  it('fails either customer history query', async () => {
    for (const history of [
      [failed, ok([])],
      [ok([]), failed],
    ])
      await expect(
        getCustomer(client([ok({ id: 'c' }), ...history]), 'w', 'c'),
      ).rejects.toThrow('history');
  });
  it('fails either ticket relationship or timeline', async () => {
    for (const related of [
      [failed, ok(null), ok([])],
      [ok(null), failed, ok([])],
      [ok(null), ok(null), failed],
    ])
      await expect(
        getTicket(
          client([ok({ customer_id: 'c', conversation_id: 'v' }), ...related]),
          'w',
          't',
        ),
      ).rejects.toThrow(/unavailable|timeline/);
  });
  it('retains legitimate missing relationships, empty histories and not found', async () => {
    expect(await getCustomer(client([ok(null)]), 'w', 'missing')).toBeNull();
    expect(
      await getCustomer(client([ok({ id: 'c' }), ok([]), ok([])]), 'w', 'c'),
    ).toMatchObject({ conversations: [], tickets: [] });
    expect(
      await getTicket(
        client([ok({ customer_id: null, conversation_id: null }), ok([])]),
        'w',
        't',
      ),
    ).toMatchObject({
      customers: null,
      conversations: null,
      ticket_events: [],
    });
  });
});
