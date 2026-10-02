import { z } from 'zod';
import { workspaceSchema } from './auth';

const websiteOrigin = z.union([
  z.literal(''),
  z
    .url()
    .max(255)
    .refine((value) => {
      const url = new URL(value);
      return (
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === '/' &&
        (url.protocol === 'https:' ||
          (url.protocol === 'http:' && url.hostname === 'localhost'))
      );
    }, 'Enter an HTTPS origin, or http://localhost for local setup.')
    .transform((value) => new URL(value).origin),
]);

export const generalSettingsSchema = workspaceSchema.extend({
  companyName: z.string().trim().min(2).max(120),
  supportName: z.string().trim().min(2).max(120),
  supportEmail: z.email().max(320),
  websiteOrigin,
});

export const identitySchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  supportName: z.string().trim().min(2).max(120),
  supportEmail: z.email().max(320),
});

export const originSchema = z.object({ websiteOrigin });
export const aiModeSchema = z.enum(['off', 'draft_only', 'assisted']);
