import { WorkflowVisual } from './workflow-visual';
import type { StoryPage } from '../../lib/marketing/pages';

const diagrams = {
  security: {
    heading: 'ACCESS PATH / AVAILABLE',
    footer: 'Implemented foundation · server-checked access',
    items: [
      ['01', 'Account', 'Supabase Auth'],
      ['02', 'Workspace', 'Tenant boundary'],
      ['03', 'Role check', 'Server permission'],
      ['04', 'Audit record', 'Membership changes'],
    ],
  },
  integrations: {
    heading: 'CONNECTION LIFECYCLE / PLANNED',
    footer: 'Illustrative lifecycle · no connected services shown',
    items: [
      ['01', 'Authorize', 'Real provider consent'],
      ['02', 'Observe', 'Visible health'],
      ['03', 'Recover', 'Useful failure state'],
    ],
  },
  roadmap: {
    heading: 'BUILD SEQUENCE / STATUS',
    footer: 'Status reflects the current implementation',
    items: [
      ['NOW', 'Foundation', 'Auth, workspaces, roles'],
      ['NEXT', 'Support flow', 'Inbox and tickets'],
      ['LATER', 'Assistance', 'Knowledge and AI'],
    ],
  },
} as const;

export function StoryVisual({ variant }: { variant: StoryPage['visual'] }) {
  if (variant === 'workflow') return <WorkflowVisual />;
  const diagram = diagrams[variant];
  return (
    <div
      className={`story-schematic story-schematic-${variant}`}
      aria-label={diagram.heading}
    >
      <div className="visual-topline">
        <span>{diagram.heading}</span>
        <span>SS / SYSTEM</span>
      </div>
      <ol className="schematic-steps">
        {diagram.items.map(([number, title, caption]) => (
          <li key={title}>
            <span className="schematic-index">{number}</span>
            <div>
              <strong>{title}</strong>
              <span>{caption}</span>
            </div>
            <span aria-hidden="true">↗</span>
          </li>
        ))}
      </ol>
      <div className="schematic-line" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>{diagram.footer}</p>
    </div>
  );
}
