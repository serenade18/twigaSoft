import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { apiErrorSchema } from '@/lib/schemas';

// The dev server proxies /api to VITE_API_BASE_URL (see vite.config.ts), so requests stay same-origin in development.
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Error from the API: `message` is safe to show; `fields` holds per-field validation messages. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly fields: Record<string, string[]> = {}) {
    super(message);
  }
}

export async function apiRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } });
  } catch {
    throw new ApiError('We could not reach the server. Check your connection and try again.', 0);
  }
  if (response.status === 204) return null;
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(data).data;
    throw new ApiError(parsed?.error || 'Something went wrong. Please try again.', response.status, parsed?.fields);
  }
  return data;
}

export const postJson = (path: string, body: unknown, init: RequestInit = {}) =>
  apiRequest(path, { ...init, method: 'POST', body: JSON.stringify(body) });

/**
 * Shows the API's field errors next to the matching form fields.
 * Returns true when at least one field error was placed, so callers can skip a generic banner.
 */
export function applyFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fieldNames: readonly Path<T>[]) {
  if (!(error instanceof ApiError)) return false;
  let placed = false;
  for (const name of fieldNames) {
    const message = error.fields[name]?.[0];
    if (message) {
      setError(name, { type: 'server', message }, { shouldFocus: !placed });
      placed = true;
    }
  }
  return placed;
}
