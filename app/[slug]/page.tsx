import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicShell } from '../../components/marketing/public-shell';
import { StoryVisual } from '../../components/marketing/story-visual';
import { publicFacts } from '../../lib/marketing/facts';
import { publicMetadata } from '../../lib/marketing/metadata';
import { storyPages, type StoryPage } from '../../lib/marketing/pages';
import { plans } from '../../lib/marketing/plans';

const legalMeta = {
  privacy: {
    title: 'Privacy Policy',
    description:
      'How SupportSphere handles account, workspace, and contact information, and how to reach the operator about privacy.',
  },
  terms: {
    title: 'Terms of Use',
    description:
      'Terms for using the SupportSphere workspace foundation and its developing product features.',
  },
  cookies: {
    title: 'Cookie Policy',
    description:
      'What essential sign-in cookies and local notice storage SupportSphere uses. Optional analytics are currently off.',
  },
} as const;

const slugs = [
  ...Object.keys(storyPages),
  'pricing',
  ...Object.keys(legalMeta),
];

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = storyPages[slug];
  if (story) {
    return publicMetadata({
      path: story.path,
      title: story.title,
      description: story.description,
    });
  }
  if (slug === 'pricing') {
    return publicMetadata({
      path: '/pricing',
      title: 'Pricing and availability',
      description:
        'See what is available in SupportSphere now, what is in development, and why commercial pricing is not yet announced.',
    });
  }
  const legal = legalMeta[slug as keyof typeof legalMeta];
  if (legal) {
    return publicMetadata({
      path: `/${slug}`,
      title: legal.title,
      description: legal.description,
    });
  }
  return {};
}

