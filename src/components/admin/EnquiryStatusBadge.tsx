import type { EnquiryStatus } from '@/lib/schemas';
import { cn } from '@/lib/utils';

export const STATUS_LABELS: Record<EnquiryStatus, string> = { new: 'New', in_progress: 'In progress', closed: 'Closed' };

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  new: 'border-[#f1dcb8] bg-[#fcf7ef] text-[#8a5a12]',
  in_progress: 'border-[#c9def0] bg-[#eef7fb] text-[#1d4f7a]',
  closed: 'border-[#d5dde5] bg-[#f3f5f7] text-[#52667a]',
};

export default function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
