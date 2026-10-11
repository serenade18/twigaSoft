import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, Download, MapPin, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { fetchTickets, ticketsPdfUrl } from '@/api';
import QrCode from '@/components/QrCode';
import usePageMeta from '@/hooks/usePageMeta';
import { ApiError } from '@/lib/http';
import type { TicketsPage } from '@/lib/schemas';

/** `/tickets/:token` — the booker's tickets (linked from the approval email), with QR codes and a PDF download. */
export default function Tickets() {
  const { token } = useParams() as { token: string };
  const [data, setData] = useState<TicketsPage | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  usePageMeta({ title: data ? `Tickets: ${data.event.title} | AFRIGULF Exchange` : 'Your tickets | AFRIGULF Exchange', description: 'Your AFRIGULF Exchange event tickets.' });

  useEffect(() => {
    let cancelled = false;
    fetchTickets(token)
      .then(result => { if (!cancelled) { setData(result); setStatus('ready'); } })
      .catch(err => { if (!cancelled) setStatus(err instanceof ApiError && err.status === 404 ? 'missing' : 'error'); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <section className="section min-h-[70vh] bg-[#f7fbff] pt-[140px]!">
      <div className="container max-w-4xl!">
        {status === 'loading' && <p role="status" className="text-center text-[#57657b]">Loading your tickets…</p>}
        {status === 'missing' && (
          <div className="text-center">
            <h1 className="mb-3 text-3xl">Tickets not found</h1>
            <p className="mb-6 text-[#57657b]">Check that you opened the full link from your email.</p>
            <Link to="/events" className="button button-dark">Browse events</Link>
          </div>
        )}
        {status === 'error' && <p role="alert" className="text-center text-[#b42318]">We couldn’t load your tickets. Check your connection and refresh the page.</p>}

        {data && (
          <>
            <p className="eyebrow">YOUR TICKETS · {data.reference}</p>
            <h1 className="mt-2 mb-3 text-[clamp(28px,3.5vw,44px)] leading-tight">{data.event.title}</h1>
            <ul className="m-0 mb-6 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[15px] text-[#465c82]">
              <li className="flex items-center gap-2"><CalendarDays className="size-4 text-[#b46d19]" aria-hidden="true" />{data.event.period}</li>
              <li className="flex items-center gap-2"><MapPin className="size-4 text-[#b46d19]" aria-hidden="true" />{data.event.location}</li>
            </ul>

            {data.status === 'pending' && (
              <div className="rounded-xl border border-[#f1dcb8] bg-[#fcf7ef] p-6 text-[#8a5a12]" role="status">
                <Clock className="mb-2 size-7" aria-hidden="true" />
                <h2 className="mb-1 text-xl">Waiting for approval</h2>
                <p className="m-0">Your booking is being reviewed. We’ll email your tickets as soon as it’s approved.</p>
              </div>
            )}
            {data.status === 'cancelled' && (
              <div className="rounded-xl border border-[#f3c7c3] bg-[#fdf1f0] p-6 text-[#b42318]" role="status">
                <XCircle className="mb-2 size-7" aria-hidden="true" />
                <h2 className="mb-1 text-xl">This booking was cancelled</h2>
                <p className="m-0">These tickets are no longer valid. Reply to your booking email if you think this is a mistake.</p>
              </div>
            )}
            {data.status === 'confirmed' && (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="m-0 text-[#465c82]">
                    {data.tickets.length} ticket{data.tickets.length === 1 ? '' : 's'} for <strong>{data.name}</strong>. Show a QR code at the entrance —
                    each one works once, on the day of the event.
                  </p>
                  <a className="button button-gold mt-0! inline-flex items-center gap-2" href={ticketsPdfUrl(token)} download>
                    <Download className="size-4" aria-hidden="true" /> Download PDF
                  </a>
                </div>
                <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
                  {data.tickets.map(ticket => (
                    <li key={ticket.number} aria-label={`Ticket ${ticket.number}`}
                      className="overflow-hidden rounded-xl border border-[#e0e7f0] bg-white shadow-[0_8px_24px_#092e5710]">
                      <div className="flex items-center justify-between bg-[#0d2b45] px-5 py-3 text-sm text-white">
                        <span className="font-bold tracking-wide text-[#f4ce89]">ADMIT ONE</span>
                        <span>Ticket {ticket.number} of {data.tickets.length}</span>
                      </div>
                      <div className="flex flex-col items-center gap-3 p-5 text-center">
                        <QrCode value={ticket.qr} label={`QR code for ticket ${ticket.number}`} />
                        {ticket.checkedInAt
                          ? <p className="m-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e6b3a]"><CheckCircle2 className="size-4" aria-hidden="true" />Used {new Date(ticket.checkedInAt).toLocaleString()}</p>
                          : <p className="m-0 text-sm text-[#57657b]">{data.name} · {data.reference}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
