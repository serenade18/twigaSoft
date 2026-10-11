import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { API_DIR } from '../playwright.config';

export const ADMIN = { email: 'admin@e2e.test', password: 'Original-pass-2026', name: 'Amina' };
export const STAFF = { email: 'staff@e2e.test', password: 'Staff-pass-2026', name: 'Omar' };

/** Runs a Django management command against the e2e database and returns its output. */
export function django(args: string[]) {
  return execFileSync(path.join(API_DIR, '.venv/bin/python'), ['manage.py', ...args], {
    cwd: API_DIR,
    env: { ...process.env, DJANGO_SETTINGS_MODULE: 'config.settings_e2e' },
    encoding: 'utf8',
  });
}

/** Runs Python in `manage.py shell` and returns the last printed line. */
export function djangoShell(code: string) {
  const lines = django(['shell', '-c', code]).trim().split('\n');
  return lines[lines.length - 1];
}

/** Wipes the e2e database and mailbox, seeds the e2e events, the standard admin and a staff member. */
export function resetDatabase() {
  django(['e2e_reset', '--admin', `${ADMIN.email}:${ADMIN.password}:${ADMIN.name}`, '--staff', `${STAFF.email}:${STAFF.password}:${STAFF.name}`]);
}

const MAIL_DIR = path.join(API_DIR, '.e2e-mail');

function decodeQuotedPrintable(text: string) {
  return text.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/** Every email Django has "sent" since the last reset, oldest first. */
export function sentEmails() {
  if (!fs.existsSync(MAIL_DIR)) return [];
  return fs.readdirSync(MAIL_DIR)
    .map(name => path.join(MAIL_DIR, name))
    .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs)
    .flatMap(file => fs.readFileSync(file, 'utf8').split(/^-{79}$/m))
    .map(message => decodeQuotedPrintable(message).trim())
    .filter(Boolean);
}

/** Waits for a password reset email to the given address and returns the link's path and query. */
export async function resetLinkFor(email: string) {
  let link = '';
  await expect.poll(() => {
    const message = sentEmails().reverse().find(m => m.includes(`To: ${email}`));
    link = message?.match(/https?:\/\/\S+\/admin\/reset-password\?token=\S+/)?.[0] ?? '';
    return link;
  }, { message: `reset email to ${email}` }).not.toBe('');
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
}

export async function signIn(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** The admin token the site saved in localStorage after signing in. */
export async function storedToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('twb-admin-session');
    return raw ? (JSON.parse(raw).state?.token ?? null) : null;
  });
}
