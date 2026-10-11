import { expect, test, type Page } from '@playwright/test';
import { djangoShell, resetDatabase, signIn } from './support';

test.beforeEach(() => {
  resetDatabase();
  djangoShell(`
from enquiries.models import Enquiry
base = dict(phone='', country='Kenya', interest='Company Formation', message='We would like to open a branch office in Dubai.')
Enquiry.objects.create(name='Amina Yusuf', email='amina@example.com', reference='AGX-270101-AAAAA', **base)
Enquiry.objects.create(name='Omar Said', email='omar@example.com', reference='AGX-270101-BBBBB', **{**base, 'country': 'Oman'})
Enquiry.objects.create(name='Zara Ali', email='zara@example.com', reference='AGX-270101-CCCCC', status='closed', **base)
print('ok')`);
});

const rows = (page: Page) => page.locator('tbody tr');
const storedEnquiry = (reference: string) =>
  JSON.parse(djangoShell(`import json; from enquiries.models import Enquiry; e = Enquiry.objects.get(reference='${reference}'); print(json.dumps({'status': e.status, 'notes': e.notes}))`));

test('lists enquiries from the API and filters them by status and search', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Enquiries', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/enquiries$/);
  await expect(page.getByRole('heading', { name: 'Enquiries' })).toBeVisible();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByRole('tab', { name: 'All 3' })).toBeVisible();

  await page.getByRole('tab', { name: 'Closed 1' }).click();
  await expect(page).toHaveURL(/status=closed/);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('Zara Ali');

  await page.getByRole('tab', { name: /^All/ }).click();
  await page.getByLabel('Search enquiries').fill('oman');
  await expect(page).toHaveURL(/search=oman/);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('Omar Said');
});

test('opens an enquiry and saves its status and notes', async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/enquiries');
  await page.getByRole('button', { name: 'Amina Yusuf' }).click();

  const panel = page.getByRole('dialog');
  await expect(panel.getByRole('heading', { name: 'Amina Yusuf' })).toBeVisible();
  await expect(panel).toContainText('We would like to open a branch office in Dubai.');

  await panel.getByRole('combobox').click();
  await page.getByRole('option', { name: 'In progress' }).click();
  await panel.getByLabel('Internal notes').fill('Called back on Monday.');
  await panel.getByRole('button', { name: 'Save changes' }).click();

  await expect(panel.getByText('Changes saved.')).toBeVisible();
  expect(storedEnquiry('AGX-270101-AAAAA')).toEqual({ status: 'in_progress', notes: 'Called back on Monday.' });
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page.getByRole('tab', { name: 'In progress 1' })).toBeVisible();
  await expect(rows(page).filter({ hasText: 'Amina Yusuf' })).toContainText('In progress');
});
