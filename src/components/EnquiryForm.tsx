import { useState } from 'react';
import { submitEnquiry } from '../api';

export default function EnquiryForm({ eyebrow, submitLabel, options, interest, onInterestChange }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    setBusy(true);
    setStatus('Submitting your enquiry…');
    try {
      const result = await submitEnquiry(payload);
      setStatus(`Thank you, ${payload.name}. Your enquiry has been received. Reference: ${result.reference}.`);
      form.reset();
      onInterestChange('');
    } catch (error) {
      setStatus(error.message || 'Unable to submit. Your details are still here; please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="enquiry section" id="enquiry">
      <div className="container enquiry-layout">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>Tell us about your plans</h2>
          <p>Share your goal and our team can review your request. You’ll receive a reference number after submission.</p>
          <p className="privacy-note">Your details are used to respond to this enquiry. Please do not include sensitive financial or identity documents.</p>
        </div>
        <form id="enquiry-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Full name<input name="name" autoComplete="name" required maxLength={120} /></label>
            <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={200} /></label>
          </div>
          <div className="form-row">
            <label>Phone (optional)<input name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
            <label>Country<input name="country" autoComplete="country-name" required maxLength={80} /></label>
          </div>
          <label>Area of interest
            <select name="interest" required value={interest} onChange={e => onInterestChange(e.target.value)}>
              <option value="">Choose one</option>
              {options.map(option => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>Your plans
            <textarea name="message" required minLength={20} maxLength={2000} rows={5} placeholder="Tell us what you hope to achieve and your preferred timeline." />
          </label>
          <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <button className="button button-gold" type="submit" disabled={busy}>{submitLabel}</button>
          <p id="form-status" role="status" aria-live="polite">{status}</p>
        </form>
      </div>
    </section>
  );
}
