import { expect, test, type Page } from '@playwright/test';
import { djangoShell, resetDatabase, signIn } from './support';

// A 2×1 PNG, enough for Pillow to accept as an image.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAEElEQVR4nGNgYGD4z8DAAAAEAQEA5PQ3wQAAAABJRU5ErkJggg==', 'base64');

test.beforeEach(() => resetDatabase());

async function openEvents(page: Page) {
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('link', { name: 'Events', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Events', level: 1 })).toBeVisible();
}

const publicTitles = (page: Page) => page.locator('#event-grid article h3');

test('creates an event with a cover image that appears on the public events page', async ({ page }) => {
  await openEvents(page);
  await page.getByRole('link', { name: 'New event' }).click();
  await expect(page).toHaveURL(/\/admin\/events\/new$/);

  // Client-side validation first.
  await page.getByRole('button', { name: 'Create event' }).click();
  await expect(page.getByText('Please enter a title.')).toBeVisible();

  await page.getByLabel('Title').fill('Kigali Trade Forum 2027');
  await page.getByLabel('Organiser').fill('AFRIGULF Exchange');
  await page.getByLabel('Summary').fill('Buyers and suppliers from Rwanda and the Gulf.');
  await page.getByLabel('Location').fill('Kigali');
  await page.getByLabel('Start date').fill('2027-08-10');
  await page.getByLabel('End date (optional)').fill('2027-08-12');
  await expect(page.getByText('Leave blank to show “10–12 August 2027”.')).toBeVisible();
  await page.getByLabel('Cover image').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: PNG });

  // The preview uses the site's own card.
  const preview = page.locator('aside .event-card');
  await expect(preview).toContainText('Kigali Trade Forum 2027');
  await expect(preview).toContainText('Kigali · 10–12 August 2027');

  await page.getByRole('button', { name: 'Create event' }).click();
  await expect(page).toHaveURL(/\/admin\/events$/);
  await expect(page.getByText('“Kigali Trade Forum 2027” was created and is live on the site.')).toBeVisible();
  await expect(page.getByRole('row', { name: /Kigali Trade Forum 2027/ })).toContainText('Published');

  const stored = djangoShell("from events.models import Event; e = Event.objects.get(title='Kigali Trade Forum 2027'); print(e.slug, e.period, bool(e.cover))");
  expect(stored).toBe('kigali-trade-forum-2027 10–12 August 2027 True');

  await page.goto('/events');
  const card = page.locator('#event-grid article', { hasText: 'Kigali Trade Forum 2027' });
  await expect(card).toContainText('Kigali · 10–12 August 2027');
  await expect(card.locator('.event-image')).toHaveAttribute('style', /\/media\/events\/cover/);
});

test('drafts stay off the site until published, and events can be edited and deleted', async ({ page }) => {
  await openEvents(page);
  await page.getByRole('link', { name: 'New event' }).click();
  await page.getByLabel('Title').fill('Secret Summit');
  await page.getByLabel('Organiser').fill('AFRIGULF Exchange');
  await page.getByLabel('Summary').fill('Not announced yet.');
  await page.getByLabel('Location').fill('Doha');
  await page.getByLabel('Dates as shown on the site').fill('Early 2028');
  await page.getByLabel('Published').uncheck();
  await page.getByRole('button', { name: 'Create event' }).click();
  await expect(page.getByText('“Secret Summit” was created as a draft.')).toBeVisible();

  await page.goto('/events');
  await expect(publicTitles(page)).not.toContainText(['Secret Summit']);

  await page.goto('/admin/events?status=draft');
  await page.getByRole('button', { name: 'Publish Secret Summit' }).click();
  await expect(page.getByRole('row', { name: /Secret Summit/ })).toHaveCount(0); // no longer a draft
  await page.goto('/events');
  await expect(publicTitles(page)).toContainText(['Secret Summit']);

  await page.goto('/admin/events');
  await page.getByRole('link', { name: 'Edit Secret Summit' }).click();
  await page.getByLabel('Title').fill('Doha Leaders Summit');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('“Doha Leaders Summit” was saved and is live on the site.')).toBeVisible();

  await page.getByRole('link', { name: 'Edit Doha Leaders Summit' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete event' }).click();
  await expect(page.getByText('“Doha Leaders Summit” was deleted.')).toBeVisible();
  await page.goto('/events');
  await expect(publicTitles(page)).not.toContainText(['Doha Leaders Summit']);
});

test('shows the API’s errors next to the fields', async ({ page }) => {
  await openEvents(page);
  await page.getByRole('link', { name: 'New event' }).click();
  await page.getByLabel('Title').fill('Clash');
  await page.getByLabel('Organiser').fill('x');
  await page.getByLabel('Summary').fill('x');
  await page.getByLabel('Location').fill('x');
  await page.getByLabel('Start date').fill('2027-01-01');
  await page.getByLabel('Web address').fill('e2e-summit'); // already used by a seeded event
  await page.getByRole('button', { name: 'Create event' }).click();
  await expect(page.getByText('Another event already uses this web address.')).toBeVisible();
});
