import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main-content" className="not-found-page">
      <Link href="/" className="brand-mark">
        <span className="brand-symbol" aria-hidden="true">
          ✳
        </span>{' '}
        SupportSphere
      </Link>
      <div>
        <p className="section-kicker">Page not found</p>
        <h1>This page took a different route.</h1>
        <p>The link may have changed, or the page may not exist yet.</p>
        <Link href="/" className="marketing-button marketing-button-mint">
          Return home <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </main>
  );
}
