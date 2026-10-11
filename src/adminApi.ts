import { ApiError, apiRequest, postJson } from '@/lib/http';
import { adminSchema, adminSessionSchema, type ForgotPasswordValues, type LoginValues } from '@/lib/schemas';
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
