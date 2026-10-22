import {
  listHref,
  PAGE_SIZE,
  type ListFilters,
  type SupportList,
} from '../../lib/support/list-navigation';

export function ListPagination({
  kind,
  filters,
  count,
}: {
  kind: SupportList;
  filters: ListFilters;
  count: number;
}) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <nav className="filter-bar" aria-label="List pagination">
      <p role="status">
        {count} records · Page {filters.page + 1} of {pages}
      </p>
      {filters.page > 0 && (
        <a
          className="secondary-button"
          href={listHref(kind, filters, Math.min(filters.page - 1, pages - 1))}
        >
          Previous page
        </a>
      )}
      {filters.page + 1 < pages && (
        <a
          className="secondary-button"
          href={listHref(kind, filters, filters.page + 1)}
        >
          Next page
        </a>
      )}
      {filters.page >= pages && (
        <a className="secondary-button" href={listHref(kind, filters, 0)}>
          First page
        </a>
      )}
    </nav>
  );
}
