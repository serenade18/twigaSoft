import { useState, type FormEvent } from 'react';
import { subscribeToUpdates } from '@/api';
import { signupSchema } from '@/lib/schemas';

export default function FooterSignup() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = signupSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setStatus(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setStatus('Saving your request…');
    try {
      await subscribeToUpdates(parsed.data.email);
      setStatus('Thank you. Your signup request has been saved.');
      form.reset();
    } catch (error) {
      setStatus(error instanceof Error && error.message ? error.message : 'Could not save your request. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="footer-signup" noValidate onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="footer-email">Your email address</label>
      <div className="footer-email-row">
        <input id="footer-email" name="email" type="email" maxLength={200} autoComplete="email" placeholder="Your email address" />
        <button type="submit" aria-label="Sign up for updates" disabled={busy}>→</button>
      </div>
      <p id="footer-signup-status" role="status" aria-live="polite">{status}</p>
    </form>
  );
}
