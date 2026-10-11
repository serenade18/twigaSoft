import { useEffect, useState, type ReactNode } from 'react';
import { CalendarCheck, Eye, Percent, Ticket } from 'lucide-react';
import { fetchEventPerformance } from '@/adminApi';
import { ChartCard, DailyColumns } from '@/components/admin/DashboardCharts';
import FormAlert from '@/components/admin/FormAlert';
import { STAT_RANGES, type EventPerformance as Performance } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useEventContext } from '@/pages/admin/EventOverview';

const number = new Intl.NumberFormat();

function Tile({ label, icon, value, children }: { label: string; icon: ReactNode; value: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground"><span>{label}</span><span aria-hidden="true">{icon}</span></div>
      <p className="mb-1 text-3xl leading-none font-semibold">{value}</p>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

/** Performance tab: views, seats, bookings and conversion, plus views and seats booked per day. */
export default function EventPerformance() {
  const { event } = useEventContext();
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<Performance | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Reload when the range changes, or when the event's numbers change (e.g. a booking was cancelled).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchEventPerformance(event.id, days)
      .then(result => { if (!cancelled) setData(result); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load performance.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [event.id, days, event.stats.bookings, event.stats.seatsBooked]);

  if (error) return <FormAlert tone="error">{error}</FormAlert>;
  if (!data) return <p role="status" className="py-10 text-center text-muted-foreground">Loading performance…</p>;

  const { views, bookings } = data;
  const conversion = views.total ? (bookings.active / views.total) * 100 : null;
  const seatShare = event.capacity ? Math.min(100, (bookings.seats / event.capacity) * 100) : null;
  const viewsInRange = data.daily.reduce((sum, d) => sum + d.views, 0);
  const seatsInRange = data.daily.reduce((sum, d) => sum + d.seats, 0);

  return (
    <div className={cn('grid gap-4 transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Page views" icon={<Eye className="size-5" />} value={number.format(views.total)}>
          {number.format(views.lastWeek)} in the last 7 days
        </Tile>
        <Tile label="Seats reserved" icon={<Ticket className="size-5" />}
          value={event.capacity ? `${number.format(bookings.seats)} / ${number.format(event.capacity)}` : number.format(bookings.seats)}>
          {seatShare === null ? 'No seat limit' : (
            <>
              {/* Meter: fill and track are two steps of the same blue. */}
              <div className="my-2 h-1.5 overflow-hidden rounded-full bg-[#dbe7f3]" role="meter" aria-label="Seats booked"
                aria-valuemin={0} aria-valuemax={event.capacity!} aria-valuenow={bookings.seats}>
                <div className="h-full rounded-full bg-[#2f6fa8]" style={{ width: `${seatShare}%` }} />
              </div>
              {Math.round(seatShare)}% booked
            </>
          )}
        </Tile>
        <Tile label="Bookings" icon={<CalendarCheck className="size-5" />} value={number.format(bookings.active)}>
          {bookings.pending ? `${number.format(bookings.pending)} awaiting approval` : bookings.cancelled ? `${number.format(bookings.cancelled)} cancelled` : 'All approved'}
        </Tile>
        <Tile label="Conversion" icon={<Percent className="size-5" />} value={conversion === null ? '—' : `${conversion.toFixed(conversion < 10 ? 1 : 0)}%`}>
          of page views became a booking
        </Tile>
      </div>

      <div className="flex justify-end">
        <div role="radiogroup" aria-label="Period" className="inline-flex rounded-md border border-border bg-white p-0.5">
          {STAT_RANGES.map(d => (
            <button key={d} type="button" role="radio" aria-checked={d === days} onClick={() => setDays(d)}
              className={cn('rounded-[5px] border-0 px-3 py-1.5 text-sm font-medium', d === days ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground')}>
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Page views per day" description={`${number.format(viewsInRange)} in ${days} days`}>
          <DailyColumns daily={data.daily.map(d => ({ date: d.date, count: d.views }))} unit={['view', 'views']} empty="No views yet" />
        </ChartCard>
        <ChartCard title="Seats booked per day" description={`${number.format(seatsInRange)} in ${days} days`}>
          <DailyColumns daily={data.daily.map(d => ({ date: d.date, count: d.seats }))} unit={['seat', 'seats']} empty="No bookings yet" />
        </ChartCard>
      </div>
    </div>
  );
}
