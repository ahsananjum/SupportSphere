import { z } from 'zod';

export const emailSchema = z
  .email()
  .max(320)
  .transform((value) => value.toLowerCase().trim());
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128);
export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export const signupSchema = authSchema.extend({
  displayName: z.string().trim().min(2).max(120),
});
export const workspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .refine((value) => !/[\r\n]/.test(value), 'Use a single line.'),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/,
      'Use 3–48 lowercase letters, numbers, or hyphens.',
    ),
  timezone: z
    .string()
    .min(1)
    .max(100)
    .refine(
      (value) =>
        value === 'UTC' || Intl.supportedValuesOf('timeZone').includes(value),
      'Choose a valid timezone.',
    ),
});
export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'agent', 'viewer']),
});
export const uuidSchema = z.uuid();
