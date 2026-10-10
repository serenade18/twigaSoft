async function postJson(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Please try again.');
  return data;
}

export async function fetchEvents() {
  const response = await fetch('/api/events');
  if (!response.ok) throw new Error('Unable to load events');
  const data = await response.json();
  return data.events;
}

export const submitEnquiry = payload => postJson('/api/enquiries', payload);

export const subscribeToUpdates = email => postJson('/api/enquiries', {
  name: 'Updates subscriber',
  email,
  country: 'Not supplied',
  interest: 'Email updates subscription',
  message: 'Please keep me informed about AFRIGULF Exchange opportunities and insights.',
});
