import { expect, test, type Page } from '@playwright/test';
import { djangoShell, resetDatabase } from './support';

test.beforeEach(() => resetDatabase());

const enquiryForm = (page: Page) => page.locator('#enquiry-form');

async function chooseInterest(page: Page, option: string) {
  await enquiryForm(page).getByRole('combobox', { name: 'Area of interest' }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function fillEnquiry(page: Page, overrides: Partial<Record<'name' | 'email' | 'phone' | 'country' | 'message', string>> = {}) {
  const values = {
    name: 'Amina Yusuf',
    email: 'amina@example.com',
    phone: '+254 700 000 000',
    country: 'Kenya',
    message: 'We plan to open a Dubai branch office in the first half of next year.',
    ...overrides,
  };
  const form = enquiryForm(page);
  await form.getByLabel('Full name').fill(values.name);
  await form.getByLabel('Email address').fill(values.email);
  await form.getByLabel('Phone (optional)').fill(values.phone);
  await form.getByLabel('Country').fill(values.country);
  await form.getByLabel('Your plans').fill(values.message);
}

const storedEnquiries = () =>
  JSON.parse(djangoShell(
    "import json; from enquiries.models import Enquiry; print(json.dumps(list(Enquiry.objects.values('reference','name','email','phone','country','interest','message'))))",
  )) as Record<string, string>[];

test.describe('featured events', () => {
  test('shows published events from the API and hides unpublished ones', async ({ page }) => {
    await page.goto('/');
    const grid = page.locator('#event-grid');
    await expect(grid.getByRole('heading', { name: 'E2E Investment Summit' })).toBeVisible();
    await expect(grid).toContainText('Nairobi · March 2027');
    await expect(grid.getByText('Unpublished E2E Event')).toHaveCount(0);
    // The built-in fallback events only appear when the API can't be reached.
    await expect(grid.getByText('LCCM Global Leadership Summit 2026')).toHaveCount(0);
  });

  test('falls back to the built-in events when the API fails', async ({ page }) => {
    await page.route('**/api/events', route => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('/');
    await expect(page.locator('#event-grid').getByRole('heading', { name: 'LCCM Global Leadership Summit 2026' })).toBeVisible();
  });

  test('opens an event’s own page from its card', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'View E2E Summit' }).click();
    await expect(page).toHaveURL(/\/events\/e2e-summit$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Investment Summit');
    await expect(page.getByText('Two days of investor meetings.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Book your place' })).toBeVisible();
  });
});

