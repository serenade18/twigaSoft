import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /** Accessible name when the visible label alone is ambiguous (e.g. one switch per row). */
  ariaLabel?: string;
  description?: string;
  disabled?: boolean;
}

/** On/off switch with a visible label (and optional description) beside it. */
export default function Switch({ checked, onChange, label, ariaLabel, description, disabled }: SwitchProps) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-3', disabled && 'cursor-wait opacity-60')}>
      <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel ?? label} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full border-0 p-0 transition-colors', checked ? 'bg-[#2f6fa8]' : 'bg-[#cfd8e3]')}>
        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
      <span className="text-sm leading-tight">
        <span className={cn('block', description ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
        {description && <span className="text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}
