import { apiRequest, postJson } from '@/lib/http';
import {
  bookingResultSchema,
  enquiryResultSchema,
  eventDetailSchema,
  eventsResponseSchema,
  type BookingValues,
  type Enquiry,
  type SiteEvent,
} from '@/lib/schemas';
import { z } from 'zod';

export async function fetchEvents(): Promise<SiteEvent[]> {
  return eventsResponseSchema.parse(await apiRequest('/api/events')).events;
}

export async function submitEnquiry(payload: Enquiry) {
  return enquiryResultSchema.parse(await postJson('/api/enquiries', payload));
}

export async function subscribeToUpdates(email: string) {
  await postJson('/api/enquiries', {
    name: 'Updates subscriber',
    email,
    country: 'Not supplied',
    interest: 'Email updates subscription',
    message: 'Please keep me informed about AFRIGULF Exchange opportunities and insights.',
  });
}

export async function fetchEvent(slug: string) {
  return z.object({ event: eventDetailSchema }).parse(await apiRequest(`/api/events/${encodeURIComponent(slug)}`)).event;
}

/** Counts a view of an event page, at most once per event per browser session. Never throws. */
export function recordEventView(slug: string) {
  const key = `event-viewed:${slug}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage blocked (private mode): count the view anyway.
  }
  postJson(`/api/events/${encodeURIComponent(slug)}/view`, {}).catch(() => {});
}

export async function bookEvent(slug: string, payload: BookingValues) {
  return bookingResultSchema.parse(await postJson(`/api/events/${encodeURIComponent(slug)}/bookings`, payload));
}
