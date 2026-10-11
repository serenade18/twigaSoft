import { useState } from 'react';
import { Check, Download, ExternalLink, Eye, Mail, RotateCcw, Ticket, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resendTickets, updateBooking } from '@/adminApi';
import { formatReceived } from '@/components/admin/EnquiryDetailSheet';
import FormAlert from '@/components/admin/FormAlert';
import QrCode from '@/components/QrCode';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/lib/http';
import { BOOKING_STATUS_LABELS, type AdminBooking, type BookingStatus } from '@/lib/schemas';
import { cn } from '@/lib/utils';

const STATUS_TONES: Record<BookingStatus, string> = {
  pending: 'border-[#f1dcb8] bg-[#fcf7ef] text-[#8a5a12]',
  confirmed: 'border-[#cfe7d6] bg-[#f0f9f3] text-[#1e6b3a]',
  cancelled: 'border-[#d5dde5] bg-[#f3f5f7] text-[#52667a]',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold', STATUS_TONES[status])}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('');

interface BookingListProps {
  bookings: AdminBooking[] | undefined;
  loading: boolean;
  /** Show which event each booking is for (the all-bookings page). */
  showEvent?: boolean;
  empty: string;
  /** Called after a booking was approved, declined, restored or annotated. */
  onChanged: () => void;
  onError: (message: string) => void;
}

/**
 * Bookings as cards. Pending bookings are approved (which emails the tickets) or declined; approved ones can be
 * cancelled and cancelled ones restored. "View" opens the details, the tickets link and internal notes.
 */
export default function BookingList({ bookings, loading, showEvent, empty, onChanged, onError }: BookingListProps) {
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(booking: AdminBooking, status: BookingStatus) {
    setBusy(booking.reference);
    try {
      const saved = await updateBooking(booking.reference, { status });
      if (selected?.reference === saved.reference) setSelected(saved);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not update the booking.');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !bookings) return <p role="status" className="py-10 text-center text-muted-foreground">Loading bookings…</p>;
  if (bookings && bookings.length === 0) return <p className="rounded-lg border border-border bg-white px-4 py-10 text-center text-muted-foreground">{empty}</p>;

  const action = 'h-8 px-2.5';
  return (
    <>
      <ul className={cn('m-0 grid list-none gap-3 p-0 transition-opacity', loading && 'opacity-60')} aria-label="Bookings" aria-busy={loading}>
        {bookings?.map(booking => {
          const isBusy = busy === booking.reference;
          return (
            <li key={booking.reference} aria-label={`Booking for ${booking.name}`}
              className={cn('flex flex-wrap items-center gap-4 rounded-xl border border-border bg-white p-4 pr-5', booking.status === 'cancelled' && 'opacity-75')}>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#eef3f9] text-sm font-bold text-[#1d4f7a]" aria-hidden="true">{initials(booking.name)}</span>
              <div className="min-w-0 flex-1">
                <button type="button" className="mb-0.5 block border-0 bg-transparent p-0 text-left text-base font-semibold hover:underline" onClick={() => setSelected(booking)}>
                  {booking.name}
                </button>
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{booking.email}</span>
                  {showEvent && <Link to={`/admin/events/${booking.eventId}`} className="hover:underline">{booking.eventTitle}</Link>}
                  <span className="inline-flex items-center gap-1"><Ticket className="size-4" aria-hidden="true" />{booking.attendees} {booking.attendees === 1 ? 'seat' : 'seats'}</span>
                  <span>{booking.country}</span>
                  <span>Booked {formatReceived(booking.createdAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <BookingStatusBadge status={booking.status} />
                  {booking.status === 'confirmed' && <span>{booking.checkedIn}/{booking.attendees} checked in</span>}
                  <span className="font-mono">{booking.reference}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {booking.status === 'pending' && (
                  <>
                    <Button size="sm" className={cn(action, 'bg-[#1e6b3a] text-white hover:bg-[#185a30]')} disabled={isBusy}
                      onClick={() => setStatus(booking, 'confirmed')} aria-label={`Approve booking for ${booking.name}`}>
                      <Check /> Approve
                    </Button>
                    <Button variant="ghost" size="sm" className={cn(action, 'text-[#b42318] hover:bg-[#fdf1f0] hover:text-[#b42318]')} disabled={isBusy}
                      onClick={() => setStatus(booking, 'cancelled')} aria-label={`Decline booking for ${booking.name}`}>
                      <X /> Decline
                    </Button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <Button variant="ghost" size="sm" className={cn(action, 'text-[#b42318] hover:bg-[#fdf1f0] hover:text-[#b42318]')} disabled={isBusy}
                    onClick={() => setStatus(booking, 'cancelled')} aria-label={`Cancel booking for ${booking.name}`}>
                    <X /> Cancel
                  </Button>
                )}
                {booking.status === 'cancelled' && (
                  <Button variant="ghost" size="sm" className={action} disabled={isBusy}
                    onClick={() => setStatus(booking, 'confirmed')} aria-label={`Restore booking for ${booking.name}`}>
                    <RotateCcw /> Restore
                  </Button>
                )}
                {booking.status === 'confirmed' && (
                  <Button variant="ghost" size="sm" className={action} onClick={() => setSelected(booking)} aria-label={`Tickets for ${booking.name}`}>
                    <Ticket /> Tickets
                  </Button>
                )}
                <Button variant="ghost" size="sm" className={action} onClick={() => setSelected(booking)} aria-label={`View booking for ${booking.name}`}>
                  <Eye /> View
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
          {selected && <BookingDetails key={selected.reference} booking={selected} onSaved={saved => { setSelected(saved); onChanged(); }} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function BookingDetails({ booking, onSaved }: { booking: AdminBooking; onSaved: (b: AdminBooking) => void }) {
  const [notes, setNotes] = useState(booking.notes);
  const [result, setResult] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  async function save() {
    setSaving(true);
    setResult(null);
    try {
      onSaved(await updateBooking(booking.reference, { notes }));
      setResult({ tone: 'success', message: 'Notes saved.' });
    } catch (err) {
      setResult({ tone: 'error', message: err instanceof Error ? err.message : 'Could not save the notes.' });
    } finally {
      setSaving(false);
    }
  }

  async function resend() {
    setSending(true);
    setResult(null);
    try {
      await resendTickets(booking.reference);
      setResult({ tone: 'success', message: `Tickets sent to ${booking.email}.` });
    } catch (err) {
      setResult({ tone: 'error', message: err instanceof Error ? err.message : 'Could not send the tickets.' });
    } finally {
      setSending(false);
    }
  }

  const rows: [string, string][] = [
    ['Email', booking.email], ['Phone', booking.phone || '—'], ['Organisation', booking.organisation || '—'],
    ['Country', booking.country], ['Seats', String(booking.attendees)], ['Status', BOOKING_STATUS_LABELS[booking.status]],
  ];
  if (booking.approvedAt) rows.push(['Approved', formatReceived(booking.approvedAt)]);
  if (booking.status === 'confirmed') rows.push(['Checked in', `${booking.checkedIn} of ${booking.attendees}`]);

  return (
    <>
      <SheetHeader className="border-b border-border">
        <p className="mb-0 font-mono text-xs text-muted-foreground">{booking.reference}</p>
        <SheetTitle className="text-xl">{booking.name}</SheetTitle>
        <SheetDescription>Booked {formatReceived(booking.createdAt)} for {booking.eventTitle}</SheetDescription>
      </SheetHeader>
      <dl className="m-0 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3 p-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt><dd className="m-0 break-all">{value}</dd></div>
        ))}
      </dl>
      {booking.message && (
        <div className="border-y border-border bg-[#f8fafc] p-4">
          <h2 className="mb-2 font-sans! text-sm font-semibold tracking-normal!">Message</h2>
          <p className="mb-0 text-sm whitespace-pre-wrap">{booking.message}</p>
        </div>
      )}
      <div className="grid gap-3 p-4">
        {result && <FormAlert tone={result.tone}>{result.message}</FormAlert>}
        {booking.status === 'confirmed' && (
          <section aria-label="Tickets" className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 font-sans! text-sm font-semibold tracking-normal!">Tickets ({booking.tickets.length})</h2>
              <div className="flex flex-wrap gap-2">
                {booking.ticketsPdf && (
                  <Button variant="outline" size="sm" asChild><a href={`${API_BASE_URL}${booking.ticketsPdf}`} download><Download /> PDF</a></Button>
                )}
                {booking.ticketsUrl && (
                  <Button variant="outline" size="sm" asChild><a href={booking.ticketsUrl} target="_blank" rel="noreferrer"><ExternalLink /> Booker’s page</a></Button>
                )}
                <Button variant="outline" size="sm" disabled={sending} onClick={resend}><Mail /> {sending ? 'Sending…' : 'Resend'}</Button>
              </div>
            </div>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
              {booking.tickets.map(ticket => (
                <li key={ticket.number} aria-label={`Ticket ${ticket.number}`} className="rounded-lg border border-border p-3 text-center">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ticket {ticket.number} of {booking.tickets.length}</p>
                  <QrCode value={ticket.qr} label={`QR code for ticket ${ticket.number}`} className="mx-auto size-32" />
                  <p className="mt-2 mb-1 font-mono text-[11px] break-all text-muted-foreground">{ticket.code}</p>
                  {ticket.checkedInAt
                    ? <p className="m-0 text-xs font-semibold text-[#1e6b3a]">Checked in {formatReceived(ticket.checkedInAt)}{ticket.checkedInBy && ` by ${ticket.checkedInBy}`}</p>
                    : <p className="m-0 text-xs text-muted-foreground">Not used yet</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {booking.status === 'pending' && <p className="m-0 text-sm text-muted-foreground">Approving this booking emails the tickets to {booking.email}.</p>}
        <label className="grid gap-2 text-sm font-medium">
          Internal notes
          <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Only staff can see these notes." />
        </label>
        <Button onClick={save} disabled={saving || notes === booking.notes}>{saving ? 'Saving…' : 'Save notes'}</Button>
      </div>
    </>
  );
}
