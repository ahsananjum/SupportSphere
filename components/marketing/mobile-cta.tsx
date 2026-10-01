import Link from 'next/link';

export function MobileCta() {
  return (
    <div className="mobile-sticky-cta">
      <Link href="/signup" className="marketing-button marketing-button-dark">
        Create a workspace <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}
