import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchStats } from '@/adminApi';
import { ChartCard, DailyColumns, RankedBars, StatTile, StatusBreakdown } from '@/components/admin/DashboardCharts';
import { formatReceived } from '@/components/admin/EnquiryDetailSheet';
import EnquiryStatusBadge from '@/components/admin/EnquiryStatusBadge';
import FormAlert from '@/components/admin/FormAlert';
import { Button } from '@/components/ui/button';
import usePageMeta from '@/hooks/usePageMeta';
import { STAT_RANGES, type Stats } from '@/lib/schemas';
import { cn } from '@/lib/utils';

/** Admin landing page: enquiry analytics for a chosen period plus all-time totals. */
export default function Dashboard() {
  usePageMeta({ title: 'Admin | AFRIGULF Exchange', description: 'AFRIGULF Exchange admin portal.' });
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const days = STAT_RANGES.find(d => String(d) === params.get('days')) ?? 30;

  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchStats(days)
      .then(result => { if (!cancelled) setStats(result); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the dashboard.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days, reload]);

  const period = `${days} days`;

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl">Admin dashboard</h1>
          <p className="mb-0 text-muted-foreground">Here’s how enquiries are coming in.</p>
        </div>
        {/* The period scopes every chart below; the all-time totals say so in their labels. */}
        <div role="radiogroup" aria-label="Period" className="inline-flex rounded-md border border-border bg-white p-0.5">
          {STAT_RANGES.map(d => (
            <button key={d} type="button" role="radio" aria-checked={d === days}
              onClick={() => setParams(d === 30 ? {} : { days: String(d) }, { replace: true })}
              className={cn('rounded-[5px] border-0 px-3 py-1.5 text-sm font-medium', d === days ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground')}>
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 grid gap-2">
          <FormAlert tone="error">{error}</FormAlert>
          <Button variant="outline" size="sm" className="w-fit bg-white" onClick={() => setReload(n => n + 1)}>Try again</Button>
        </div>
      )}
      {!stats && loading && <p role="status" className="py-16 text-center text-muted-foreground">Loading dashboard…</p>}

      {stats && (
        // Refetching keeps the previous figures on screen, dimmed, so the layout doesn't jump.
        <div className={cn('grid gap-4 transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={`Enquiries, last ${period}`} value={stats.period.enquiries}
              delta={{ current: stats.period.enquiries, previous: stats.period.previous, period }} />
            <StatTile label="Awaiting reply" value={stats.totals.awaitingReply} note="New enquiries, all time" />
            <StatTile label="Total enquiries" value={stats.totals.enquiries} note="All time" />
            <StatTile label="Published events" value={stats.totals.publishedEvents} note={`${stats.totals.activeStaff} active staff accounts`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Enquiries per day" description={`Last ${period}`} className="lg:col-span-2">
              <DailyColumns daily={stats.daily} />
            </ChartCard>
            <ChartCard title="Status" description={`Enquiries received in the last ${period}`}>
              <StatusBreakdown counts={stats.byStatus} />
            </ChartCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard title="Top interests" description={`Last ${period}`}>
              <RankedBars rows={stats.topInterests} empty="No enquiries in this period." />
            </ChartCard>
            <ChartCard title="Top countries" description={`Last ${period}`}>
              <RankedBars rows={stats.topCountries} empty="No enquiries in this period." />
            </ChartCard>
          </div>

          <ChartCard title="Latest enquiries">
            {stats.recent.length === 0 ? <p className="mb-0 text-sm text-muted-foreground">No enquiries yet.</p> : (
              <ul className="m-0 list-none divide-y divide-border p-0">
                {stats.recent.map(enquiry => (
                  <li key={enquiry.reference}>
                    <button type="button" onClick={() => navigate(`/admin/enquiries?search=${encodeURIComponent(enquiry.reference)}`)}
                      className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 border-0 bg-transparent px-1 py-3 text-left text-sm hover:bg-[#f8fafc]">
                      <span className="min-w-40 flex-1"><strong>{enquiry.name}</strong> <span className="text-muted-foreground">· {enquiry.interest}</span></span>
                      <span className="text-muted-foreground">{formatReceived(enquiry.createdAt)}</span>
                      <EnquiryStatusBadge status={enquiry.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/admin/enquiries" className="mt-3 inline-block text-sm font-semibold text-[#986115]! underline-offset-4 hover:underline">View all enquiries →</Link>
          </ChartCard>
        </div>
      )}
    </section>
  );
}