function Story({ page }: { page: StoryPage }) {
  return (
    <PublicShell>
      <main id="main-content">
        <section className="story-hero" aria-labelledby="story-title">
          <div className="story-hero-copy">
            <p className="section-kicker">{page.eyebrow}</p>
            <h1 id="story-title">{page.title}</h1>
            <p className="story-lead">{page.lead}</p>
            <div className="hero-actions">
              <Link
                href={page.primary.href}
                className="marketing-button marketing-button-dark"
              >
                {page.primary.label} <span aria-hidden="true">↗</span>
              </Link>
              {page.secondary && (
                <Link href={page.secondary.href} className="text-link">
                  {page.secondary.label} <span aria-hidden="true">↗</span>
                </Link>
              )}
            </div>
          </div>
          <div className="story-hero-visual">
            <StoryVisual variant={page.visual} />
          </div>
        </section>
        <div className="story-sections">
          {page.sections.map((section, index) => (
            <section
              key={section.heading}
              className={`story-section story-section-${section.tone ?? 'plain'}`}
              aria-labelledby={`story-section-${index}`}
            >
              <div>
                <p className="section-kicker">{section.eyebrow}</p>
                <h2 id={`story-section-${index}`}>{section.heading}</h2>
              </div>
              <div className="story-section-body">
                <p>{section.body}</p>
                <ul>
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
        <section className="story-endcap">
          <p className="section-kicker">The next step</p>
          <h2>Start with the foundation. Help shape what comes next.</h2>
          <Link
            href="/contact"
            className="marketing-button marketing-button-mint"
          >
            Contact us <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}

function Pricing() {
  return (
    <PublicShell>
      <main id="main-content">
        <section className="interior-hero">
          <p className="section-kicker">Pricing / availability</p>
          <h1>Know what is ready before you commit.</h1>
          <p>
            Commercial pricing has not been announced. The workspace foundation
            is available now; the connected support suite is in development.
          </p>
        </section>
        <section className="pricing-grid" aria-label="Product availability">
          {plans.map((plan) => (
            <article className="pricing-plan" key={plan.name}>
              <p className="section-kicker">{plan.availability}</p>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <strong>{plan.priceLabel}</strong>
              <ul>
                {plan.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link
                href={plan.cta.href}
                className="marketing-button marketing-button-outline"
              >
                {plan.cta.label} <span aria-hidden="true">↗</span>
              </Link>
            </article>
          ))}
        </section>
        <section className="pricing-note">
          <h2>Questions about the roadmap?</h2>
          <p>
            Tell us what your team needs and we will respond through the contact
            path.
          </p>
          <Link href="/contact" className="text-link">
            Contact us ↗
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}

function Legal({ kind }: { kind: keyof typeof legalMeta }) {
  return (
    <PublicShell stickyCta={false}>
      <main id="main-content" className="legal-page">
        <div className="legal-header">
          <p className="section-kicker">SupportSphere / legal</p>
          <h1>{legalMeta[kind].title}</h1>
          <p>
            This document describes the current product foundation. It is
            prepared for owner and legal review before commercial launch.
          </p>
          <p className="legal-date">Updated 2 October 2026</p>
        </div>
        {kind === 'privacy' && (
          <div className="legal-content">
            <section>
              <h2>Who operates the service</h2>
              <p>
                SupportSphere is operated by {publicFacts.operatorName},{' '}
                {publicFacts.location}. Privacy questions can be sent to{' '}
                <a href={`mailto:${publicFacts.legalEmail}`}>
                  {publicFacts.legalEmail}
                </a>
                .
              </p>
            </section>
            <section>
              <h2>Information we handle</h2>
              <p>
                Account registration and team invitations use email addresses
                and profile details. Workspaces contain names, membership roles,
                and audit records. The contact form stores the name, email,
                optional company, and message you submit, plus delivery status
                and limited abuse-prevention data.
              </p>
            </section>
            <section>
              <h2>Why we handle it</h2>
              <p>
                We use this information to provide accounts and workspace
                access, deliver invitation and recovery email, respond to
                contact requests, protect the service from abuse, and keep a
                record of role and membership changes.
              </p>
            </section>
            <section>
              <h2>Service providers</h2>
              <p>
                Supabase provides authentication and database services. Brevo
                provides transactional email delivery. Information needed for
                those services is sent to them when the relevant action occurs.
              </p>
            </section>
            <section>
              <h2>Your choices and requests</h2>
              <p>
                To ask about access, correction, or deletion of your
                information, contact{' '}
                <a href={`mailto:${publicFacts.legalEmail}`}>
                  {publicFacts.legalEmail}
                </a>
                . We will review the request against applicable obligations and
                the records needed to protect accounts and workspaces.
              </p>
            </section>
            <section>
              <h2>Cookies and changes</h2>
              <p>
                Essential sign-in cookies support authenticated sessions.
                Optional analytics are not running. Read the{' '}
                <Link href="/cookies">Cookie Policy</Link> for more detail. We
                will update this page when the product or data handling changes.
              </p>
            </section>
          </div>
        )}
        {kind === 'terms' && (
          <div className="legal-content">
            <section>
              <h2>Using SupportSphere</h2>
              <p>
                These terms cover the SupportSphere website and the available
                workspace foundation operated by {publicFacts.operatorName}. The
                inbox, knowledge, AI, and integration features described on
                marketing pages are in development and are not promised as
                currently available.
              </p>
            </section>
            <section>
              <h2>Accounts and workspaces</h2>
              <p>
                You are responsible for activity under your account and for
                inviting appropriate members to workspaces you control.
                Workspace roles determine who can change membership and
                settings.
              </p>
            </section>
            <section>
              <h2>Acceptable use</h2>
              <p>
                Do not use the service to violate law, interfere with other
                users, attempt unauthorized access, or submit harmful content.
                Contact us if you discover a security issue.
              </p>
            </section>
            <section>
              <h2>Your content</h2>
              <p>
                You remain responsible for information you submit. You must have
                the right to provide it. SupportSphere uses submitted
                information to operate the service and respond to contact
                requests as described in the{' '}
                <Link href="/privacy">Privacy Policy</Link>.
              </p>
            </section>
            <section>
              <h2>Availability and changes</h2>
              <p>
                The product is under active development. Features and access may
                change as the service evolves. We will communicate material
                changes through the service or email where appropriate.
              </p>
            </section>
            <section>
              <h2>Contact</h2>
              <p>
                Questions about these terms can be sent to{' '}
                <a href={`mailto:${publicFacts.legalEmail}`}>
                  {publicFacts.legalEmail}
                </a>
                . Mailing location: {publicFacts.mailingAddress}.
              </p>
            </section>
          </div>
        )}
        {kind === 'cookies' && (
          <div className="legal-content">
            <section>
              <h2>What is in use today</h2>
              <p>
                SupportSphere uses essential cookies for sign-in and session
                continuity through Supabase Auth. These cookies are needed for
                account and workspace access.
              </p>
            </section>
            <section>
              <h2>Notice storage</h2>
              <p>
                If you dismiss the cookie notice, the browser stores that choice
                in local storage under{' '}
                <code>supportsphere-cookie-notice-v1</code>. It only controls
                whether the notice reappears.
              </p>
            </section>
            <section>
              <h2>Optional tracking</h2>
              <p>
                We do not run optional analytics or advertising trackers right
                now. If that changes, this page and the consent experience will
                be updated before optional tracking starts.
              </p>
            </section>
            <section>
              <h2>Control</h2>
              <p>
                You can clear browser cookies and local storage in your browser
                settings. Removing essential session cookies may sign you out.
                Questions can be sent to{' '}
                <a href={`mailto:${publicFacts.legalEmail}`}>
                  {publicFacts.legalEmail}
                </a>
                .
              </p>
            </section>
          </div>
        )}
        <aside className="legal-contact">
          <strong>{publicFacts.operatorName}</strong>
          <span>{publicFacts.mailingAddress}</span>
          <a href={`mailto:${publicFacts.legalEmail}`}>
            {publicFacts.legalEmail}
          </a>
        </aside>
      </main>
    </PublicShell>
  );
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (storyPages[slug]) return <Story page={storyPages[slug]} />;
  if (slug === 'pricing') return <Pricing />;
  if (slug in legalMeta) return <Legal kind={slug as keyof typeof legalMeta} />;
  notFound();
}
