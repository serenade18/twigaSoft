import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSiteStore } from '@/store/useSiteStore';

interface DetailDialogProps {
  onEnquire: (title: string) => void;
}

export default function DetailDialog({ onEnquire }: DetailDialogProps) {
  const detail = useSiteStore(s => s.detail);
  const closeDetail = useSiteStore(s => s.closeDetail);

  return (
    <Dialog open={!!detail} onOpenChange={open => { if (!open) closeDetail(); }}>
      <DialogContent showCloseButton={false}
        className="block max-w-[min(540px,calc(100%-32px))] gap-0 rounded-xl border-0 p-0 text-[var(--ink)] shadow-[0_25px_100px_#0b253fcc] sm:max-w-[540px]">
        <DialogClose className="dialog-close" aria-label="Close details">×</DialogClose>
        {detail && (
          <div className="dialog-content">
            <p className="eyebrow">AFRIGULF EXCHANGE</p>
            <DialogTitle>{detail.title}</DialogTitle>
            <DialogDescription className="text-base">{detail.description}</DialogDescription>
            <ul>{detail.points.map(point => <li key={point}>{point}</li>)}</ul>
            <button className="button button-gold" type="button" onClick={() => onEnquire(detail.title)}>Enquire about this →</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
