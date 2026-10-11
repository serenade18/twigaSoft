import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { updateEnquiry } from '@/adminApi';
import EnquiryStatusBadge, { STATUS_LABELS } from '@/components/admin/EnquiryStatusBadge';
import FormAlert from '@/components/admin/FormAlert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { applyFieldErrors } from '@/lib/http';
import { ENQUIRY_STATUSES, enquiryUpdateSchema, type AdminEnquiry, type EnquiryUpdateValues } from '@/lib/schemas';

interface EnquiryDetailSheetProps {
  enquiry: AdminEnquiry | null;
  onClose: () => void;
  onSaved: (enquiry: AdminEnquiry) => void;
}

export const formatReceived = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

/** Side panel with an enquiry's full details, where admins set its status and internal notes. */
export default function EnquiryDetailSheet({ enquiry, onClose, onSaved }: EnquiryDetailSheetProps) {
  return (
    <Sheet open={!!enquiry} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {/* Keyed so each enquiry gets a fresh form. */}
        {enquiry && <EnquiryDetails key={enquiry.reference} enquiry={enquiry} onSaved={onSaved} />}
      </SheetContent>
    </Sheet>
  );
}

function EnquiryDetails({ enquiry, onSaved }: { enquiry: AdminEnquiry; onSaved: (enquiry: AdminEnquiry) => void }) {
  const [result, setResult] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const form = useForm<EnquiryUpdateValues>({
    resolver: zodResolver(enquiryUpdateSchema),
    defaultValues: { status: enquiry.status, notes: enquiry.notes },
  });

  async function onSubmit(values: EnquiryUpdateValues) {
    setResult(null);
    try {
      const saved = await updateEnquiry(enquiry.reference, values);
      form.reset({ status: saved.status, notes: saved.notes });
      setResult({ tone: 'success', message: 'Changes saved.' });
      onSaved(saved);
    } catch (err) {
      if (!applyFieldErrors(err, form.setError, ['status', 'notes'])) {
        setResult({ tone: 'error', message: err instanceof Error ? err.message : 'Could not save changes. Please try again.' });
      }
    }
  }

  return (
    <>
      <SheetHeader className="border-b border-border">
        <p className="mb-0 font-mono text-xs text-muted-foreground">{enquiry.reference}</p>
        <SheetTitle className="text-xl">{enquiry.name}</SheetTitle>
        <SheetDescription>Received {formatReceived(enquiry.createdAt)} · <EnquiryStatusBadge status={enquiry.status} /></SheetDescription>
      </SheetHeader>

      <dl className="m-0 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3 p-4 text-sm">
        <dt className="text-muted-foreground">Email</dt>
        <dd className="m-0 break-all"><a className="text-[#986115]! underline-offset-4 hover:underline" href={`mailto:${enquiry.email}`}>{enquiry.email}</a></dd>
        <dt className="text-muted-foreground">Phone</dt>
        <dd className="m-0">{enquiry.phone ? <a className="text-[#986115]! underline-offset-4 hover:underline" href={`tel:${enquiry.phone}`}>{enquiry.phone}</a> : '—'}</dd>
        <dt className="text-muted-foreground">Country</dt>
        <dd className="m-0">{enquiry.country}</dd>
        <dt className="text-muted-foreground">Interest</dt>
        <dd className="m-0">{enquiry.interest}</dd>
      </dl>

      <div className="border-y border-border bg-[#f8fafc] p-4">
        <h2 className="mb-2 font-sans! text-sm font-semibold tracking-normal!">Message</h2>
        <p className="mb-0 text-sm whitespace-pre-wrap">{enquiry.message}</p>
      </div>

      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 p-4">
          {result && <FormAlert tone={result.tone}>{result.message}</FormAlert>}
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {ENQUIRY_STATUSES.map(status => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Internal notes</FormLabel>
              <FormControl><Textarea rows={5} placeholder="Only admins can see these notes." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Form>
    </>
  );
}
