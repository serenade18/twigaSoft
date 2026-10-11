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
  isFeatured: z.boolean().optional(),
  // Unknown categories (e.g. added to the API later) show under "Summit" rather than breaking the page.
  category: z.enum(EVENT_CATEGORIES).catch('summit').default('summit'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});
export type SiteEvent = z.infer<typeof siteEventSchema>;

export const eventsResponseSchema = z.object({ events: z.array(siteEventSchema).default([]) });

export const eventDetailSchema = siteEventSchema.extend({
  slug: z.string(),
  description: z.string(),
  bookingsOpen: z.boolean(),
  closedReason: z.string().nullable(),
  /** Seats still available; null when there's no limit. */
  seatsLeft: z.number().nullable(),
  maxAttendees: z.number(),
});
export type EventDetail = z.infer<typeof eventDetailSchema>;

export const bookingSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your full name.').max(120),
  email: z.email('Please enter a valid email address.').max(200),
  phone: z.string().trim().max(40),
  organisation: z.string().trim().max(160),
  country: z.string().trim().min(1, 'Please enter your country.').max(80),
  attendees: z.number({ error: 'Enter the number of seats.' }).int().min(1, 'Book at least one seat.'),
  message: z.string().trim().max(1000),
  website: z.string(), // honeypot, expected to stay empty
});
export type BookingValues = z.infer<typeof bookingSchema>;

export const bookingResultSchema = z.object({ reference: z.string(), attendees: z.number(), status: z.string().optional() });

/* ---------- Tickets (public page reached from the approval email) ---------- */

export const ticketsPageSchema = z.object({
  reference: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  attendees: z.number(),
  event: z.object({ title: z.string(), slug: z.string(), period: z.string(), location: z.string(), organiser: z.string(), imageUrl: z.string().nullable() }),
  tickets: z.array(z.object({ number: z.number(), qr: z.string(), checkedInAt: z.string().nullable() })),
});
export type TicketsPage = z.infer<typeof ticketsPageSchema>;

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
  totals: z.object({
    enquiries: z.number(), awaitingReply: z.number(), publishedEvents: z.number(), activeStaff: z.number(), bookings: z.number(), pendingBookings: z.number(),
  }),
  period: z.object({ enquiries: z.number(), previous: z.number(), bookings: z.number(), previousBookings: z.number() }),
  eventPerformance: z.array(z.object({ id: z.string(), title: z.string(), views: z.number(), bookings: z.number(), seatsBooked: z.number() })),
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
  description: z.string(),
  isPublished: z.boolean(),
  bookingsOpen: z.boolean(),
  isFeatured: z.boolean(),
  capacity: z.number().nullable(),
  sortOrder: z.number(),
  stats: z.object({ views: z.number(), bookings: z.number(), pending: z.number(), seatsBooked: z.number(), seatsLeft: z.number().nullable() }),
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
    description: z.string().trim(),
    label: z.string().trim().max(40),
    image: z.enum(EVENT_IMAGES),
    slug: z.string().trim().max(50).regex(/^[-a-z0-9]*$/, 'Use lowercase letters, numbers and hyphens only.'),
    sortOrder: z.number({ error: 'Enter a number.' }).int().min(0),
    isPublished: z.boolean(),
    bookingsOpen: z.boolean(),
    // Kept as text so it can be blank (no limit); the API receives "" or a whole number.
    capacity: z.string().trim().regex(/^([1-9]\d*)?$/, 'Enter a whole number of seats, or leave blank for no limit.'),
  })
  .refine(v => !v.endDate || !!v.startDate, { path: ['startDate'], message: 'Add a start date as well as an end date.' })
  .refine(v => !v.endDate || !v.startDate || v.endDate >= v.startDate, { path: ['endDate'], message: 'The end date can’t be before the start date.' })
  .refine(v => !!v.startDate || !!v.period, { path: ['period'], message: 'Add a start date, or describe when it happens (e.g. “December 2026”).' });
export type EventFormValues = z.infer<typeof eventFormSchema>;

/* ---------- Admin bookings ---------- */

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export const BOOKING_STATUS_LABELS = { pending: 'Pending', confirmed: 'Approved', cancelled: 'Cancelled' } as const;
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const adminBookingSchema = z.object({
  reference: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  organisation: z.string(),
  country: z.string(),
  attendees: z.number(),
  message: z.string(),
  status: bookingStatusSchema,
  notes: z.string(),
  createdAt: z.string(),
  approvedAt: z.string().nullable(),
  /** The booker's tickets page, once approved. */
  ticketsUrl: z.string().nullable(),
  /** API path of the tickets PDF, once approved. */
  ticketsPdf: z.string().nullable(),
  checkedIn: z.number(),
  tickets: z.array(z.object({
    number: z.number(), code: z.string(), qr: z.string(), checkedInAt: z.string().nullable(), checkedInBy: z.string().nullable(),
  })),
});
export type AdminBooking = z.infer<typeof adminBookingSchema>;

export const adminBookingsResponseSchema = z.object({
  bookings: z.array(adminBookingSchema),
  statusCounts: z.record(bookingStatusSchema, z.number()),
  event: adminEventSchema,
});
export type AdminBookingsResponse = z.infer<typeof adminBookingsResponseSchema>;

export const eventPerformanceSchema = z.object({
  days: z.number(),
  daily: z.array(z.object({ date: z.string(), views: z.number(), bookings: z.number(), seats: z.number() })),
  views: z.object({ total: z.number(), lastWeek: z.number() }),
  bookings: z.object({ active: z.number(), pending: z.number(), cancelled: z.number(), seats: z.number() }),
});
export type EventPerformance = z.infer<typeof eventPerformanceSchema>;

export const allBookingsResponseSchema = z.object({
  bookings: z.array(adminBookingSchema),
  count: z.number(),
  page: z.number(),
  pages: z.number(),
  statusCounts: z.record(bookingStatusSchema, z.number()),
  events: z.array(z.object({ id: z.string(), title: z.string() })),
});
export type AllBookingsResponse = z.infer<typeof allBookingsResponseSchema>;

/* ---------- Check-in ---------- */

export const checkInTicketSchema = z.object({
  number: z.number(),
  of: z.number(),
  name: z.string(),
  reference: z.string(),
  event: z.string(),
  checkedInAt: z.string().nullable(),
  eventCheckedIn: z.number(),
  eventTickets: z.number(),
});
export type CheckInTicket = z.infer<typeof checkInTicketSchema>;
