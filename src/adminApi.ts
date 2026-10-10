import { adminSessionSchema, apiErrorSchema, type ForgotPasswordValues, type LoginValues } from '@/lib/schemas';
import { useAuthStore } from '@/store/useAuthStore';

async function request(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorSchema.safeParse(data).data?.error || 'Something went wrong. Please try again.');
  return data;
}

export async function login(values: LoginValues) {
  return adminSessionSchema.parse(await request('/api/admin/auth/login', { method: 'POST', body: JSON.stringify(values) }));
}

export async function requestPasswordReset(values: ForgotPasswordValues) {
  await request('/api/admin/auth/forgot-password', { method: 'POST', body: JSON.stringify(values) });
}

export async function resetPassword(token: string, password: string) {
  await request('/api/admin/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
}

/** Authenticated request for admin endpoints; signs the admin out when the session is rejected. */
export async function adminFetch(url: string, init: RequestInit = {}) {
  const { token, signOut } = useAuthStore.getState();
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers } });
  if (response.status === 401) signOut();
  return response;
}
