import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { STATUS_LABELS } from '@/components/admin/EnquiryStatusBadge';
import { ENQUIRY_STATUSES, type EnquiryStatus } from '@/lib/schemas';
import { cn } from '@/lib/utils';

// Chart colours. Magnitude uses one hue; the status palette (gold / blue / teal) passed the dataviz
// validator on white (CVD ΔE ≥ 9). Gold is under 3:1 contrast, so status marks always carry visible counts.
export const BAR_COLOR = '#2f6fa8';
export const STATUS_COLORS: Record<EnquiryStatus, string> = { new: '#c99342', in_progress: '#2f6fa8', closed: '#3f9a7a' };

const number = new Intl.NumberFormat();
const compact = new Intl.NumberFormat(undefined, { notation: 'compact' });

/** Parses a YYYY-MM-DD day as a local date (so it isn't shifted by the time zone). */
const parseDay = (day: string) => new Date(`${day}T00:00:00`);
export const formatDay = (day: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat(undefined, opts).format(parseDay(day));

/** Rounds up to a clean axis maximum (1, 2, 5 × 10ⁿ), at least 4 so small counts still get even ticks. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find(s => s * magnitude >= value)!;
  return step * magnitude;
}

export function ChartCard({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-border bg-white p-5', className)}>
      <h2 className="mb-1 font-sans! text-base font-semibold tracking-normal!">{title}</h2>
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      {children}
    </section>
  );
}

interface StatTileProps {
  label: string;
  value: number;
  note?: string;
  /** Shown as a % change against the previous period; up is good. */
  delta?: { current: number; previous: number; period: string };
}

export function StatTile({ label, value, note, delta }: StatTileProps) {
  let change: ReactNode = null;
  if (delta) {
    if (delta.previous === 0) {
      change = <span className="text-muted-foreground">None in the previous {delta.period}</span>;
    } else {
      const pct = Math.round(((delta.current - delta.previous) / delta.previous) * 100);
      const up = pct >= 0;
      const Icon = up ? ArrowUpRight : ArrowDownRight;
      change = (
        <span className={cn('inline-flex items-center gap-1 font-medium', pct === 0 ? 'text-muted-foreground' : up ? 'text-[#1e6b3a]' : 'text-[#b42318]')}>
          {pct !== 0 && <Icon className="size-4" aria-hidden="true" />}
          {pct > 0 ? '+' : ''}{pct}% <span className="font-normal text-muted-foreground">vs previous {delta.period}</span>
        </span>
      );
    }
  }
  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <p className="mb-2 text-sm text-muted-foreground">{label}</p>
      <p className="mb-1 text-3xl leading-none font-semibold">{number.format(value)}</p>
      <p className="mb-0 min-h-5 text-sm">{change ?? <span className="text-muted-foreground">{note}</span>}</p>
    </div>
  );
}

