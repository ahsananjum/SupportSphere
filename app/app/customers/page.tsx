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
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  if (!active)
    return (
      <section className="workspace-card empty-state">
        <h1>Create a workspace first</h1>
        <p>Your customer directory will appear here after setup.</p>
      </section>
    );
  const params = await searchParams;
  let result;
  try {
    result = await listCustomers(supabase, active.id, params.q);
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
        <details className="create-disclosure">
          <summary className="primary-button">Add customer</summary>
          <div className="disclosure-panel">
            <CustomerForm />
          </div>
        </details>
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
      </form>
      {result.rows.length === 0 ? (
        <section className="workspace-card empty-state">
          <h2>
            {params.q ? 'No customers match this search' : 'No customers yet'}
          </h2>
          <p>Add your first customer to start a support conversation.</p>
        </section>
      ) : (
        <ul className="support-list">
          {result.rows.map((row) => (
            <li key={row.id} className="support-row">
              <Link href={`/app/customers/${row.id}`}>
                <span className="support-row-top">
                  <strong>{row.name || 'Unnamed customer'}</strong>
                  <span className="support-count">
                    {row.email || 'No email'}
                  </span>
                </span>
                <span className="support-row-meta">
                  {row.company || 'Independent'} · Last seen{' '}
                  {new Date(row.last_seen_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
