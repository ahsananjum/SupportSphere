import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max);
export const customerSchema = z.object({
  name: text(160).default(''),
  email: z.string().trim().email().max(320).optional().or(z.literal('')),
  phone: text(60).optional().default(''),
  company: text(160).optional().default(''),
});
export const conversationSchema = z.object({
  customerId: z.string().uuid(),
  subject: text(240).min(1),
  channel: z.enum(['manual', 'widget', 'email', 'api']).default('manual'),
});
export const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: text(20000).min(1),
  internal: z.enum(['on', '']).optional(),
  clientId: z.string().trim().min(1).max(120),
});
export const ticketSchema = z.object({
  title: text(240).min(1),
  description: text(40000).default(''),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  category: text(80).optional().default(''),
  customerId: z.string().uuid().optional().or(z.literal('')),
  conversationId: z.string().uuid().optional().or(z.literal('')),
});
