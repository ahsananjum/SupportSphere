export type SupportList = 'inbox' | 'customers' | 'tickets';
export type ListParams = Record<string, string | string[] | undefined>;
export const PAGE_SIZE = 25;
export type ListFilters = {
  query: string;
  status: string;
  priority: string;
  page: number;
  customerId?: string;
  conversationId?: string;
};

/** URLs are untrusted, including repeated keys and return destinations. */
export function parseListParams(
  params: ListParams,
  kind: SupportList,
): ListFilters {
  const single = (key: string) =>
    typeof params[key] === 'string' ? (params[key] as string) : '';
  const statuses =
    kind === 'inbox'
      ? ['open', 'pending', 'closed']
      : kind === 'tickets'
        ? ['open', 'in_progress', 'pending', 'resolved', 'closed']
        : [];
  const page = single('page');
  const id = (key: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      single(key),
    )
      ? single(key)
      : undefined;
  return {
    query: single('q')
      .slice(0, 200)
      .replace(/[^\p{L}\p{N}\s@.\-+]/gu, '')
      .trim(),
    status: statuses.includes(single('status')) ? single('status') : '',
    priority:
      kind !== 'customers' &&
      ['low', 'normal', 'high', 'urgent'].includes(single('priority'))
        ? single('priority')
        : '',
    page: /^\d{1,6}$/.test(page) && Number(page) > 0 ? Number(page) - 1 : 0,
    ...(kind !== 'customers' && id('customer')
      ? { customerId: id('customer') }
      : {}),
    ...(kind === 'tickets' && id('conversation')
      ? { conversationId: id('conversation') }
      : {}),
  };
}

export function listHref(
  kind: SupportList,
  filters: ListFilters,
  page = filters.page,
) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.customerId) params.set('customer', filters.customerId);
  if (filters.conversationId)
    params.set('conversation', filters.conversationId);
  if (page > 0) params.set('page', String(page + 1));
  return `/app/${kind}${params.size ? '?' + params : ''}`;
}

export function listReturnHref(kind: SupportList, value: unknown) {
  if (typeof value !== 'string') return `/app/${kind}`;
  const [pathname, query = ''] = value.split('?');
  if (pathname !== `/app/${kind}` || value.includes('#') || value.length > 2000)
    return `/app/${kind}`;
  const params = new URLSearchParams(query);
  const input: ListParams = {};
  for (const key of [
    'q',
    'status',
    'priority',
    'page',
    'customer',
    'conversation',
  ])
    input[key] = params.getAll(key).length === 1 ? params.get(key)! : undefined;
  return listHref(kind, parseListParams(input, kind));
}

export function detailHref(
  kind: SupportList,
  id: string,
  filters: ListFilters,
) {
  return `/app/${kind}/${id}?returnTo=${encodeURIComponent(listHref(kind, filters))}`;
}
