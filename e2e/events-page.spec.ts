import { expect, test, type Page } from '@playwright/test';
import { resetDatabase } from './support';

// e2e_reset seeds: E2E Investment Summit (summit, Nairobi, Mar 2027), E2E Trade Expo (exhibition, Kampala, Jun 2027),
// E2E Founders Workshop (workshop, Nairobi, May 2025 — past) and an unpublished event.
// The expo has 3 seats.
test.beforeEach(() => resetDatabase());

const cards = (page: Page) => page.locator('#event-grid article');
const titles = (page: Page) => cards(page).locator('h3');

test('the header links to the events page, which lists upcoming events soonest first', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Summits & Events' }).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Gatherings that connect Africa and the Gulf.');
  await expect(titles(page)).toHaveText(['E2E Investment Summit', 'E2E Trade Expo']);
  await expect(page.getByRole('status').first()).toHaveText('2 events');
  await expect(page.getByText('Unpublished E2E Event')).toHaveCount(0);
});

test('filters by type, location, date and search, and keeps filters in the URL', async ({ page }) => {
  await page.goto('/events');
  await expect(titles(page)).toHaveCount(2);

  await page.getByRole('button', { name: 'Exhibitions' }).click();
  await expect(page).toHaveURL(/category=exhibition/);
  await expect(titles(page)).toHaveText(['E2E Trade Expo']);
  await page.getByRole('button', { name: 'All types' }).click();

  await page.getByRole('radio', { name: 'Past' }).click();
  await expect(titles(page)).toHaveText(['E2E Founders Workshop']);
  await page.getByRole('radio', { name: 'All dates' }).click();
  await expect(titles(page)).toHaveCount(3);

  await page.getByLabel('Location').selectOption('Nairobi');
  await expect(titles(page)).toHaveText(['E2E Investment Summit', 'E2E Founders Workshop']);

  await page.getByLabel('Search events').fill('workshop');
  await expect(titles(page)).toHaveText(['E2E Founders Workshop']);

  // A shared link opens the same view.
  await page.reload();
  await expect(page.getByLabel('Search events')).toHaveValue('workshop');
  await expect(titles(page)).toHaveText(['E2E Founders Workshop']);

  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(titles(page)).toHaveCount(2);
});

test('shows an empty state that suggests past events', async ({ page }) => {
  await page.goto('/events?q=no-such-event');
  await expect(page.getByRole('heading', { name: 'No events match these filters' })).toBeVisible();
  await page.getByLabel('Search events').fill('');
  await page.getByRole('button', { name: 'Workshops' }).click();
  await page.getByRole('button', { name: 'See past events' }).click();
  await expect(titles(page)).toHaveText(['E2E Founders Workshop']);
});

test('opens an event’s page from the list', async ({ page }) => {
  await page.goto('/events');
  await page.getByRole('button', { name: 'View E2E Summit' }).click();
  await expect(page).toHaveURL(/\/events\/e2e-summit$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Investment Summit');
  await page.getByRole('link', { name: /All summits & events/ }).click();
  await expect(page).toHaveURL(/\/events$/);
});

test('the home page features upcoming events and links to the full list', async ({ page }) => {
  await page.goto('/');
  const grid = page.locator('#event-grid');
  await expect(grid.getByRole('heading', { name: 'E2E Investment Summit' })).toBeVisible();
  await expect(grid.getByText('E2E Founders Workshop')).toHaveCount(0);
  await page.getByRole('link', { name: /View all summits & events/ }).click();
  await expect(page).toHaveURL(/\/events$/);
});
