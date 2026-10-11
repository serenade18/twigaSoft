import { mediaUrl } from '@/lib/http';
import { cn } from '@/lib/utils';

/** Small preview of an event's picture: the uploaded cover, or the site's built-in image. */
export default function EventThumb({ imageUrl, image, className }: { imageUrl?: string | null; image: string; className?: string }) {
  if (imageUrl) return <img src={mediaUrl(imageUrl)} alt="" className={cn('rounded-md object-cover', className)} />;
  return <div className={cn('event-image rounded-md', image, className)} aria-hidden="true" />;
}
