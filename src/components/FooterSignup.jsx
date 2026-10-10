import { useState } from 'react';
import { subscribeToUpdates } from '../api';

export default function FooterSignup() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setStatus('Saving your request…');
    try {
      await subscribeToUpdates(form.email.value);
      setStatus('Thank you. Your signup request has been saved.');
      form.reset();
    } catch (error) {
      setStatus(error.message || 'Could not save your request. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="footer-signup" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="footer-email">Your email address</label>
      <div className="footer-email-row">
        <input id="footer-email" name="email" type="email" required maxLength={200} autoComplete="email" placeholder="Your email address" />
        <button type="submit" aria-label="Sign up for updates" disabled={busy}>→</button>
      </div>
      <p id="footer-signup-status" role="status" aria-live="polite">{status}</p>
    </form>
  );
}
