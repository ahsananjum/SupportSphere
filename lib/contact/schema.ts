import { z } from 'zod';

export const contactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your name.')
    .max(120, 'Keep your name under 120 characters.'),
  email: z
    .email('Enter a valid email address.')
    .max(320, 'Keep your email under 320 characters.')
    .transform((value) => value.toLowerCase()),
  company: z
    .string()
    .trim()
    .max(120, 'Keep the company name under 120 characters.')
    .optional(),
  topic: z.enum(['general', 'product', 'partnership', 'privacy']),
  message: z
    .string()
    .trim()
    .min(10, 'Tell us a little more so we can help.')
    .max(4000, 'Keep your message under 4,000 characters.'),
  website: z.string().max(0, 'Unable to submit this message.').optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
