import { ApiError, apiRequest, postJson } from '@/lib/http';
import {
  adminEnquiriesResponseSchema,
  adminEnquirySchema,
  adminSchema,
  adminSessionSchema,
  type EnquiryStatus,
  type EnquiryUpdateValues,
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
