import { API_BASE_URL, ApiError, apiRequest, postJson } from '@/lib/http';
import {
  adminBookingSchema,
  allBookingsResponseSchema,
  eventPerformanceSchema,
  adminBookingsResponseSchema,
  adminEnquiriesResponseSchema,
  adminEnquirySchema,
  adminEventSchema,
  adminEventsResponseSchema,
  adminSchema,
  adminSessionSchema,
  type BookingStatus,
  type EnquiryStatus,
  type EnquiryUpdateValues,
  type EventFormValues,
  type ForgotPasswordValues,
  type LoginValues,
  staffMemberSchema,
  type StaffFormValues,
  statsSchema,
} from '@/lib/schemas';
import { useAuthStore } from '@/store/useAuthStore';
import { z } from 'zod';

export async function login(values: LoginValues) {
  return adminSessionSchema.parse(await postJson('/api/admin/auth/login', values));
}

export async function requestPasswordReset(values: ForgotPasswordValues) {
  await postJson('/api/admin/auth/forgot-password', values);
}

export async function resetPassword(token: string, password: string) {
  await postJson('/api/admin/auth/reset-password', { token, password });
}

/** Authenticated request for admin endpoints; signs the admin out when the API rejects the session. */
export async function adminRequest(path: string, init: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  try {
    return await apiRequest(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) useAuthStore.getState().signOut();
    throw error;
  }
}

/** Confirms the saved session is still valid and refreshes the admin's details. */
export async function fetchCurrentAdmin() {
  const { admin } = z.object({ admin: adminSchema }).parse(await adminRequest('/api/admin/auth/me'));
  useAuthStore.getState().setAdmin(admin);
  return admin;
}

/** Ends the session on the API (best effort) and always clears it locally. */
export async function logout() {
  try {
    await adminRequest('/api/admin/auth/logout', { method: 'POST' });
  } catch {
    // Already invalid or unreachable: signing out locally is still correct.
  } finally {
    useAuthStore.getState().signOut();
  }
}

export interface EnquiryQuery {
  status?: EnquiryStatus;
  search?: string;
  page?: number;
}

/** One page of enquiries, newest first, with per-status counts for the filter tabs. */
export async function fetchEnquiries({ status, search, page }: EnquiryQuery = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (page && page > 1) params.set('page', String(page));
  const query = params.toString() ? `?${params}` : '';
  return adminEnquiriesResponseSchema.parse(await adminRequest(`/api/admin/enquiries${query}`));
}

/** Saves an enquiry's status and internal notes; returns the updated enquiry. */
export async function updateEnquiry(reference: string, values: Partial<EnquiryUpdateValues>) {
  const data = await adminRequest(`/api/admin/enquiries/${encodeURIComponent(reference)}`, { method: 'PATCH', body: JSON.stringify(values) });
  return z.object({ enquiry: adminEnquirySchema }).parse(data).enquiry;
}

/** Dashboard figures for the last `days` days (7, 30 or 90). */
export async function fetchStats(days: number) {
  return statsSchema.parse(await adminRequest(`/api/admin/stats?days=${days}`));
}

/* Staff management (admins only). */

export async function fetchStaff() {
  return z.object({ staff: z.array(staffMemberSchema) }).parse(await adminRequest('/api/admin/staff')).staff;
}

export async function createStaff(values: StaffFormValues) {
  const data = await adminRequest('/api/admin/staff', { method: 'POST', body: JSON.stringify(values) });
  return z.object({ member: staffMemberSchema }).parse(data).member;
}

export async function updateStaff(id: string, values: Partial<StaffFormValues>) {
  const data = await adminRequest(`/api/admin/staff/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(values) });
  return z.object({ member: staffMemberSchema }).parse(data).member;
}

/* Event engine. */

export interface EventQuery {
  status?: 'published' | 'draft';
  category?: string;
  search?: string;
}

export async function fetchAdminEvents({ status, category, search }: EventQuery = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  const query = params.toString() ? `?${params}` : '';
  return adminEventsResponseSchema.parse(await adminRequest(`/api/admin/events${query}`));
}

export async function fetchAdminEvent(id: string) {
  return z.object({ event: adminEventSchema }).parse(await adminRequest(`/api/admin/events/${encodeURIComponent(id)}`)).event;
}

export interface CoverChange {
  /** A new cover to upload. */
  file?: File | null;
  /** Drop the current cover (and fall back to the built-in image). */
  remove?: boolean;
}

/** Creates (no `id`) or updates an event. Sent as multipart so a cover can come along; empty dates clear them. */
export async function saveEvent(id: string | null, values: Partial<EventFormValues>, cover: CoverChange = {}) {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) body.append(key, String(value));
  if (cover.file) body.append('cover', cover.file);
  if (cover.remove) body.append('removeCover', 'true');
  const path = id ? `/api/admin/events/${encodeURIComponent(id)}` : '/api/admin/events';
  const data = await adminRequest(path, { method: id ? 'PATCH' : 'POST', body });
  return z.object({ event: adminEventSchema }).parse(data).event;
}

/** Flips an event's switches (published, bookings open, featured) without touching anything else. */
export async function updateEventFlags(id: string, flags: { isPublished?: boolean; bookingsOpen?: boolean; isFeatured?: boolean }) {
  const data = await adminRequest(`/api/admin/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(flags) });
  return z.object({ event: adminEventSchema }).parse(data).event;
}

export async function fetchEventPerformance(id: string, days: number) {
  return eventPerformanceSchema.parse(await adminRequest(`/api/admin/events/${encodeURIComponent(id)}/performance?days=${days}`));
}

export interface BookingQuery {
  event?: string;
  status?: BookingStatus;
  search?: string;
  page?: number;
}

/** Bookings across all events, newest first, 25 per page. */
export async function fetchAllBookings({ event, status, search, page }: BookingQuery = {}) {
  const params = new URLSearchParams();
  if (event) params.set('event', event);
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (page && page > 1) params.set('page', String(page));
  const query = params.toString() ? `?${params}` : '';
  return allBookingsResponseSchema.parse(await adminRequest(`/api/admin/bookings${query}`));
}

export async function deleteEvent(id: string) {
  await adminRequest(`/api/admin/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* Bookings. */

export async function fetchEventBookings(eventId: string, { status, search }: { status?: BookingStatus; search?: string } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const query = params.toString() ? `?${params}` : '';
  return adminBookingsResponseSchema.parse(await adminRequest(`/api/admin/events/${encodeURIComponent(eventId)}/bookings${query}`));
}

export async function updateBooking(reference: string, values: { status?: BookingStatus; notes?: string }) {
  const data = await adminRequest(`/api/admin/bookings/${encodeURIComponent(reference)}`, { method: 'PATCH', body: JSON.stringify(values) });
  return z.object({ booking: adminBookingSchema }).parse(data).booking;
}

/** Downloads an event's bookings as CSV (fetched with the admin's token, then saved by the browser). */
export async function downloadBookingsCsv(eventId: string, filename: string) {
  const token = useAuthStore.getState().token;
  const response = await fetch(`${API_BASE_URL}/api/admin/events/${encodeURIComponent(eventId)}/bookings?export=csv`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError('Could not download the bookings. Please try again.', response.status);
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}
