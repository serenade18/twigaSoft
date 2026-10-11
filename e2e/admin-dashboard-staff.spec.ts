import { expect, test } from '@playwright/test';
import { ADMIN, STAFF, djangoShell, resetDatabase, signIn } from './support';

test.beforeEach(() => resetDatabase());

test.describe('dashboard', () => {
  test('shows enquiry analytics from the API and switches period', async ({ page }) => {
    djangoShell(`
from datetime import timedelta
from django.utils import timezone
from enquiries.models import Enquiry
base = dict(email='a@example.com', country='Kenya', interest='Company Formation', message='Hello, we would like to talk.')
Enquiry.objects.create(name='Amina Yusuf', **base)
Enquiry.objects.create(name='Omar Said', **{**base, 'country': 'Oman', 'interest': 'Trade Missions'}, status='closed')
old = Enquiry.objects.create(name='Old Lead', **base)
Enquiry.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=20))
print('ok')`);
    await signIn(page);
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();

    const periodTile = page.getByText('Enquiries, last 30 days').locator('..');
    await expect(periodTile).toContainText('3');
    await expect(page.getByText('Awaiting reply').locator('..')).toContainText('2');
    await expect(page.getByRole('heading', { name: 'Top countries' }).locator('..')).toContainText('Oman');
    await expect(page.getByRole('heading', { name: 'Latest enquiries' }).locator('..')).toContainText('Old Lead');

    await page.getByRole('radio', { name: 'Last 7 days' }).click();
    await expect(page).toHaveURL(/days=7/);
    await expect(page.getByText('Enquiries, last 7 days').locator('..')).toContainText('2');
  });
});

test.describe('staff', () => {
  test('an admin adds a staff member who can then sign in, without staff management', async ({ page }) => {
    await signIn(page);
    await page.getByRole('link', { name: 'Staff' }).click();
    await expect(page.getByRole('heading', { name: 'Staff' })).toBeVisible();
    await expect(page.getByRole('row', { name: new RegExp(ADMIN.email) })).toContainText('(you)');

    await page.getByRole('button', { name: 'Add staff' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('First name').fill('Leila');
    await dialog.getByLabel('Last name').fill('Hassan');
    await dialog.getByLabel('Email address').fill('leila@e2e.test');
    await dialog.getByLabel('Password', { exact: true }).fill('12345678');
    await dialog.getByRole('button', { name: 'Add staff' }).click();
    // Django's validators reject weak passwords; the message shows on the field.
    await expect(dialog.getByText(/too common|entirely numeric/)).toBeVisible();

    await dialog.getByLabel('Password', { exact: true }).fill('Leila-pass-2026');
    await dialog.getByRole('button', { name: 'Add staff' }).click();
    await expect(page.getByText('Leila Hassan can now sign in.')).toBeVisible();
    await expect(page.getByRole('row', { name: /leila@e2e.test/ })).toContainText('Staff');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page, 'leila@e2e.test', 'Leila-pass-2026');
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Staff' })).toHaveCount(0);
    await page.goto('/admin/staff');
    await expect(page.getByText('Only admins can manage staff accounts.')).toBeVisible();
  });

  test('deactivating a staff member stops them signing in', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto('/admin/staff');
    await page.getByRole('button', { name: `Edit ${STAFF.name}` }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Account active').uncheck();
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('row', { name: new RegExp(STAFF.email) })).toContainText('Deactivated');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page, STAFF.email, STAFF.password);
    await expect(page.getByRole('alert')).toContainText('Incorrect email or password.');
  });

  test('admins can’t change their own role or deactivate themselves', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto('/admin/staff');
    await page.getByRole('button', { name: `Edit ${ADMIN.name}` }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('combobox')).toBeDisabled();
    await expect(dialog.getByLabel('Account active')).toBeDisabled();
  });
});
