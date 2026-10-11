import { useState } from 'react';
import { Link } from 'react-router-dom';
import { updateBooking } from '@/adminApi';
import { formatReceived } from '@/components/admin/EnquiryDetailSheet';
import FormAlert from '@/components/admin/FormAlert';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { AdminBooking, BookingStatus } from '@/lib/schemas';
import { cn } from '@/lib/utils';

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold', status === 'confirmed'
      ? 'border-[#cfe7d6] bg-[#f0f9f3] text-[#1e6b3a]' : 'border-[#d5dde5] bg-[#f3f5f7] text-[#52667a]')}>
      {status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
    </span>
  );
}

interface BookingsTableProps {
  bookings: AdminBooking[] | undefined;
  loading: boolean;
  /** Show which event each booking is for (the all-bookings page). */
  showEvent?: boolean;
  empty: string;
  /** Called after a booking was cancelled, restored or had its notes saved. */
  onChanged: () => void;
  onError: (message: string) => void;
}

/** Bookings with cancel/restore per row and a side panel for details and internal notes. */
export default function BookingsTable({ bookings, loading, showEvent, empty, onChanged, onError }: BookingsTableProps) {
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(booking: AdminBooking) {
    setBusy(booking.reference);
    try {
      const saved = await updateBooking(booking.reference, { status: booking.status === 'confirmed' ? 'cancelled' : 'confirmed' });
      if (selected?.reference === saved.reference) setSelected(saved);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not update the booking.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-white" aria-busy={loading}>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-[#f8fafc] text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Booked</th>
              <th scope="col" className="px-4 py-3 font-semibold">Name</th>
              {showEvent && <th scope="col" className="px-4 py-3 font-semibold">Event</th>}
              <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Country</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Seats</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className={cn(loading && bookings && 'opacity-60')}>
            {bookings?.map(booking => (
              <tr key={booking.reference} className={cn('border-b border-border last:border-0', booking.status === 'cancelled' && 'text-muted-foreground')}>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatReceived(booking.createdAt)}</td>
                <td className="px-4 py-3">
                  <button type="button" className="border-0 bg-transparent p-0 text-left font-semibold hover:underline" onClick={() => setSelected(booking)}>{booking.name}</button>
                  <div className="text-muted-foreground">{booking.email}{booking.organisation && ` · ${booking.organisation}`}</div>
                </td>
                {showEvent && (
                  <td className="px-4 py-3"><Link to={`/admin/events/${booking.eventId}`} className="hover:underline">{booking.eventTitle}</Link></td>
                )}
                <td className="hidden px-4 py-3 md:table-cell">{booking.country}</td>
                <td className="px-4 py-3 text-right tabular-nums">{booking.attendees}</td>
                <td className="px-4 py-3"><BookingStatusBadge status={booking.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" disabled={busy === booking.reference} onClick={() => toggle(booking)}
                    aria-label={`${booking.status === 'confirmed' ? 'Cancel' : 'Restore'} booking for ${booking.name}`}>
                    {booking.status === 'confirmed' ? 'Cancel' : 'Restore'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && !bookings && <p role="status" className="m-0 px-4 py-10 text-center text-muted-foreground">Loading bookings…</p>}
        {bookings && bookings.length === 0 && <p className="m-0 px-4 py-10 text-center text-muted-foreground">{empty}</p>}
      </div>

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

  const rows: [string, string][] = [
    ['Email', booking.email], ['Phone', booking.phone || '—'], ['Organisation', booking.organisation || '—'],
    ['Country', booking.country], ['Seats', String(booking.attendees)], ['Status', booking.status === 'confirmed' ? 'Confirmed' : 'Cancelled'],
  ];
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
        <label className="grid gap-2 text-sm font-medium">
          Internal notes
          <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Only staff can see these notes." />
        </label>
        <Button onClick={save} disabled={saving || notes === booking.notes}>{saving ? 'Saving…' : 'Save notes'}</Button>
      </div>
    </>
  );
}
