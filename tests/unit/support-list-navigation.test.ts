import { describe, it, expect } from 'vitest';
import {
  parseListParams,
  listHref,
  listReturnHref,
  detailHref,
} from '../../lib/support/list-navigation';

describe('UP-U2-01 untrusted list navigation', () => {
  it('rejects malformed/repeated parameters and PostgREST grammar', () => {
    for (const page of ['-2', 'Infinity', '1.5', '9999999', ['2', '3']])
      expect(parseListParams({ page }, 'inbox').page).toBe(0);
    expect(
      parseListParams(
        {
          page: '3',
          status: 'resolved',
          priority: ['high'],
          q: 'a%,(id.eq.bad)',
        },
        'inbox',
      ),
    ).toEqual({ page: 2, status: '', priority: '', query: 'aid.eq.bad' });
  });
  it('preserves bounded filters/page through detail and safely reconstructs return URLs', () => {
    const filters = parseListParams(
      { q: 'older record', status: 'pending', priority: 'high', page: '3' },
      'tickets',
    );
    const href = listHref('tickets', filters);
    expect(href).toBe(
      '/app/tickets?q=older+record&status=pending&priority=high&page=3',
    );
    expect(detailHref('tickets', 'id', filters)).toContain(
      encodeURIComponent(href),
    );
    expect(listReturnHref('tickets', href)).toBe(href);
    for (const bad of [
      'https://evil.invalid',
      '//evil.invalid',
      '/app/inbox',
      '/app/tickets#bad',
      ['/app/tickets'],
    ])
      expect(listReturnHref('tickets', bad)).toBe('/app/tickets');
  });
});
