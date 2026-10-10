import { z } from 'zod';

export const siteEventSchema = z.object({
  slug: z.string().optional(),
  title: z.string(),
  location: z.string(),
  period: z.string(),
  organiser: z.string(),
  summary: z.string(),
  label: z.string().optional(),
  image: z.string().optional(),
});
export type SiteEvent = z.infer<typeof siteEventSchema>;

export const eventsResponseSchema = z.object({ events: z.array(siteEventSchema).default([]) });

export const enquirySchema = z.object({
  name: z.string().trim().min(1, 'Please enter your full name.').max(120),
  email: z.email('Please enter a valid email address.').max(200),
  phone: z.string().trim().max(40),
  country: z.string().trim().min(1, 'Please enter your country.').max(80),
  interest: z.string().min(1, 'Please choose an area of interest.'),
  message: z.string().trim().min(20, 'Please tell us a little more (at least 20 characters).').max(2000),
  website: z.string(), // honeypot, expected to stay empty
});
export type Enquiry = z.infer<typeof enquirySchema>;

export const signupSchema = z.object({ email: z.email('Please enter a valid email address.').max(200) });

export const enquiryResultSchema = z.object({ reference: z.string() });
export const apiErrorSchema = z.object({ error: z.string().optional() });
