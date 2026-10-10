import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export default function FormAlert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'}
      className={cn('mb-0 rounded-md border px-3 py-2.5 text-sm', tone === 'error'
        ? 'border-[#f3c7c3] bg-[#fdf1f0] text-[#b42318]'
        : 'border-[#cfe7d6] bg-[#f0f9f3] text-[#1e6b3a]')}>
      {children}
    </p>
  );
}
