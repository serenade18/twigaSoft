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

test('a booking request reserves seats, shows the reference and emails a receipt', async ({ page }) => {
  await page.goto('/events/e2e-summit');
  await expect(page.getByRole('heading', { name: 'Book your place' })).toBeVisible();

  // Client-side validation first.
  await bookingForm(page).getByRole('button', { name: /Confirm booking/ }).click();
  await expect(page.getByText('Please enter your full name.')).toBeVisible();

  await book(page);
  const confirmation = page.getByRole('status').filter({ hasText: 'Booking request received' });
  await expect(confirmation).toContainText('2 seats for E2E Investment Summit are reserved for you');
  await expect(confirmation).toContainText('nothing to pay');
  const reference = (await confirmation.textContent())?.match(/EVB-\d{6}-[A-Z2-9]{5}/)?.[0];
  expect(reference).toBeTruthy();

  const stored = djangoShell(`from events.models import Booking; b = Booking.objects.get(reference='${reference}'); print(b.event.slug, b.attendees, b.status, b.organisation)`);
  expect(stored).toBe('e2e-summit 2 pending Yusuf Holdings');
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
  await expect(page.getByText('Booking request received')).toBeVisible(); // pending bookings hold their seats
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
  const item = page.getByRole('listitem', { name: 'E2E Trade Expo' });
  await expect(item).toContainText('2/3 seats');
  await item.getByRole('link', { name: 'E2E Trade Expo', exact: true }).click();

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

  await page.getByRole('button', { name: 'Decline booking for Omar Said' }).click();
  await expect(page.getByRole('listitem', { name: 'Booking for Omar Said' })).toContainText('Cancelled');
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
  const cards = page.getByRole('list', { name: 'Bookings' }).getByRole('listitem');
  await expect(cards).toHaveCount(2);
  await expect(page.getByRole('listitem', { name: 'Booking for Omar Said' })).toContainText('E2E Trade Expo');
  await expect(page.getByRole('tab', { name: /Pending/ })).toContainText('2');

  await page.getByLabel('Event').selectOption({ label: 'E2E Investment Summit' });
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Leila Hassan');
  await page.getByLabel('Event').selectOption('');
  await page.getByLabel('Search bookings').fill('omar');
  await expect(cards).toHaveCount(1);
  await page.getByRole('link', { name: 'E2E Trade Expo' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Trade Expo');
});

test('approving a booking emails the tickets (PDF + link); each QR checks in once, on the event day', async ({ page }) => {
  // An event happening today (in the events' time zone), with a pending booking for two seats.
  const token = djangoShell(`
from zoneinfo import ZoneInfo
from django.conf import settings
from django.utils import timezone
from events.models import Booking, Event
today = timezone.localdate(timezone=ZoneInfo(settings.EVENT_TIME_ZONE))
e = Event.objects.create(slug='today-forum', title='Today Forum', location='Dubai', organiser='E2E', summary='Happening today.', start_date=today)
b = Booking.objects.create(event=e, name='Grace Wanjiru', email='grace@example.com', country='Kenya', attendees=2)
print(b.access_token)`);

  // Before approval the tickets page says so.
  await page.goto(`/tickets/${token}`);
  await expect(page.getByRole('heading', { name: 'Waiting for approval' })).toBeVisible();

  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/bookings?status=pending');
  await page.getByRole('button', { name: 'Approve booking for Grace Wanjiru' }).click();
  await expect(page.getByRole('list', { name: 'Bookings' }).getByRole('listitem')).toHaveCount(0); // no longer pending

  await expect.poll(() => sentEmails().find(m => m.includes('To: grace@example.com') && m.includes('Your tickets')) ?? '').toContain(`/tickets/${token}`);
  const email = sentEmails().find(m => m.includes('To: grace@example.com') && m.includes('Your tickets'))!;
  expect(email).toMatch(/filename="tickets-EVB-\d{6}-[A-Z2-9]{5}\.pdf"/);

  // Admins can see the tickets too.
  await page.goto('/admin/bookings?status=confirmed');
  await page.getByRole('button', { name: 'Tickets for Grace Wanjiru' }).click();
  const panel = page.getByRole('dialog');
  await expect(panel.getByRole('img', { name: /QR code for ticket/ })).toHaveCount(2);
  await expect(panel.getByRole('link', { name: 'PDF' })).toHaveAttribute('href', new RegExp(`/api/tickets/${token}/pdf$`));
  await page.keyboard.press('Escape');

  // The booker's tickets page: two QR codes and a PDF download.
  await page.goto(`/tickets/${token}`);
  await expect(page.getByRole('img', { name: /QR code for ticket/ })).toHaveCount(2);
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(/^tickets-EVB-.*\.pdf$/);

  // At the door: the first scan admits, the second is refused.
  const code = djangoShell("from events.models import Ticket; print(Ticket.objects.get(booking__name='Grace Wanjiru', number=1).code)");
  await page.goto('/admin/check-in');
  await page.getByLabel('Ticket code').fill(code);
  await page.getByRole('button', { name: 'Check in' }).click();
  const result = page.getByRole('status').filter({ hasText: /Admitted|Already used|Not valid/ });
  await expect(result).toContainText('Admitted');
  await expect(result).toContainText('Grace Wanjiru');
  await expect(result).toContainText('1 of 2 tickets');
  await page.getByLabel('Ticket code').fill(code);
  await page.getByRole('button', { name: 'Check in' }).click();
  await expect(result).toContainText('Already used');

  // A ticket for another day is refused.
  const later = djangoShell(`
from events.models import Booking, Event, Ticket
e = Event.objects.get(slug='e2e-summit')
b = Booking.objects.create(event=e, name='Omar Said', email='omar@example.com', country='Oman', status='confirmed')
print(Ticket.objects.create(booking=b, number=1).code)`);
  await page.getByLabel('Ticket code').fill(later);
  await page.getByRole('button', { name: 'Check in' }).click();
  await expect(result).toContainText('Not valid');
  await expect(result).toContainText('only be scanned on the day of the event');

  // The booker's page now shows the used ticket.
  await page.goto(`/tickets/${token}`);
  await expect(page.getByRole('listitem', { name: 'Ticket 1' })).toContainText('Used');
});
