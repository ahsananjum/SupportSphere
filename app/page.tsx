import type { Metadata } from 'next';
import Link from 'next/link';
import { TextEffect } from '../components/motion-primitives/text-effect';
import { InView } from '../components/motion-primitives/in-view';
import { WorkflowVisual } from '../components/marketing/workflow-visual';
import { PublicShell } from '../components/marketing/public-shell';
import { isPublicOrigin, siteOrigin } from '../lib/seo';

export const metadata: Metadata = {
  title: { absolute: 'SupportSphere — a calmer way to run customer support' },
  description:
    'SupportSphere is building a connected support workspace for teams, knowledge, and responsible AI assistance. Secure workspaces and team access are available now.',
  alternates: isPublicOrigin() ? { canonical: `${siteOrigin()}/` } : undefined,
  robots: { index: isPublicOrigin(), follow: isPublicOrigin() },
  openGraph: {
    type: 'website',
    url: isPublicOrigin() ? siteOrigin() : undefined,
    title: 'SupportSphere — a calmer way to run customer support',
    description:
      'One connected support workspace, built around clear human ownership and useful context.',
  },
};

const questions = [
  {
    question: 'What can I use today?',
    answer:
      'You can create an account and workspace, invite teammates by email, manage roles, and switch between workspaces. The conversation, knowledge, and AI workflows shown here describe the product direction and are still being built.',
  },
  {
    question: 'How does team access work?',
    answer:
      'Each workspace has its own members and roles. Invitations expire, can be revoked or resent, and membership changes are recorded in an audit log.',
  },
  {
    question: 'Will AI replace my support team?',
    answer:
      'The planned AI workflow is designed to gather evidence and draft suggestions while people remain responsible for customer-facing decisions and sensitive actions.',
  },
];

export default function HomePage() {
  return (
    <PublicShell>
      <main id="main-content">
        <section
          className="hero-section"
          aria-label="SupportSphere introduction"
        >
          <div className="hero-copy">
            <div className="hero-status-row">
              <p className="hero-status">
                <span className="status-pulse" aria-hidden="true" /> A better
                support desk is taking shape
              </p>
              <span className="hero-index" aria-hidden="true">
                SS / 01
              </span>
            </div>
            <TextEffect
              as="h1"
              per="word"
              preset="slide"
              className="hero-title"
              delay={0.06}
            >
              Support should feel more human.
            </TextEffect>
            <p className="hero-lede">
              Bring your team into one secure workspace today. Build toward a
              support flow where every answer has context, every handoff has an
              owner, and AI helps without taking control.
            </p>
            <div className="hero-actions">
              <Link
                href="/signup"
                className="marketing-button marketing-button-mint"
              >
                Create your workspace <span aria-hidden="true">↗</span>
              </Link>
              <a href="#workflow" className="text-link">
                Explore the direction <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="hero-footnote">
              Workspace, member roles, invitations, and audit records are
              available now.
            </p>
          </div>
          <WorkflowVisual />
        </section>

        <section
          id="approach"
          className="manifesto-section"
          aria-labelledby="approach-title"
        >
          <div className="section-heading">
            <p className="section-kicker">The principle</p>
            <h2 id="approach-title">
              Good support needs a clear line of sight.
            </h2>
          </div>
          <div className="manifesto-body">
            <p>
              A customer question should not disappear into disconnected tools.
              The SupportSphere direction joins the conversation, the relevant
              knowledge, and the person accountable for the answer.
            </p>
            <p className="muted-copy">
              We are building this in stages. The identity and team foundation
              is live; inbox, knowledge, and AI assistance follow in later
              phases.
            </p>
          </div>
        </section>

        <section
          id="workflow"
          className="workflow-section"
          aria-labelledby="workflow-title"
        >
          <div className="workflow-heading">
            <p className="section-kicker">Designed workflow</p>
            <h2 id="workflow-title">
              From question to resolution, with fewer blind spots.
            </h2>
            <p>
              Three connected moments shape the product. The diagram is
              illustrative of the planned experience.
            </p>
          </div>
          <div className="workflow-stages">
            <InView
              once
              variants={{
                hidden: { opacity: 1, y: 18 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.48 }}
            >
              <article className="workflow-stage">
                <span className="stage-number">01</span>
                <h3>Receive with context</h3>
                <p>
                  Keep the customer question and its history visible in one
                  place.
                </p>
              </article>
            </InView>
            <InView
              once
              variants={{
                hidden: { opacity: 1, y: 18 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.48 }}
            >
              <article className="workflow-stage">
                <span className="stage-number">02</span>
                <h3>Ground the answer</h3>
                <p>Connect suggestions to the knowledge a team has approved.</p>
              </article>
            </InView>
            <InView
              once
              variants={{
                hidden: { opacity: 1, y: 18 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.48 }}
            >
              <article className="workflow-stage">
                <span className="stage-number">03</span>
                <h3>Hand off deliberately</h3>
                <p>
                  Give a person the full picture when judgment or care is
                  needed.
                </p>
              </article>
            </InView>
          </div>
        </section>

        <section
          id="security"
          className="security-section"
          aria-labelledby="security-title"
        >
          <div className="security-copy">
            <p className="section-kicker">Available foundation</p>
            <h2 id="security-title">A workspace built around boundaries.</h2>
            <p>
              Real authentication, workspace roles, expiring invitations, and
              tenant access controls are in place. Membership and role changes
              leave an audit trail.
            </p>
            <Link
              href="/signup"
              className="marketing-button marketing-button-outline"
            >
              Start with your team <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div
            className="security-stack"
            aria-label="Current workspace foundations"
          >
            <div>
              <span className="security-icon" aria-hidden="true">
                ↗
              </span>
              <strong>Workspace isolation</strong>
              <p>Each team operates within its own boundary.</p>
            </div>
            <div>
              <span className="security-icon" aria-hidden="true">
                ◎
              </span>
              <strong>Role-aware access</strong>
              <p>Permissions are checked on the server.</p>
            </div>
            <div>
              <span className="security-icon" aria-hidden="true">
                ◷
              </span>
              <strong>Invitation controls</strong>
              <p>Send, resend, revoke, and expire access links.</p>
            </div>
          </div>
        </section>

        <section id="faq" className="faq-section" aria-labelledby="faq-title">
          <div>
            <p className="section-kicker">Questions</p>
            <h2 id="faq-title">Before you begin.</h2>
          </div>
          <div className="faq-list">
            {questions.map((item) => (
              <details key={item.question}>
                <summary>
                  {item.question}
                  <span aria-hidden="true">＋</span>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="closing-section" aria-labelledby="closing-title">
          <p className="section-kicker">Start with the foundation</p>
          <h2 id="closing-title">Give your team a better place to begin.</h2>
          <Link
            href="/signup"
            className="marketing-button marketing-button-mint"
          >
            Create your workspace <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
