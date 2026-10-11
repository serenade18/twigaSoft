import { expect, test, type Page } from '@playwright/test';
import { djangoShell, resetDatabase, sentEmails, signIn } from './support';

// e2e_reset seeds e2e-summit (no seat limit), e2e-expo (3 seats) and e2e-past (already happened).
test.beforeEach(() => resetDatabase());

const bookingForm = (page: Page) => page.getByRole('form', { name: /^Book / });

async function book(page: Page, { name = 'Amina Yusuf', email = 'amina@example.com', seats = 2 } = {}) {
  const form = bookingForm(page);
  await form.getByLabel('Full name').fill(name);
  await form.getByLabel('Email address').fill(email);
  await form.getByLabel('Country').fill('Kenya');
  await form.getByLabel('Organisation (optional)').fill('Yusuf Holdings');
  await form.getByLabel('Seats').fill(String(seats));
  await form.getByRole('button', { name: /Confirm booking/ }).click();
}

const viewCount = (slug: string) => djangoShell(`from events.models import Event; print(Event.objects.get(slug='${slug}').view_count)`);

test('books seats without payment, shows the reference and emails a confirmation', async ({ page }) => {
  await page.goto('/events/e2e-summit');
  await expect(page.getByRole('heading', { name: 'Book your place' })).toBeVisible();

  // Client-side validation first.
  await bookingForm(page).getByRole('button', { name: /Confirm booking/ }).click();
  await expect(page.getByText('Please enter your full name.')).toBeVisible();

  await book(page);
  const confirmation = page.getByRole('status').filter({ hasText: 'You’re booked!' });
  await expect(confirmation).toContainText('2 seats for E2E Investment Summit');
  await expect(confirmation).toContainText('nothing to pay');
  const reference = (await confirmation.textContent())?.match(/EVB-\d{6}-[A-Z2-9]{5}/)?.[0];
  expect(reference).toBeTruthy();

  const stored = djangoShell(`from events.models import Booking; b = Booking.objects.get(reference='${reference}'); print(b.event.slug, b.attendees, b.status, b.organisation)`);
  expect(stored).toBe('e2e-summit 2 confirmed Yusuf Holdings');
  await expect.poll(() => sentEmails().some(m => m.includes('To: amina@example.com') && m.includes(reference!))).toBe(true);

  // The same email can't book the same event twice.
  await page.reload();
  await book(page);
  await expect(bookingForm(page).getByText('This email already has a booking for this event.', { exact: false })).toBeVisible();
});

test('a limited event shows seats left, refuses overbooking and closes when full', async ({ page }) => {
  await page.goto('/events/e2e-expo');
  await expect(page.getByText('3 seats left.')).toBeVisible();
  await book(page, { seats: 4 });
  await expect(page.getByText('Only 3 seats left.')).toBeVisible(); // checked before sending

  await book(page, { seats: 3 });
  await expect(page.getByText('You’re booked!')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bookings closed' })).toBeVisible();
  await expect(page.getByText('This event is fully booked.')).toBeVisible();
});

test('past events and unknown events can’t be booked', async ({ page }) => {
  await page.goto('/events/e2e-past');
  await expect(page.getByText('This event has already taken place.')).toBeVisible();
  await page.goto('/events/no-such-event');
  await expect(page.getByRole('heading', { name: 'Event not found' })).toBeVisible();
});

test('counts one view per browser session', async ({ page }) => {
  await page.goto('/events/e2e-summit');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect.poll(() => viewCount('e2e-summit')).toBe('1');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForTimeout(500);
  expect(viewCount('e2e-summit')).toBe('1');
});

test('admins see each event’s views and bookings, and can cancel bookings and export them', async ({ page }) => {
  djangoShell(`
from events.models import Booking, Event
e = Event.objects.get(slug='e2e-expo'); e.view_count = 20; e.save()
Booking.objects.create(event=e, name='Omar Said', email='omar@example.com', country='Oman', attendees=2)
print('ok')`);
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  const performance = page.getByRole('heading', { name: 'Event performance' }).locator('..');
  await expect(performance.getByRole('row', { name: /E2E Trade Expo/ })).toContainText('20');
  await expect(performance.getByRole('row', { name: /E2E Trade Expo/ })).toContainText('5.0%');

  await page.goto('/admin/events');
  const row = page.getByRole('row', { name: /E2E Trade Expo/ });
  await expect(row).toContainText('2/3 seats');
  await row.getByRole('link', { name: 'E2E Trade Expo', exact: true }).click();

  // Performance tab, as in the overview mock-up.
  await expect(page.getByText('Page views', { exact: true }).locator('../..')).toContainText('20');
  await expect(page.getByText('Conversion', { exact: true }).locator('../..')).toContainText('5.0%');
  await expect(page.getByRole('meter', { name: 'Seats booked' })).toHaveAttribute('aria-valuenow', '2');
  await expect(page.getByRole('heading', { name: 'Seats booked per day' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Page views per day' })).toBeVisible();

  await page.getByRole('link', { name: 'Attendees (1)' }).click();
  await expect(page).toHaveURL(/\/attendees$/);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toBe('e2e-expo-bookings.csv');

  await page.getByRole('button', { name: 'Cancel booking for Omar Said' }).click();
  await expect(page.getByRole('row', { name: /Omar Said/ })).toContainText('Cancelled');
  await expect(page.getByRole('link', { name: 'Attendees (0)' })).toBeVisible();

  await page.getByRole('button', { name: 'Omar Said', exact: true }).click();
  await page.getByLabel('Internal notes').fill('Asked to move to next year.');
  await page.getByRole('button', { name: 'Save notes' }).click();
  await expect(page.getByText('Notes saved.')).toBeVisible();
});

test('the Bookings page lists bookings across events', async ({ page }) => {
  djangoShell(`
from events.models import Booking, Event
Booking.objects.create(event=Event.objects.get(slug='e2e-expo'), name='Omar Said', email='omar@example.com', country='Oman', attendees=2)
Booking.objects.create(event=Event.objects.get(slug='e2e-summit'), name='Leila Hassan', email='leila@example.com', country='UAE')
print('ok')`);
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('link', { name: 'Bookings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bookings', level: 1 })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByRole('row', { name: /Omar Said/ })).toContainText('E2E Trade Expo');

  await page.getByLabel('Event').selectOption({ label: 'E2E Investment Summit' });
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr')).toContainText('Leila Hassan');
  await page.getByLabel('Event').selectOption('');
  await page.getByLabel('Search bookings').fill('omar');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'E2E Trade Expo' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Trade Expo');
});
