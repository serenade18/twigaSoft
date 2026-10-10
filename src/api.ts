import { apiErrorSchema, enquiryResultSchema, eventsResponseSchema, type Enquiry, type SiteEvent } from '@/lib/schemas';

async function postJson(url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data: unknown = await response.json();
  if (!response.ok) throw new Error(apiErrorSchema.safeParse(data).data?.error || 'Please try again.');
  return data;
}

export async function fetchEvents(): Promise<SiteEvent[]> {
  const response = await fetch('/api/events');
  if (!response.ok) throw new Error('Unable to load events');
  return eventsResponseSchema.parse(await response.json()).events;
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
