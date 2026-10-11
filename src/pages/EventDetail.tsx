import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { bookEvent, fetchEvent, recordEventView } from '@/api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import usePageMeta from '@/hooks/usePageMeta';
import { CATEGORY_NAMES } from '@/lib/events';
import { ApiError, applyFieldErrors, mediaUrl } from '@/lib/http';
import { bookingSchema, type BookingValues, type EventDetail as Event } from '@/lib/schemas';

const emptyBooking: BookingValues = { name: '', email: '', phone: '', organisation: '', country: '', attendees: 1, message: '', website: '' };

/** An event's own page: full details plus the booking form (no payment). Opening it counts as a view. */
export default function EventDetail() {
  const { slug } = useParams() as { slug: string };
  const [event, setEvent] = useState<Event | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [reload, setReload] = useState(0);

  usePageMeta({
    title: event ? `${event.title} | AFRIGULF Exchange` : 'Event | AFRIGULF Exchange',
    description: event?.summary ?? 'AFRIGULF Exchange summits and events.',
  });

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchEvent(slug)
      .then(result => {
        if (cancelled) return;
        setEvent(result);
        setStatus('ready');
        recordEventView(slug);
      })
      .catch(err => { if (!cancelled) setStatus(err instanceof ApiError && err.status === 404 ? 'missing' : 'error'); });
    return () => { cancelled = true; };
  }, [slug, reload]);

  if (status !== 'ready' || !event) {
    return (
      <section className="section bg-[#f7fbff] pt-[150px]!">
        <div className="container text-center">
          {status === 'loading' && <p role="status" className="text-[#57657b]">Loading event…</p>}
          {status === 'missing' && (
            <>
              <h1 className="mb-3 text-4xl">Event not found</h1>
              <p className="mb-6 text-[#57657b]">This event may have ended or been removed.</p>
              <Link to="/events" className="button button-dark">Browse all events</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <h1 className="mb-3 text-3xl">We couldn’t load this event</h1>
              <p className="mb-6 text-[#57657b]">Check your connection and try again.</p>
              <button type="button" className="button button-dark" onClick={() => setReload(n => n + 1)}>Try again</button>
            </>
          )}
        </div>
      </section>
    );
  }

  const paragraphs = event.description.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const heroImage = event.imageUrl ? `url("${mediaUrl(event.imageUrl)}")` : "url('/assets/hero.webp')";

  return (
    <>
      <section className="relative isolate bg-[#071e50] pt-[140px] pb-14 text-white">
        <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(90deg,#04173ff5 0%,#071e50d9 50%,#071e5066 100%),${heroImage}` }} aria-hidden="true" />
        <div className="container">
          <Link to="/events" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#ffd076]! hover:underline"><ArrowLeft className="size-4" /> All summits &amp; events</Link>
          <p className="eyebrow text-[#ffd076]!">{CATEGORY_NAMES[event.category].toUpperCase()}</p>
          <h1 className="mt-3 mb-4 max-w-4xl text-[clamp(32px,4vw,54px)] leading-[1.1] font-extrabold">{event.title}</h1>
          <p className="mb-6 max-w-2xl text-lg leading-relaxed text-[#dbe6f3]">{event.summary}</p>
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[15px] text-[#e7eef7]">
            <li className="flex items-center gap-2"><CalendarDays className="size-4 text-[#ffd076]" aria-hidden="true" />{event.period}</li>
            <li className="flex items-center gap-2"><MapPin className="size-4 text-[#ffd076]" aria-hidden="true" />{event.location}</li>
            <li className="flex items-center gap-2"><Users className="size-4 text-[#ffd076]" aria-hidden="true" />{event.organiser}</li>
          </ul>
        </div>
      </section>

      <section className="section bg-[#f7fbff]">
        <div className="container grid items-start gap-10 lg:grid-cols-[1fr_420px]">
          <article>
            <h2 className="mb-4 text-[28px]">About this event</h2>
            {paragraphs.length
              ? paragraphs.map((p, i) => <p key={i} className="mb-4 text-[17px] leading-[1.75] whitespace-pre-line text-[#465c82]">{p}</p>)
              : <p className="text-[17px] leading-[1.75] text-[#465c82]">{event.summary}</p>}
            <p className="mt-6 text-sm text-[#677687]">Event details are subject to confirmation. Booking is free; there’s nothing to pay now.</p>
          </article>
          <aside id="book" className="scroll-mt-28 lg:sticky lg:top-28">
            {/* Refresh seats left quietly, so the confirmation stays on screen. */}
            <BookingCard event={event} onBooked={() => { fetchEvent(slug).then(setEvent).catch(() => {}); }} />
          </aside>
        </div>
      </section>
    </>
  );
}

function BookingCard({ event, onBooked }: { event: Event; onBooked: () => void }) {
  const [confirmation, setConfirmation] = useState<{ reference: string; attendees: number; email: string } | null>(null);
  const [error, setError] = useState('');
  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema.refine(v => v.attendees <= event.maxAttendees, {
      path: ['attendees'],
      message: event.seatsLeft !== null && event.seatsLeft < 20 ? `Only ${event.seatsLeft} seat${event.seatsLeft === 1 ? '' : 's'} left.` : `You can book up to ${event.maxAttendees} seats at once.`,
    })),
    defaultValues: emptyBooking,
  });

  async function onSubmit(values: BookingValues) {
    setError('');
    try {
      const result = await bookEvent(event.slug, values);
      setConfirmation({ ...result, email: values.email });
      onBooked();
    } catch (err) {
      if (!applyFieldErrors(err, form.setError, ['name', 'email', 'phone', 'organisation', 'country', 'attendees', 'message'])) {
        setError(err instanceof Error ? err.message : 'We couldn’t complete your booking. Please try again.');
      }
    }
  }

  const card = 'rounded-xl border border-[#e0e7f0] bg-white p-6 shadow-[0_12px_30px_#0b2c5520]';

  if (confirmation) {
    return (
      <div className={card} role="status">
        <CheckCircle2 className="mb-3 size-10 text-[#1e6b3a]" aria-hidden="true" />
        <h2 className="mb-2 text-2xl">Booking request received</h2>
        <p className="mb-4 text-[#465c82]">
          {confirmation.attendees} seat{confirmation.attendees === 1 ? '' : 's'} for <strong>{event.title}</strong> are reserved for you.
          Once our team approves your booking, we’ll email your tickets to {confirmation.email}.
        </p>
        <p className="mb-1 text-sm text-[#677687]">Your booking reference</p>
        <p className="mb-4 font-mono text-xl font-bold tracking-wide text-[#0a1956]">{confirmation.reference}</p>
        <p className="mb-5 text-sm text-[#677687]">There’s nothing to pay. Each ticket has a QR code that’s scanned at the entrance on the day.</p>
        <Link to="/events" className="button button-dark mt-0!">Browse more events</Link>
      </div>
    );
  }

  if (!event.bookingsOpen) {
    return (
      <div className={card}>
        <h2 className="mb-2 text-2xl">Bookings closed</h2>
        <p className="mb-5 text-[#465c82]">{event.closedReason ?? 'Bookings are closed for this event.'}</p>
        <Link to="/events" className="button button-dark mt-0!">Browse other events</Link>
      </div>
    );
  }

  const labelClass = 'font-bold text-[#0a1956]';
  const inputClass = 'h-11 bg-white';
  return (
    <div className={card}>
      <h2 className="mb-1 text-2xl">Book your place</h2>
      <p className="mb-5 text-sm text-[#57657b]">
        Free to book. {event.seatsLeft !== null && <strong className="text-[#8a5a12]">{event.seatsLeft} seat{event.seatsLeft === 1 ? '' : 's'} left.</strong>}
      </p>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" aria-label={`Book ${event.title}`}>
          {error && <p role="alert" className="m-0 rounded-md border border-[#f3c7c3] bg-[#fdf1f0] px-3 py-2.5 text-sm text-[#b42318]">{error}</p>}
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel className={labelClass}>Full name</FormLabel><FormControl><Input autoComplete="name" className={inputClass} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel className={labelClass}>Email address</FormLabel><FormControl><Input type="email" autoComplete="email" className={inputClass} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel className={labelClass}>Phone (optional)</FormLabel><FormControl><Input type="tel" autoComplete="tel" className={inputClass} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="country" render={({ field }) => (
              <FormItem><FormLabel className={labelClass}>Country</FormLabel><FormControl><Input autoComplete="country-name" className={inputClass} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="grid items-start gap-4 sm:grid-cols-[1fr_120px]">
            <FormField control={form.control} name="organisation" render={({ field }) => (
              <FormItem><FormLabel className={labelClass}>Organisation (optional)</FormLabel><FormControl><Input autoComplete="organization" className={inputClass} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="attendees" render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Seats</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={event.maxAttendees} className={inputClass} {...field}
                    value={Number.isNaN(field.value) ? '' : field.value} onChange={e => field.onChange(e.target.valueAsNumber)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="message" render={({ field }) => (
            <FormItem><FormLabel className={labelClass}>Anything we should know? (optional)</FormLabel><FormControl><Textarea rows={3} className="bg-white" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          {/* Honeypot: hidden from people, tempting to bots. */}
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px" {...form.register('website')} />
          <button type="submit" className="button button-gold mt-1 w-full justify-center" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Booking…' : 'Confirm booking →'}
          </button>
          <p className="m-0 text-xs text-[#677687]">We’ll use your details to manage your booking and contact you about this event.</p>
        </form>
      </Form>
    </div>
  );
}
