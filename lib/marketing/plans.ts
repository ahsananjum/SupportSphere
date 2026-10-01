export const plans = [
  {
    name: 'Workspace foundation',
    availability: 'Available now',
    priceLabel: 'Pricing to be announced',
    description:
      'Set up your team boundary while the full support workspace is built.',
    includes: [
      'Workspace creation and switching',
      'Member roles and invitations',
      'Membership audit records',
    ],
    cta: { label: 'Create a workspace', href: '/signup' },
  },
  {
    name: 'Connected support',
    availability: 'In development',
    priceLabel: 'Pricing to be announced',
    description: 'The planned inbox, knowledge, AI, and integration workflows.',
    includes: [
      'Shared conversation and ticket flow',
      'Approved knowledge and AI drafts',
      'Channel and workflow connections',
    ],
    cta: { label: 'Contact us', href: '/contact' },
  },
] as const;
