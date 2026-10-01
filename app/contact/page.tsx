import Link from 'next/link';
import { ContactForm } from './contact-form';
import { PublicShell } from '../../components/marketing/public-shell';
import { publicFacts } from '../../lib/marketing/facts';
import { publicMetadata } from '../../lib/marketing/metadata';

export const metadata = publicMetadata({
  path: '/contact',
  title: 'Contact SupportSphere',
  description:
    'Ask about SupportSphere, share product feedback, or reach the operator about privacy. Send a message through the real contact form.',
});

export default function ContactPage() {
  return (
    <PublicShell stickyCta={false}>
      <main id="main-content" className="contact-page">
        <section className="contact-intro">
          <p className="section-kicker">Contact / conversation</p>
          <h1>Tell us what support needs to feel like.</h1>
          <p>
            Ask about the product, share a workflow that slows your team down,
            or reach us about privacy. Your message goes to our contact inbox.
          </p>
          <div className="contact-direct">
            <span>Prefer email?</span>
            <a href={`mailto:${publicFacts.supportEmail}`}>
              {publicFacts.supportEmail}
            </a>
            <span>{publicFacts.location}</span>
          </div>
          <Link href="/features" className="text-link">
            Explore the product direction ↗
          </Link>
        </section>
        <section
          className="contact-form-panel"
          aria-labelledby="contact-form-title"
        >
          <p className="section-kicker">Send a message</p>
          <h2 id="contact-form-title">Start a conversation.</h2>
          <ContactForm />
        </section>
      </main>
    </PublicShell>
  );
}