/** Daily enquiry counts as columns, with a hover/keyboard tooltip and a table view. */
export function DailyColumns({ daily }: { daily: { date: string; count: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...daily.map(d => d.count)));
  const ticks = [max, max / 2, 0];
  const point = active === null ? null : daily[active];
  const labelled = new Set([0, 1, 2, 3].map(n => Math.round((n * (daily.length - 1)) / 3)));

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setActive(i => {
      const from = i ?? (e.key === 'ArrowLeft' ? daily.length : -1);
      return Math.min(daily.length - 1, Math.max(0, from + (e.key === 'ArrowLeft' ? -1 : 1)));
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        {/* Y axis */}
        <div className="relative h-48 w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums" aria-hidden="true">
          {ticks.map(t => <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>{compact.format(t)}</span>)}
        </div>
        <div className="min-w-0 flex-1">
          <div tabIndex={0} role="group" aria-label="Enquiries per day. Use the left and right arrow keys to read each day."
            onKeyDown={onKeyDown} onBlur={() => setActive(null)} onPointerLeave={() => setActive(null)}
            className="relative h-48 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4">
            {ticks.map(t => <div key={t} className="absolute inset-x-0 h-px bg-border" style={{ top: `${(1 - t / max) * 100}%` }} aria-hidden="true" />)}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {daily.map((d, i) => (
                <div key={d.date} className="flex h-full min-w-0 flex-1 items-end justify-center" onPointerEnter={() => setActive(i)}>
                  {d.count > 0 && (
                    <div className={cn('w-full max-w-6 rounded-t-[4px] transition-opacity', active !== null && active !== i && 'opacity-60')}
                      style={{ height: `${(d.count / max) * 100}%`, background: BAR_COLOR }} />
                  )}
                </div>
              ))}
            </div>
            {point && (
              <div role="status" className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-white px-3 py-1.5 text-sm whitespace-nowrap shadow-md"
                style={{ left: `clamp(3rem, ${((active! + 0.5) / daily.length) * 100}%, calc(100% - 3rem))` }}>
                <strong className="block text-base">{number.format(point.count)} {point.count === 1 ? 'enquiry' : 'enquiries'}</strong>
                <span className="text-muted-foreground">{formatDay(point.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              </div>
            )}
          </div>
          {/* X axis: four evenly spaced dates */}
          <div className="relative mt-2 h-4 text-xs text-muted-foreground" aria-hidden="true">
            {daily.map((d, i) => labelled.has(i) && (
              <span key={d.date} className={cn('absolute whitespace-nowrap', i === 0 ? 'left-0' : i === daily.length - 1 ? 'right-0' : '-translate-x-1/2')}
                style={i === 0 || i === daily.length - 1 ? undefined : { left: `${((i + 0.5) / daily.length) * 100}%` }}>{formatDay(d.date)}</span>
            ))}
          </div>
        </div>
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Show as table</summary>
        <div className="mt-2 max-h-60 overflow-y-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-border text-muted-foreground"><th className="py-1.5 font-medium">Day</th><th className="py-1.5 text-right font-medium">Enquiries</th></tr></thead>
            <tbody className="tabular-nums">
              {daily.map(d => <tr key={d.date} className="border-b border-border last:border-0"><td className="py-1.5">{formatDay(d.date, { dateStyle: 'medium' })}</td><td className="py-1.5 text-right">{d.count}</td></tr>)}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Part-to-whole bar of enquiry statuses, with a legend that carries every count. */
export function StatusBreakdown({ counts }: { counts: Record<EnquiryStatus, number> }) {
  const total = ENQUIRY_STATUSES.reduce((sum, s) => sum + counts[s], 0);
  if (total === 0) return <p className="mb-0 py-6 text-center text-sm text-muted-foreground">No enquiries in this period.</p>;
  return (
    <div>
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-[4px]" role="img"
        aria-label={ENQUIRY_STATUSES.map(s => `${STATUS_LABELS[s]}: ${counts[s]}`).join(', ')}>
        {ENQUIRY_STATUSES.filter(s => counts[s] > 0).map(s => (
          <div key={s} title={`${STATUS_LABELS[s]}: ${counts[s]}`} style={{ flexGrow: counts[s], background: STATUS_COLORS[s] }} />
        ))}
      </div>
      <ul className="m-0 mt-4 grid list-none gap-2 p-0 text-sm">
        {ENQUIRY_STATUSES.map(s => (
          <li key={s} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: STATUS_COLORS[s] }} aria-hidden="true" />
            <span className="flex-1">{STATUS_LABELS[s]}</span>
            <strong className="tabular-nums">{number.format(counts[s])}</strong>
            <span className="w-10 text-right text-muted-foreground tabular-nums">{Math.round((counts[s] / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranked horizontal bars (one hue), value at each bar's tip. */
export function RankedBars({ rows, empty }: { rows: { label: string; count: number }[]; empty: string }) {
  if (rows.length === 0) return <p className="mb-0 py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map(r => r.count));
  return (
    <ul className="m-0 grid list-none gap-3 p-0 text-sm">
      {rows.map(row => (
        <li key={row.label} className="group">
          <div className="mb-1 truncate" title={row.label}>{row.label}</div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 rounded-r-[4px] transition-opacity group-hover:opacity-80" style={{ width: `${(row.count / max) * 85}%`, background: BAR_COLOR }} />
            <span className="font-semibold tabular-nums">{number.format(row.count)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
