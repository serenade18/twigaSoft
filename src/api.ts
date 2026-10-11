import { apiRequest, postJson } from '@/lib/http';
import { enquiryResultSchema, eventsResponseSchema, type Enquiry, type SiteEvent } from '@/lib/schemas';

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
