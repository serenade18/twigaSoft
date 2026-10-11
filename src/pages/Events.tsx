import { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import DetailDialog from '@/components/DetailDialog';
import EnquiryForm from '@/components/EnquiryForm';
import EventCard from '@/components/EventCard';
import { baseInterestOptions } from '@/data/content';
import usePageMeta from '@/hooks/usePageMeta';
import { CATEGORY_LABELS, eventDetail, isPast, sortEvents, todayIso, useEvents } from '@/lib/events';
import { EVENT_CATEGORIES, type SiteEvent } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { goToEnquiry } from '@/scroll';
import { useSiteStore } from '@/store/useSiteStore';

const WHEN = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All dates' },
] as const;
type When = (typeof WHEN)[number]['value'];

const chip = 'inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition-colors';
const chipOn = 'border-[#032b57] bg-[#032b57] text-white';
const chipOff = 'border-[#d8e5f8] bg-white text-[#183778] hover:border-[#bd8232]';

const matches = (event: SiteEvent, query: string) =>
  [event.title, event.summary, event.organiser, event.location, event.period].some(text => text.toLowerCase().includes(query));

/** Every published summit and event, with search and filters kept in the URL so views can be shared. */
export default function Events() {
  usePageMeta({
    title: 'Summits & Events | AFRIGULF Exchange',
    description: 'Browse AFRIGULF Exchange summits, conferences, exhibitions and business events connecting Africa and the Gulf.',
  });
  const events = useEvents();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const category = EVENT_CATEGORIES.find(c => c === params.get('category'));
  const location = params.get('location') ?? '';
  const when: When = WHEN.find(w => w.value === params.get('when'))?.value ?? 'upcoming';

  const openDetail = useSiteStore(s => s.openDetail);
  const closeDetail = useSiteStore(s => s.closeDetail);
  const setInterest = useSiteStore(s => s.setInterest);

  function update(changes: Record<string, string | undefined>) {
    setParams(current => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value); else next.delete(key);
      }
      return next;
    }, { replace: true });
  }

  // Only offer filters that would return something.
  const categories = useMemo(() => EVENT_CATEGORIES.filter(c => events?.some(e => e.category === c)), [events]);
  const locations = useMemo(() => [...new Set(events?.map(e => e.location))].sort(), [events]);
  const interestOptions = useMemo(
    () => [...new Set([...baseInterestOptions, ...(events ?? []).map(e => e.title), 'Other'])],
    [events],
  );

  const today = todayIso();
  const results = useMemo(() => {
    if (!events) return [];
    const q = query.trim().toLowerCase();
    const filtered = events.filter(event =>
      (!category || event.category === category)
      && (!location || event.location === location)
      && (when === 'all' || isPast(event, today) === (when === 'past'))
      && (!q || matches(event, q)));
    return sortEvents(filtered, today);
  }, [events, query, category, location, when, today]);

  const filtersActive = !!(query || category || location || when !== 'upcoming');

  function enquireAbout(title: string) {
    closeDetail();
    if (interestOptions.includes(title)) setInterest(title);
    goToEnquiry();
  }

  return (
    <>
      <section className="relative isolate bg-[#071e50] pt-[150px] pb-16 text-white">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#04173ff5_0%,#071e50d9_45%,#071e5055_100%),url('/assets/hero.webp')] bg-cover bg-center" aria-hidden="true" />
        <div className="container">
          <p className="eyebrow text-[#ffd076]!">SUMMITS &amp; EVENTS</p>
          <h1 className="mt-3 mb-4 max-w-3xl text-[clamp(34px,4.2vw,58px)] leading-[1.1] font-extrabold">Gatherings that connect Africa and the Gulf.</h1>
          <p className="mb-0 max-w-xl text-lg leading-relaxed text-[#dbe6f3]">
            Browse summits, conferences, exhibitions and trade missions, then register your interest in the ones that fit your plans.
          </p>
        </div>
      </section>

      <section className="section events" aria-labelledby="event-results-heading">
        <div className="container">
          <h2 id="event-results-heading" className="sr-only">Find an event</h2>

          <div className="mb-6 grid gap-4 rounded-xl border border-[#e0e7f0] bg-white p-5 shadow-[0_8px_24px_#092e5710]">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <label className="relative block">
                <span className="sr-only">Search events</span>
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#57657b]" aria-hidden="true" />
                <input type="search" value={query} onChange={e => update({ q: e.target.value || undefined })} placeholder="Search by name, organiser or city"
                  className="h-11 w-full rounded-md border border-[#bacce0] bg-white pr-3 pl-10 text-[15px] text-[#1a315c] outline-none focus-visible:border-[#bd8232] focus-visible:ring-2 focus-visible:ring-[#ecc57555]" />
              </label>
              <label className="block">
                <span className="sr-only">Location</span>
                <select value={location} onChange={e => update({ location: e.target.value || undefined })}
                  className="h-11 w-full rounded-md border border-[#bacce0] bg-white px-3 text-[15px] text-[#1a315c] outline-none focus-visible:border-[#bd8232] focus-visible:ring-2 focus-visible:ring-[#ecc57555]">
                  <option value="">All locations</option>
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Event type">
                <button type="button" aria-pressed={!category} className={cn(chip, !category ? chipOn : chipOff)} onClick={() => update({ category: undefined })}>All types</button>
                {categories.map(c => (
                  <button key={c} type="button" aria-pressed={category === c} className={cn(chip, category === c ? chipOn : chipOff)}
                    onClick={() => update({ category: category === c ? undefined : c })}>
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
              <div className="inline-flex rounded-full border border-[#d8e5f8] bg-[#f5f9fe] p-1" role="radiogroup" aria-label="When">
                {WHEN.map(w => (
                  <button key={w.value} type="button" role="radio" aria-checked={when === w.value}
                    className={cn('h-8 rounded-full border-0 px-4 text-sm font-semibold', when === w.value ? 'bg-white text-[#032b57] shadow-sm' : 'bg-transparent text-[#57657b] hover:text-[#032b57]')}
                    onClick={() => update({ when: w.value === 'upcoming' ? undefined : w.value })}>
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[#57657b]">
            <p className="m-0" role="status">
              {events ? `${results.length} ${results.length === 1 ? 'event' : 'events'}` : 'Loading events…'}
            </p>
            {filtersActive && (
              <button type="button" className="inline-flex items-center gap-1 border-0 bg-transparent p-0 font-semibold text-[#b46d19] hover:underline"
                onClick={() => setParams({}, { replace: true })}>
                <X className="size-4" aria-hidden="true" /> Clear filters
              </button>
            )}
          </div>

          {events && results.length > 0 && (
            <div className="event-grid" id="event-grid">
              {results.map((event, i) => (
                <EventCard key={event.slug || event.title} event={event} index={i} onOpen={e => openDetail(eventDetail(e))} />
              ))}
            </div>
          )}

          {events && results.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#c9d6e6] bg-white px-6 py-12 text-center">
              <h3 className="mb-2 text-xl">No events match these filters</h3>
              <p className="mx-auto mb-4 max-w-md text-[#57657b]">
                {when === 'upcoming' ? 'Try another type or location, or look through past events.' : 'Try a different search, type or location.'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {when === 'upcoming' && <button type="button" className="button button-dark mt-0!" onClick={() => update({ when: 'past' })}>See past events</button>}
                <button type="button" className="button button-outline mt-0! border-[#032b57]! text-[#032b57]!" onClick={() => setParams({}, { replace: true })}>Clear filters</button>
              </div>
            </div>
          )}

          <p className="event-note">Event details and registration are subject to confirmation.</p>
        </div>
      </section>

      <EnquiryForm eyebrow="REGISTER YOUR INTEREST" submitLabel="Submit enquiry" options={interestOptions} />
      <DetailDialog onEnquire={enquireAbout} />
    </>
  );
}