test.describe('enquiry form', () => {
  test('submits an enquiry that is stored with the reference shown to the visitor', async ({ page }) => {
    await page.goto('/');
    await fillEnquiry(page);
    await chooseInterest(page, 'Company Formation');
    await enquiryForm(page).getByRole('button', { name: 'Submit enquiry' }).click();

    const status = page.locator('#form-status');
    await expect(status).toContainText('Thank you, Amina Yusuf. Your enquiry has been received.');
    const reference = (await status.textContent())?.match(/AGX-\d{6}-[A-Z2-9]{5}/)?.[0];
    expect(reference).toBeTruthy();

    expect(storedEnquiries()).toEqual([{
      reference,
      name: 'Amina Yusuf',
      email: 'amina@example.com',
      phone: '+254 700 000 000',
      country: 'Kenya',
      interest: 'Company Formation',
      message: 'We plan to open a Dubai branch office in the first half of next year.',
    }]);
    // The form is cleared for the next enquiry.
    await expect(enquiryForm(page).getByLabel('Full name')).toHaveValue('');
  });

  test('validates fields before sending anything', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/enquiries', route => { requests += 1; return route.continue(); });
    await page.goto('/');
    await fillEnquiry(page, { name: '', email: 'not-an-email', message: 'Too short' });
    await enquiryForm(page).getByRole('button', { name: 'Submit enquiry' }).click();

    const form = enquiryForm(page);
    await expect(form.getByText('Please enter your full name.')).toBeVisible();
    await expect(form.getByText('Please enter a valid email address.')).toBeVisible();
    await expect(form.getByText('Please choose an area of interest.')).toBeVisible();
    await expect(form.getByText('Please tell us a little more (at least 20 characters).')).toBeVisible();
    expect(requests).toBe(0);
    expect(storedEnquiries()).toEqual([]);
  });

  test('shows the API’s field errors next to the fields', async ({ page }) => {
    await page.route('**/api/enquiries', route => route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Enter a valid email address.', fields: { email: ['That email domain does not accept mail.'] } }),
    }));
    await page.goto('/');
    await fillEnquiry(page);
    await chooseInterest(page, 'Market Expansion');
    await enquiryForm(page).getByRole('button', { name: 'Submit enquiry' }).click();

    await expect(enquiryForm(page).getByText('That email domain does not accept mail.')).toBeVisible();
    await expect(page.locator('#form-status')).toHaveText('Please check the highlighted fields.');
    // Nothing is lost: the visitor can correct and resend.
    await expect(enquiryForm(page).getByLabel('Full name')).toHaveValue('Amina Yusuf');
  });

  test('keeps the details when the server is unavailable', async ({ page }) => {
    await page.route('**/api/enquiries', route => route.abort('connectionrefused'));
    await page.goto('/');
    await fillEnquiry(page);
    await chooseInterest(page, 'Company Formation');
    await enquiryForm(page).getByRole('button', { name: 'Submit enquiry' }).click();
    await expect(page.locator('#form-status')).toHaveText('We could not reach the server. Check your connection and try again.');
    await expect(enquiryForm(page).getByLabel('Your plans')).not.toHaveValue('');
  });

  test('the goal picker preselects the area of interest', async ({ page }) => {
    await page.goto('/');
    await page.locator('#goal-form').getByText('Organise a delegation').click();
    await page.locator('#goal-form').getByRole('button', { name: /Continue/ }).click();
    await expect(enquiryForm(page).getByRole('combobox', { name: 'Area of interest' })).toHaveText('Business Exchange & Delegations');
    await expect(enquiryForm(page).getByLabel('Full name')).toBeFocused();
  });

  test('silently drops submissions that fill the hidden honeypot field', async ({ page }) => {
    await page.goto('/');
    await fillEnquiry(page);
    await chooseInterest(page, 'Company Formation');
    await enquiryForm(page).locator('input[name="website"]').evaluate((input: HTMLInputElement) => {
      // Set the value the way a bot would, through React's tracked setter.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'spam.example');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await enquiryForm(page).getByRole('button', { name: 'Submit enquiry' }).click();
    await expect(page.locator('#form-status')).toContainText('Your enquiry has been received.');
    expect(storedEnquiries()).toEqual([]);
  });
});

test.describe('footer signup', () => {
  test('saves the email as an updates subscription', async ({ page }) => {
    await page.goto('/');
    const signup = page.locator('#footer-signup');
    await signup.getByPlaceholder('Your email address').fill('not-an-email');
    await signup.getByRole('button', { name: 'Sign up for updates' }).click();
    await expect(page.locator('#footer-signup-status')).toHaveText('Please enter a valid email address.');

    await signup.getByPlaceholder('Your email address').fill('updates@example.com');
    await signup.getByRole('button', { name: 'Sign up for updates' }).click();
    await expect(page.locator('#footer-signup-status')).toHaveText('Thank you. Your signup request has been saved.');
    expect(storedEnquiries()).toMatchObject([{ email: 'updates@example.com', interest: 'Email updates subscription' }]);
  });
});

test.describe('about page', () => {
  test('is reachable from the header and its FAQ expands', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'About TWB Global' }).first().click();
    await expect(page).toHaveURL(/\/about-twb-global$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your ambitions.');

    const question = page.getByRole('button', { name: 'How do I get started?' });
    await question.click();
    await expect(question).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Share your area of interest and a brief outline of your plans.')).toBeVisible();
  });

  test('a service call-to-action submits an enquiry with that interest', async ({ page }) => {
    await page.goto('/about-twb-global');
    await page.getByRole('link', { name: 'Discuss Your Visit' }).click();
    await expect(enquiryForm(page).getByRole('combobox', { name: 'Area of interest' })).toHaveText('Business Travel & Concierge');
    await fillEnquiry(page, { name: 'Omar Haddad', email: 'omar@example.com' });
    await enquiryForm(page).getByRole('button', { name: 'Send My Enquiry' }).click();
    await expect(page.locator('#form-status')).toContainText('Thank you, Omar Haddad.');
    expect(storedEnquiries()).toMatchObject([{ name: 'Omar Haddad', interest: 'Business Travel & Concierge' }]);
  });
});
