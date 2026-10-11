import { CalendarCheck, CalendarClock, CalendarOff, CalendarX, PencilLine } from 'lucide-react';
import { isPast } from '@/lib/events';
import type { AdminEvent } from '@/lib/schemas';
import { cn } from '@/lib/utils';

const GREEN = 'border-[#cfe7d6] bg-[#f0f9f3] text-[#1e6b3a]';
const AMBER = 'border-[#f1dcb8] bg-[#fcf7ef] text-[#8a5a12]';
const GREY = 'border-[#d5dde5] bg-[#f3f5f7] text-[#52667a]';

/** The event's status as visitors experience it. */
export function eventStatus(event: AdminEvent) {
  if (!event.isPublished) return { label: 'Draft', tone: GREY, Icon: PencilLine };
  if (isPast(event)) return { label: 'Past', tone: GREY, Icon: CalendarX };
  if (event.stats.seatsLeft === 0) return { label: 'Fully booked', tone: AMBER, Icon: CalendarOff };
  if (!event.bookingsOpen) return { label: 'Bookings closed', tone: AMBER, Icon: CalendarClock };
  return { label: 'Bookings open', tone: GREEN, Icon: CalendarCheck };
}

export default function EventStatusBadge({ event }: { event: AdminEvent }) {
  const { label, tone, Icon } = eventStatus(event);
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', tone)}>
      <Icon className="size-3.5" aria-hidden="true" />{label}
    </span>
  );
}
