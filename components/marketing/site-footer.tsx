import Link from 'next/link';
import { publicFacts } from '../../lib/marketing/facts';

const groups = [
  {
    title: 'Product',
    links: [
      ['/features', 'Features'],
      ['/ai-support', 'AI support'],
      ['/knowledge-base', 'Knowledge base'],
      ['/integrations', 'Integrations'],
      ['/pricing', 'Pricing'],
      ['/security', 'Security'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['/about', 'About'],
      ['/contact', 'Contact'],
      ['/login', 'Sign in'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['/privacy', 'Privacy'],
      ['/terms', 'Terms'],
      ['/cookies', 'Cookies'],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="marketing-footer">
      <div className="footer-intro">
        <Link href="/" className="brand-mark" aria-label="SupportSphere home">
          <span className="brand-symbol" aria-hidden="true">
            ✳
          </span>
          SupportSphere
        </Link>
        <p>A calmer foundation for customer support.</p>
        <a href={`mailto:${publicFacts.supportEmail}`}>
          {publicFacts.supportEmail}
        </a>
      </div>
      <nav aria-label="Footer navigation">
        {groups.map((group) => (
          <div className="footer-link-group" key={group.title}>
            <strong>{group.title}</strong>
            {group.links.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <small>
        © {new Date().getFullYear()} {publicFacts.operatorName} · SupportSphere
        · {publicFacts.location}
      </small>
    </footer>
  );
}
