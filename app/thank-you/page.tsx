import { cookies } from 'next/headers';
import Link from 'next/link';
import { PublicShell } from '../../components/marketing/public-shell';
import { hasContactReceipt } from '../../lib/contact/service';
import { publicMetadata } from '../../lib/marketing/metadata';

export const metadata = publicMetadata({
  path: '/thank-you',
  title: 'Thank you',
  description: 'Confirmation for a SupportSphere contact request.',
  index: false,
});

export default async function ThankYouPage() {
  const receipt = (await cookies()).get('ss_contact_receipt')?.value;
  const received = await hasContactReceipt(receipt);
  return (
    <PublicShell stickyCta={false}>
      <main id="main-content" className="thank-you-page">
        <p className="section-kicker">
          {received ? 'Message received' : 'SupportSphere / contact'}
        </p>
        <h1>
          {received
            ? 'Thank you for reaching out.'
            : 'Let’s start a conversation.'}
        </h1>
        <p>
          {received
            ? 'Your message is saved. We will review it and respond by email.'
            : 'Use the contact form to send a message directly to our team.'}
        </p>
        <div className="hero-actions">
          <Link
            href={received ? '/' : '/contact'}
            className="marketing-button marketing-button-mint"
          >
            {received ? 'Return home' : 'Contact us'}{' '}
            <span aria-hidden="true">↗</span>
          </Link>
          {received && (
            <Link href="/features" className="text-link">
              Explore features ↗
            </Link>
          )}
        </div>
      </main>
    </PublicShell>
  );
}
