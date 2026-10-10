// Scrolls to the enquiry form and puts focus on its first field.
export function goToEnquiry() {
  document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' });
  document.querySelector<HTMLInputElement>('#enquiry-form [name="name"]')?.focus({ preventScroll: true });
}
