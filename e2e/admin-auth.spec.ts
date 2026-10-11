import { expect, test } from '@playwright/test';
import { ADMIN, djangoShell, resetDatabase, resetLinkFor, sentEmails, signIn, storedToken } from './support';

test.beforeEach(() => resetDatabase());

const tokenExists = (token: string) =>
  djangoShell(`from rest_framework.authtoken.models import Token; print(Token.objects.filter(key='${token}').exists())`) === 'True';

test.describe('sign in', () => {
  test('admin pages redirect to sign in, then back after signing in', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    await page.getByLabel('Email address').fill(ADMIN.email.toUpperCase());
    await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    await expect(page.getByText(ADMIN.name)).toBeVisible();
  });

  test('validates the form before calling the API', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill('nope');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Please enter your password.')).toBeVisible();
  });

  test('rejects a wrong password, an unknown email and a non-admin account the same way', async ({ page }) => {
    djangoShell("from django.contrib.auth import get_user_model; get_user_model().objects.create_user('member@e2e.test', 'Member-pass-2026'); print('ok')");
    for (const [email, password] of [[ADMIN.email, 'Wrong-pass-2026'], ['nobody@e2e.test', ADMIN.password], ['member@e2e.test', 'Member-pass-2026']]) {
      await signIn(page, email, password);
      await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.');
      await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
    expect(await storedToken(page)).toBeNull();
  });

  test('the show password toggle reveals what was typed', async ({ page }) => {
    await page.goto('/admin/login');
    const password = page.getByLabel('Password', { exact: true });
    await password.fill('secret-value');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
  });

  test('the session survives a reload, and signed-in admins skip the sign-in page', async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    await page.goto('/admin/login');
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe('sessions', () => {
  test('signing out ends the session on the API too', async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    const token = (await storedToken(page))!;
    expect(tokenExists(token)).toBe(true);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect(await storedToken(page)).toBeNull();
    expect(tokenExists(token)).toBe(false);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('a session revoked on the server sends the admin back to sign in', async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    djangoShell("from rest_framework.authtoken.models import Token; Token.objects.all().delete(); print('ok')");

    await page.reload();
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect(await storedToken(page)).toBeNull();
  });

  test('an expired session sends the admin back to sign in', async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    djangoShell("from datetime import timedelta; from django.utils import timezone; from rest_framework.authtoken.models import Token; Token.objects.update(created=timezone.now() - timedelta(hours=13)); print('ok')");

    await page.reload();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('signing in on a second device ends the first session', async ({ page, browser }) => {
    await signIn(page);
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();

    const other = await browser.newPage();
    await signIn(other);
    await expect(other.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    await other.close();

    await page.reload();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe('forgot and reset password', () => {
  test('full flow: request a link, choose a new password, sign in with it', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
    await page.getByLabel('Email address').fill(ADMIN.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByText(ADMIN.email)).toBeVisible();

    const link = await resetLinkFor(ADMIN.email);
    await page.goto(link);
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();

    // Client-side rules first.
    await page.getByLabel('New password').fill('short');
    await page.getByLabel('Confirm new password').fill('different');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText('Use at least 8 characters.')).toBeVisible();
    await expect(page.getByText('Passwords do not match.')).toBeVisible();

    // Then Django's validators, shown under the field.
    await page.getByLabel('New password').fill('password123');
    await page.getByLabel('Confirm new password').fill('password123');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText('This password is too common.')).toBeVisible();

    await page.getByLabel('New password').fill('Fresh-pass-2027');
    await page.getByLabel('Confirm new password').fill('Fresh-pass-2027');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('status')).toHaveText('Your password has been updated. Sign in with your new password.');

    await signIn(page, ADMIN.email, ADMIN.password);
    await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.');
    await signIn(page, ADMIN.email, 'Fresh-pass-2027');
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
  });

  test('a reset link works only once', async ({ page }) => {
    await page.goto('/admin/forgot-password');
    await page.getByLabel('Email address').fill(ADMIN.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    const link = await resetLinkFor(ADMIN.email);

    for (const attempt of ['Fresh-pass-2027', 'Second-pass-2027']) {
      await page.goto(link);
      await page.getByLabel('New password').fill(attempt);
      await page.getByLabel('Confirm new password').fill(attempt);
      await page.getByRole('button', { name: 'Update password' }).click();
    }
    await expect(page.getByRole('alert')).toContainText('This reset link is invalid or has expired.');
    await page.getByRole('alert').getByRole('link', { name: 'Request a new link' }).click();
    await expect(page).toHaveURL(/\/admin\/forgot-password$/);
  });

  test('resetting the password signs the admin out everywhere', async ({ page, browser }) => {
    await signIn(page);
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();

    const other = await browser.newPage();
    await other.goto('/admin/forgot-password');
    await other.getByLabel('Email address').fill(ADMIN.email);
    await other.getByRole('button', { name: 'Send reset link' }).click();
    await other.goto(await resetLinkFor(ADMIN.email));
    await other.getByLabel('New password').fill('Fresh-pass-2027');
    await other.getByLabel('Confirm new password').fill('Fresh-pass-2027');
    await other.getByRole('button', { name: 'Update password' }).click();
    await expect(other).toHaveURL(/\/admin\/login$/);
    await other.close();

    await page.reload();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('unknown emails get the same confirmation but no email', async ({ page }) => {
    await page.goto('/admin/forgot-password');
    await page.getByLabel('Email address').fill('nobody@e2e.test');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await page.waitForTimeout(500);
    expect(sentEmails()).toEqual([]);

    await page.getByRole('button', { name: 'Use a different email' }).click();
    await expect(page.getByLabel('Email address')).toBeVisible();
  });

  test('a link without a token, or with a forged one, is rejected', async ({ page }) => {
    await page.goto('/admin/reset-password');
    await expect(page.getByRole('heading', { name: 'Link not valid' })).toBeVisible();
    await page.getByRole('link', { name: 'Request a new link' }).click();
    await expect(page).toHaveURL(/\/admin\/forgot-password$/);

    await page.goto('/admin/reset-password?token=MQ.forged-token');
    await page.getByLabel('New password').fill('Fresh-pass-2027');
    await page.getByLabel('Confirm new password').fill('Fresh-pass-2027');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByRole('alert')).toContainText('This reset link is invalid or has expired.');
  });
});
