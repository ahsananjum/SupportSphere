import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="marketing-footer">
      <Link href="/" className="brand-mark">
        <span className="brand-symbol" aria-hidden="true">
          ✳
        </span>{' '}
        SupportSphere
      </Link>
      <p>A calmer foundation for customer support.</p>
      <nav aria-label="Footer navigation">
        <Link href="/#approach">Approach</Link>
        <Link href="/#security">Security</Link>
        <Link href="/login">Sign in</Link>
        <Link href="/signup">Get started</Link>
      </nav>
      <small>© {new Date().getFullYear()} SupportSphere</small>
    </footer>
  );
}
