export type StoryPage = {
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  lead: string;
  visual: 'workflow' | 'security' | 'integrations' | 'roadmap';
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  sections: {
    eyebrow: string;
    heading: string;
    body: string;
    points: string[];
    tone?: 'surface' | 'mint';
  }[];
};

export const publicPaths = [
  '/',
  '/features',
  '/ai-support',
  '/knowledge-base',
  '/integrations',
  '/pricing',
  '/security',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/cookies',
] as const;

export const storyPages: Record<string, StoryPage> = {
  features: {
    path: '/features',
    eyebrow: 'The product direction',
    title: 'One place for the whole support story.',
    description:
      'Explore the SupportSphere roadmap: a connected inbox, accountable handoffs, knowledge, and AI assistance. Workspace and team controls are available today.',
    lead: 'SupportSphere is being built in stages. Your team can set up a secure workspace now; the support workflows below describe what follows.',
    visual: 'workflow',
    primary: { label: 'Create a workspace', href: '/signup' },
    secondary: { label: 'See the workflow', href: '/#workflow' },
    sections: [
      {
        eyebrow: 'Available now',
        heading: 'Start with a team boundary.',
        body: 'Create a workspace, invite teammates, assign roles, and switch between workspaces. Changes to membership and roles leave an audit record.',
        points: [
          'Workspace isolation',
          'Expiring, revocable invitations',
          'Server-checked roles',
        ],
      },
      {
        eyebrow: 'In development',
        heading: 'Bring conversations into view.',
        body: 'The planned inbox will connect customer messages, ownership, and ticket status so a handoff carries the full context.',
        points: ['Shared inbox', 'Assigned ownership', 'Conversation history'],
        tone: 'surface',
      },
      {
        eyebrow: 'In development',
        heading: 'Make every answer traceable.',
        body: 'Knowledge retrieval and AI drafts are designed to keep sources close to the proposed response, with people in charge of sensitive decisions.',
        points: ['Approved knowledge', 'Source-backed drafts', 'Human review'],
        tone: 'mint',
      },
    ],
  },
  'ai-support': {
    path: '/ai-support',
    eyebrow: 'AI support, designed with restraint',
    title: 'A useful draft begins with evidence.',
    description:
      'See how SupportSphere plans to use approved knowledge for AI-assisted support, with source context, policy boundaries, and human review.',
    lead: 'AI assistance is on the roadmap. The design gives agents a starting point they can inspect, correct, and approve.',
    visual: 'workflow',
    primary: { label: 'Explore knowledge', href: '/knowledge-base' },
    secondary: { label: 'Contact us', href: '/contact' },
    sections: [
      {
        eyebrow: '01 / Retrieve',
        heading: 'Find the material that matters.',
        body: 'Relevant approved knowledge is intended to be retrieved before a response is drafted. A model should not invent policy when the evidence is missing.',
        points: [
          'Approved sources',
          'Relevant passages',
          'Missing-evidence path',
        ],
      },
      {
        eyebrow: '02 / Draft',
        heading: 'Keep the source attached.',
        body: 'A proposed answer should show why it was suggested. Agents can check the cited material against the customer’s actual question.',
        points: [
          'Evidence beside the draft',
          'Editable response',
          'Clear uncertainty',
        ],
        tone: 'surface',
      },
      {
        eyebrow: '03 / Decide',
        heading: 'People own the final action.',
        body: 'Sensitive or ambiguous cases belong with a person. SupportSphere’s planned workflow keeps escalation and approval visible.',
        points: ['Human review', 'Escalation path', 'Audit trail'],
        tone: 'mint',
      },
    ],
  },
  'knowledge-base': {
    path: '/knowledge-base',
    eyebrow: 'Knowledge as infrastructure',
    title: 'Give good answers a place to come from.',
    description:
      'SupportSphere’s planned knowledge base connects approved sources to support workflows and AI drafts so answers can be checked.',
    lead: 'The knowledge workflow is in development. The goal is simple: teams should know what a proposed answer is based on.',
    visual: 'workflow',
    primary: { label: 'See AI support', href: '/ai-support' },
    secondary: { label: 'Create a workspace', href: '/signup' },
    sections: [
      {
        eyebrow: 'Collect',
        heading: 'A deliberate source of truth.',
        body: 'Bring support material into a workspace with clear ownership, rather than letting answers drift across documents and chat threads.',
        points: [
          'Workspace-scoped sources',
          'Explicit ownership',
          'Readable status',
        ],
      },
      {
        eyebrow: 'Review',
        heading: 'Quality before recall.',
        body: 'The planned review flow distinguishes usable guidance from stale or incomplete material before it can inform customer responses.',
        points: ['Source review', 'Update visibility', 'Failure states'],
        tone: 'surface',
      },
      {
        eyebrow: 'Use',
        heading: 'Context at the moment of need.',
        body: 'Knowledge should appear beside the conversation and stay connected to the answer an agent sends.',
        points: ['Relevant retrieval', 'Source references', 'Agent judgment'],
        tone: 'mint',
      },
    ],
  },
  integrations: {
    path: '/integrations',
    eyebrow: 'Connections',
    title: 'Connect the places support already happens.',
    description:
      'Learn about the planned SupportSphere integration approach. Connection status is never simulated; integrations appear only when they are genuinely available.',
    lead: 'Integrations are planned for later phases. Today, workspace identity and team access are live. We will show real connection state as channels ship.',
    visual: 'integrations',
    primary: { label: 'Contact us', href: '/contact' },
    secondary: { label: 'Explore features', href: '/features' },
    sections: [
      {
        eyebrow: 'Principle',
        heading: 'State you can trust.',
        body: 'A connection should display what is connected, who authorized it, when it last worked, and what needs attention. No decorative “connected” badges.',
        points: ['Real authorization', 'Visible health', 'Actionable errors'],
      },
      {
        eyebrow: 'Approach',
        heading: 'Bring context across systems.',
        body: 'The roadmap includes channel and workflow connections that preserve customer context when work moves between tools.',
        points: [
          'Channel intake',
          'Webhook verification',
          'Retry and recovery',
        ],
        tone: 'surface',
      },
    ],
  },
  security: {
    path: '/security',
    eyebrow: 'Security foundation',
    title: 'Boundaries before automation.',
    description:
      'Review the security controls already in SupportSphere: real authentication, workspace isolation, server-checked roles, expiring invitations, and audit records.',
    lead: 'Security is an operating requirement. The controls below are implemented today; future data and AI workflows will inherit the same boundaries.',
    visual: 'security',
    primary: { label: 'Create a workspace', href: '/signup' },
    secondary: { label: 'Contact us', href: '/contact' },
    sections: [
      {
        eyebrow: 'Identity',
        heading: 'Access begins with a real account.',
        body: 'Email authentication, password recovery, and Google sign-in are backed by Supabase Auth. Protected app routes require a valid session.',
        points: ['Real provider sign-in', 'Recovery flow', 'Protected routes'],
      },
      {
        eyebrow: 'Tenancy',
        heading: 'Each workspace has its own boundary.',
        body: 'Row-level policies and server-side permission checks limit access by workspace membership and role.',
        points: [
          'Tenant-scoped records',
          'Role checks on writes',
          'Cross-tenant tests',
        ],
        tone: 'surface',
      },
      {
        eyebrow: 'Accountability',
        heading: 'Team changes leave evidence.',
        body: 'Invitations expire and can be revoked. Membership and role changes are recorded for later review.',
        points: ['Invitation lifecycle', 'Last-owner safety', 'Audit records'],
        tone: 'mint',
      },
    ],
  },
  about: {
    path: '/about',
    eyebrow: 'About SupportSphere',
    title: 'Support deserves a clearer operating system.',
    description:
      'Why SupportSphere is being built: to give support teams context, ownership, and a careful path toward AI assistance.',
    lead: 'SupportSphere is a product in active development. We are building the foundation first, then the conversation and knowledge workflows that depend on it.',
    visual: 'roadmap',
    primary: { label: 'Contact us', href: '/contact' },
    secondary: { label: 'Explore features', href: '/features' },
    sections: [
      {
        eyebrow: 'Our thesis',
        heading: 'Care improves when context stays together.',
        body: 'A good support response needs the question, the relevant policy or knowledge, and someone accountable for the next step.',
        points: [
          'Clarity for customers',
          'Context for teams',
          'Ownership of outcomes',
        ],
      },
      {
        eyebrow: 'How we build',
        heading: 'Real foundations, then careful expansion.',
        body: 'The live platform already handles accounts, workspaces, roles, invitations, and audit records. Inbox, knowledge, AI, and integrations follow as complete product slices.',
        points: [
          'Secure foundation',
          'Visible development status',
          'No simulated results',
        ],
        tone: 'surface',
      },
    ],
  },
};
