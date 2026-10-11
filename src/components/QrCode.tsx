import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

/** A QR code drawn in the browser (same content as the ticket PDF's). */
export default function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark: '#0a1956', light: '#ffffff' } })
      .then(setSrc)
      .catch(() => setSrc(''));
  }, [value]);
  return src
    ? <img src={src} alt={label} width={180} height={180} className={cn('size-44 rounded-md', className)} />
    : <div className={cn('size-44 rounded-md bg-[#eef3f9]', className)} aria-hidden="true" />;
}
