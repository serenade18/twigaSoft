import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ImageUp, Trash2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteEvent, fetchAdminEvent, saveEvent } from '@/adminApi';
import EventThumb from '@/components/admin/EventThumb';
import FormAlert from '@/components/admin/FormAlert';
import EventCard from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import usePageMeta from '@/hooks/usePageMeta';
import { CATEGORY_NAMES, formatPeriod } from '@/lib/events';
import { ApiError, applyFieldErrors } from '@/lib/http';
import { EVENT_CATEGORIES, EVENT_IMAGES, eventFormSchema, type AdminEvent, type EventFormValues } from '@/lib/schemas';

const IMAGE_LABELS: Record<(typeof EVENT_IMAGES)[number], string> = {
  'afrigulf-summit-image': 'AFRIGULF summit artwork',
  'image-one': 'Event photo (left)',
  'image-two': 'Event photo (centre)',
  'image-three': 'Event photo (right)',
};
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const blank: EventFormValues = {
  title: '', category: 'summit', location: '', startDate: '', endDate: '', period: '', organiser: '', summary: '',
  description: '', label: '', image: 'image-one', slug: '', sortOrder: 0, isPublished: true, bookingsOpen: true, capacity: '',
};

function toForm(event: AdminEvent): EventFormValues {
  // A period the API generated from the dates shows as blank, so it keeps following the dates.
  const generated = !!event.startDate && event.period === formatPeriod(event.startDate, event.endDate);
  return {
    title: event.title, category: event.category, location: event.location, startDate: event.startDate ?? '', endDate: event.endDate ?? '',
    period: generated ? '' : event.period, organiser: event.organiser, summary: event.summary, description: event.description,
    label: event.label === 'View Event' ? '' : event.label, image: event.image, slug: event.slug, sortOrder: event.sortOrder, isPublished: event.isPublished,
    bookingsOpen: event.bookingsOpen, capacity: event.capacity === null ? '' : String(event.capacity),
  };
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <h2 className="mb-1 font-sans! text-base font-semibold tracking-normal!">{title}</h2>
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

/** Create or edit an event (`/admin/events/new` or `/admin/events/:id/edit`), with a live preview of the site's card. */
export default function EventEditor() {
  const { id } = useParams();
  const creating = !id;
  usePageMeta({ title: `${creating ? 'New event' : 'Edit event'} | AFRIGULF Exchange admin`, description: 'AFRIGULF Exchange admin portal.' });
  const navigate = useNavigate();

  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverError, setCoverError] = useState('');
  const [removeCover, setRemoveCover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<EventFormValues>({ resolver: zodResolver(eventFormSchema), defaultValues: blank });
  const { reset } = form;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchAdminEvent(id)
      .then(result => { if (!cancelled) { setEvent(result); reset(toForm(result)); } })
      .catch(err => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load this event.'); });
    return () => { cancelled = true; };
  }, [id, reset]);

  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile]);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  const values = useWatch({ control: form.control });
  const generatedPeriod = values.startDate ? formatPeriod(values.startDate, values.endDate || null) : '';
  const currentCover = removeCover ? null : event?.imageUrl ?? null;
  const preview = {
    title: values.title || 'Event title',
    location: values.location || 'Location',
    period: values.period || generatedPeriod || 'Dates to be confirmed',
    organiser: values.organiser || 'Organiser',
    summary: values.summary || 'A short summary of the event.',
    label: values.label || 'View Event',
    image: values.image,
    imageUrl: coverPreview ?? currentCover,
    category: values.category ?? 'summit',
  };

  function chooseCover(file: File | undefined) {
    setCoverError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setCoverError('Use a JPG, PNG or WebP image.');
    if (file.size > MAX_COVER_BYTES) return setCoverError('Use an image under 5 MB.');
    setCoverFile(file);
    setRemoveCover(false);
  }

  async function onSubmit(formValues: EventFormValues) {
    setError('');
    try {
      const saved = await saveEvent(id ?? null, formValues, { file: coverFile, remove: removeCover && !coverFile });
      navigate(`/admin/events/${saved.id}`, { replace: true, state: { notice: `“${saved.title}” was ${creating ? 'created' : 'saved'}${saved.isPublished ? ' and is live on the site' : ' as a draft'}.` } });
    } catch (err) {
      const placed = applyFieldErrors(err, form.setError, Object.keys(blank) as (keyof EventFormValues)[]);
      const coverMessage = err instanceof ApiError ? err.fields.cover?.[0] : undefined;
      if (coverMessage) setCoverError(coverMessage);
      if (!placed && !coverMessage) setError(err instanceof Error ? err.message : 'Could not save this event. Please try again.');
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteEvent(id);
      navigate('/admin/events', { state: { notice: `“${event?.title}” was deleted.` } });
    } catch (err) {
      setDeleting(false);
      setConfirmDelete(false);
      setError(err instanceof Error ? err.message : 'Could not delete this event.');
    }
  }

  if (loadError) {
    return (
      <section className="mx-auto max-w-6xl">
        <FormAlert tone="error">{loadError}</FormAlert>
        <Link to="/admin/events" className="mt-4 inline-block text-sm font-semibold text-[#986115]!">← Back to events</Link>
      </section>
    );
  }
  if (!creating && !event) return <p role="status" className="py-16 text-center text-muted-foreground">Loading event…</p>;

  const textField = (name: 'title' | 'location' | 'organiser', label: string, description?: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input {...field} /></FormControl>
        {description && <FormDescription>{description}</FormDescription>}<FormMessage /></FormItem>
    )} />
  );

  return (
    <section className="mx-auto max-w-6xl">
      <Link to={creating ? '/admin/events' : `/admin/events/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {creating ? 'All events' : 'Back to event'}
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="mb-0 text-3xl">{creating ? 'New event' : `Edit ${event!.title}`}</h1>
        {!creating && <Button variant="outline" className="bg-white text-[#b42318] hover:text-[#b42318]" onClick={() => setConfirmDelete(true)}><Trash2 /> Delete</Button>}
      </div>

      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-4">
            {error && <FormAlert tone="error">{error}</FormAlert>}

            <Section title="Details">
              {textField('title', 'Title')}
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{EVENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_NAMES[c]}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {textField('organiser', 'Organiser', 'e.g. “Organised by London College of Creative Media”.')}
              </div>
              <FormField control={form.control} name="summary" render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl><Textarea rows={3} maxLength={300} {...field} /></FormControl>
                  <FormDescription>{field.value.length}/300 characters. Shown on the event card and at the top of the event page.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full description (optional)</FormLabel>
                  <FormControl><Textarea rows={7} {...field} /></FormControl>
                  <FormDescription>Programme, speakers, who should attend… Shown on the event page. Leave a blank line between paragraphs.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </Section>

            <Section title="When & where">
              {textField('location', 'Location')}
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel>Start date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem><FormLabel>End date (optional)</FormLabel><FormControl><Input type="date" min={values.startDate || undefined} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="period" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dates as shown on the site</FormLabel>
                  <FormControl><Input placeholder={generatedPeriod || 'e.g. December 2026'} {...field} /></FormControl>
                  <FormDescription>
                    {generatedPeriod ? `Leave blank to show “${generatedPeriod}”.` : 'Set a start date, or describe when it happens if dates aren’t confirmed.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </Section>

            <Section title="Appearance">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Cover image</span>
                <div className="flex flex-wrap items-center gap-3">
                  <EventThumb imageUrl={coverPreview ?? currentCover} image={values.image ?? 'image-one'} className="h-20 w-32" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        <ImageUp /> {coverPreview || currentCover ? 'Replace image' : 'Upload image'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Cover image"
                          onChange={e => { chooseCover(e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                    </Button>
                    {(coverPreview || currentCover) && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setCoverFile(null); if (event?.imageUrl) setRemoveCover(true); }}>
                        Remove image
                      </Button>
                    )}
                  </div>
                </div>
                <p className={coverError ? 'mb-0 text-sm text-destructive' : 'mb-0 text-sm text-muted-foreground'} role={coverError ? 'alert' : undefined}>
                  {coverError || 'JPG, PNG or WebP, up to 5 MB. A landscape photo works best.'}
                </p>
              </div>
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="image" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Built-in image</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{EVENT_IMAGES.map(img => <SelectItem key={img} value={img}>{IMAGE_LABELS[img]}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormDescription>Used when there’s no cover image.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="label" render={({ field }) => (
                  <FormItem><FormLabel>Button text</FormLabel><FormControl><Input placeholder="View Event" maxLength={40} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </Section>

            <Section title="Bookings" description="Visitors book seats on the event page. No payment is taken.">
              <FormField control={form.control} name="bookingsOpen" render={({ field }) => (
                <FormItem>
                  <label className="flex items-start gap-3 text-sm">
                    <FormControl>
                      <input type="checkbox" className="mt-0.5 size-4 accent-[#0d2b45]" checked={field.value}
                        onChange={e => field.onChange(e.target.checked)} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <span><span className="font-medium">Bookings open</span><br />
                      <span className="text-muted-foreground">Bookings close automatically once the event is past or full.</span></span>
                  </label>
                </FormItem>
              )} />
              <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem className="sm:max-w-xs">
                  <FormLabel>Capacity (seats)</FormLabel>
                  <FormControl><Input inputMode="numeric" placeholder="No limit" {...field} /></FormControl>
                  <FormDescription>
                    {event && event.stats.seatsBooked > 0 ? `${event.stats.seatsBooked} seats booked so far.` : 'Leave blank for no limit.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </Section>

            <Section title="Publishing">
              <FormField control={form.control} name="isPublished" render={({ field }) => (
                <FormItem>
                  <label className="flex items-start gap-3 text-sm">
                    <FormControl>
                      <input type="checkbox" className="mt-0.5 size-4 accent-[#0d2b45]" checked={field.value}
                        onChange={e => field.onChange(e.target.checked)} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <span><span className="font-medium">Published</span><br />
                      <span className="text-muted-foreground">Published events appear on the site. Unpublished ones are saved as drafts.</span></span>
                  </label>
                </FormItem>
              )} />
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="sortOrder" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Featured order</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={Number.isNaN(field.value) ? '' : field.value} /></FormControl>
                    <FormDescription>Lower numbers come first on the home page.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Web address</FormLabel>
                    <FormControl><Input placeholder="generated from the title" {...field} /></FormControl>
                    <FormDescription>Lowercase letters, numbers and hyphens.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </Section>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : creating ? 'Create event' : 'Save changes'}
              </Button>
              <Button type="button" variant="outline" size="lg" className="bg-white" asChild><Link to={creating ? '/admin/events' : `/admin/events/${id}`}>Cancel</Link></Button>
            </div>
          </div>

          <aside className="lg:sticky lg:top-20">
            <h2 className="mb-2 font-sans! text-sm font-semibold tracking-normal! text-muted-foreground">Preview</h2>
            {/* The site's own card, so the preview matches what visitors see. */}
            <div className="events rounded-lg p-3">
              <div className="event-grid grid-cols-1!">
                <EventCard event={preview} index={0} onOpen={() => {}} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {values.isPublished ? 'Will be visible on the site once saved.' : 'Draft: hidden from the site.'}
            </p>
          </aside>
        </form>
      </Form>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans! tracking-normal!">Delete this event?</DialogTitle>
            <DialogDescription>
              “{event?.title}” will be removed from the site and can’t be recovered
              {event && event.stats.bookings > 0 ? `, along with its ${event.stats.bookings} booking${event.stats.bookings === 1 ? '' : 's'}` : ''}.
              To hide it instead, unpublish it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button className="bg-[#b42318] hover:bg-[#912018]" disabled={deleting} onClick={handleDelete}>{deleting ? 'Deleting…' : 'Delete event'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
