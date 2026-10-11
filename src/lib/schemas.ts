import { z } from 'zod';

export const EVENT_CATEGORIES = ['summit', 'conference', 'exhibition', 'trade_mission', 'workshop', 'networking'] as const;

export const siteEventSchema = z.object({
  slug: z.string().optional(),
  title: z.string(),
  location: z.string(),
  period: z.string(),
  organiser: z.string(),
  summary: z.string(),
  label: z.string().optional(),
  image: z.string().optional(),
  /** Uploaded cover (a /media/... path); takes priority over the built-in `image`. */
  imageUrl: z.string().nullable().optional(),
  // Unknown categories (e.g. added to the API later) show under "Summit" rather than breaking the page.
  category: z.enum(EVENT_CATEGORIES).catch('summit').default('summit'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
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
export const apiErrorSchema = z.object({
  error: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});

/* ---------- Admin authentication ---------- */

export const ROLES = ['admin', 'staff'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

/** `admin` accounts can also manage staff. Sessions saved before roles existed default to `staff` until /me refreshes them. */
export const adminSchema = z.object({ id: z.string().optional(), email: z.string(), name: z.string().optional(), role: roleSchema.default('staff') });
export type Admin = z.infer<typeof adminSchema>;

export const adminSessionSchema = z.object({ token: z.string().min(1), admin: adminSchema });
export type AdminSession = z.infer<typeof adminSessionSchema>;

export const loginSchema = z.object({
  email: z.email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: z.email('Please enter a valid email address.') });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(128, 'Use at most 128 characters.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/\d/, 'Include at least one number.'),
    confirmPassword: z.string(),
  })
  .refine(values => values.password === values.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/* ---------- Admin enquiries ---------- */

export const ENQUIRY_STATUSES = ['new', 'in_progress', 'closed'] as const;
export const enquiryStatusSchema = z.enum(ENQUIRY_STATUSES);
export type EnquiryStatus = z.infer<typeof enquiryStatusSchema>;

export const adminEnquirySchema = z.object({
  reference: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  country: z.string(),
  interest: z.string(),
  message: z.string(),
  status: enquiryStatusSchema,
  notes: z.string(),
  createdAt: z.string(),
});
export type AdminEnquiry = z.infer<typeof adminEnquirySchema>;

export const adminEnquiriesResponseSchema = z.object({
  enquiries: z.array(adminEnquirySchema),
  count: z.number(),
  page: z.number(),
  pages: z.number(),
  statusCounts: z.record(enquiryStatusSchema, z.number()),
});
export type AdminEnquiriesResponse = z.infer<typeof adminEnquiriesResponseSchema>;

export const enquiryUpdateSchema = z.object({
  status: enquiryStatusSchema,
  notes: z.string(),
});
export type EnquiryUpdateValues = z.infer<typeof enquiryUpdateSchema>;

/* ---------- Dashboard ---------- */

export const STAT_RANGES = [7, 30, 90] as const;

const rankedSchema = z.array(z.object({ label: z.string(), count: z.number() }));

export const statsSchema = z.object({
  days: z.number(),
  totals: z.object({ enquiries: z.number(), awaitingReply: z.number(), publishedEvents: z.number(), activeStaff: z.number() }),
  period: z.object({ enquiries: z.number(), previous: z.number() }),
  daily: z.array(z.object({ date: z.string(), count: z.number() })),
  byStatus: z.record(enquiryStatusSchema, z.number()),
  topInterests: rankedSchema,
  topCountries: rankedSchema,
  recent: z.array(adminEnquirySchema),
});
export type Stats = z.infer<typeof statsSchema>;

/* ---------- Staff ---------- */

export const staffMemberSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  name: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  lastLogin: z.string().nullable(),
  dateJoined: z.string(),
});
export type StaffMember = z.infer<typeof staffMemberSchema>;

// Mirrors the API's rules loosely; Django's password validators have the final say.
const newPassword = z.string().min(8, 'Use at least 8 characters.').max(128, 'Use at most 128 characters.');

export const staffFormSchema = z.object({
  firstName: z.string().trim().max(150),
  lastName: z.string().trim().max(150),
  email: z.email('Please enter a valid email address.'),
  role: roleSchema,
  isActive: z.boolean(),
  // Required when creating; leave blank when editing to keep the current password.
  password: z.union([z.literal(''), newPassword]),
});
export type StaffFormValues = z.infer<typeof staffFormSchema>;

/* ---------- Admin events ---------- */

export const EVENT_IMAGES = ['afrigulf-summit-image', 'image-one', 'image-two', 'image-three'] as const;

export const adminEventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  category: z.enum(EVENT_CATEGORIES),
  location: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  period: z.string(),
  organiser: z.string(),
  summary: z.string(),
  label: z.string(),
  image: z.enum(EVENT_IMAGES),
  imageUrl: z.string().nullable(),
  isPublished: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminEvent = z.infer<typeof adminEventSchema>;

export const adminEventsResponseSchema = z.object({
  events: z.array(adminEventSchema),
  statusCounts: z.object({ published: z.number(), draft: z.number() }),
});
export type AdminEventsResponse = z.infer<typeof adminEventsResponseSchema>;

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Please enter a title.').max(200),
    category: z.enum(EVENT_CATEGORIES),
    location: z.string().trim().min(1, 'Please enter a location.').max(120),
    startDate: z.string(),
    endDate: z.string(),
    period: z.string().trim().max(80),
    organiser: z.string().trim().min(1, 'Please enter the organiser.').max(200),
    summary: z.string().trim().min(1, 'Please add a short summary.').max(300),
    label: z.string().trim().max(40),
    image: z.enum(EVENT_IMAGES),
    slug: z.string().trim().max(50).regex(/^[-a-z0-9]*$/, 'Use lowercase letters, numbers and hyphens only.'),
    sortOrder: z.number({ error: 'Enter a number.' }).int().min(0),
    isPublished: z.boolean(),
  })
  .refine(v => !v.endDate || !!v.startDate, { path: ['startDate'], message: 'Add a start date as well as an end date.' })
  .refine(v => !v.endDate || !v.startDate || v.endDate >= v.startDate, { path: ['endDate'], message: 'The end date can’t be before the start date.' })
  .refine(v => !!v.startDate || !!v.period, { path: ['period'], message: 'Add a start date, or describe when it happens (e.g. “December 2026”).' });
export type EventFormValues = z.infer<typeof eventFormSchema>;
