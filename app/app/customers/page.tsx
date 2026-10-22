import { ListPagination } from '../../../components/support/list-pagination';
import {
  parseListParams,
  detailHref,
  type ListParams,
} from '../../../lib/support/list-navigation';
import { Disclosure } from '../../../components/shared/disclosure';
import { Timestamp } from '../../../components/shared/record-state';
import Link from 'next/link';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { listCustomers } from '../../../lib/support/queries';
import { CustomerForm } from '../../../components/support/support-forms';

export const metadata = {
  title: 'Customers',
  description: 'Customer directory.',
  robots: { index: false, follow: false },
};
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<ListParams>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  if (!active)
    return (
      <section className="workspace-card empty-state">
        <h1>Create a workspace first</h1>
        <p>Your customer directory will appear here after setup.</p>
      </section>
    );
  const filters = parseListParams(await searchParams, 'customers');
  const params = {
    q: filters.query,
    status: filters.status,
    priority: filters.priority,
  };
  let result;
  try {
    result = await listCustomers(supabase, active.id, params.q, filters.page);
  } catch {
    return (
      <section className="workspace-card error-state">
        <h1>Customers unavailable</h1>
        <p>We could not load customers. Refresh to retry.</p>
      </section>
    );
  }
  return (
    <div className="support-page">
      <div className="page-heading support-heading">
        <div>
          <p className="eyebrow">RELATIONSHIPS</p>
          <h1>Customers</h1>
          <p className="page-intro">
            One profile per customer identity, shared across conversations and
            tickets.
          </p>
        </div>
        {active.role !== 'viewer' && (
          <Disclosure label="Add customer" primary>
            <CustomerForm />
          </Disclosure>
        )}
      </div>
      <form className="filter-bar" role="search">
        <label className="sr-only" htmlFor="customer-search">
          Search customers
        </label>
        <input
          id="customer-search"
          name="q"
          placeholder="Search name, email, or company"
          defaultValue={params.q}
        />
        <button className="secondary-button" type="submit">
          Search
        </button>
        {(filters.query || filters.status || filters.priority) && (
          <Link className="quiet-link" href="/app/customers">
            Clear filters
          </Link>
        )}
      </form>
      <ListPagination kind="customers" filters={filters} count={result.count} />
      {result.rows.length === 0 ? (
        <section className="workspace-card empty-state">
          <h2>
            {filters.page > 0
              ? 'No records on this page'
              : params.q
                ? 'No customers match this search'
                : 'No customers yet'}
          </h2>
          <Link className="quiet-link" href="/app/customers">
            Clear filters
          </Link>
          <p>Add your first customer to start a support conversation.</p>
        </section>
      ) : (
        <ul className="support-list">
          {result.rows.map((row) => (
            <li key={row.id} className="support-row">
              <Link href={detailHref('customers', row.id, filters)}>
                <span className="support-row-top">
                  <strong>{row.name || 'Unnamed customer'}</strong>
                  <span className="support-count">
                    {row.email || 'No email'}
                  </span>
                </span>
                <span className="support-row-meta">
                  {row.company || 'Independent'} · Last seen{' '}
                  <Timestamp
                    value={row.last_seen_at}
                    timezone={active.timezone}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
