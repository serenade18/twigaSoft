import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { submitEnquiry } from '@/api';
import { applyFieldErrors } from '@/lib/http';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { enquirySchema, type Enquiry } from '@/lib/schemas';
import { useSiteStore } from '@/store/useSiteStore';

interface EnquiryFormProps {
  eyebrow: string;
  submitLabel: string;
  options: string[];
}

const emptyEnquiry: Enquiry = { name: '', email: '', phone: '', country: '', interest: '', message: '', website: '' };

// The site stylesheet styles these fields; the "!" overrides restore its label-above-field spacing.
const itemClass = 'mb-[14px] gap-0';
const labelClass = 'mb-0! block text-sm font-bold';

export default function EnquiryForm({ eyebrow, submitLabel, options }: EnquiryFormProps) {
  const interest = useSiteStore(s => s.interest);
  const setInterest = useSiteStore(s => s.setInterest);
  const [status, setStatus] = useState('');
  const form = useForm<Enquiry>({ resolver: zodResolver(enquirySchema), defaultValues: emptyEnquiry });

  // Other parts of the page (goal picker, dialogs, service links) preselect the interest via the store.
  useEffect(() => {
    if (interest !== form.getValues('interest')) form.setValue('interest', interest, { shouldValidate: !!interest });
  }, [interest, form]);

  async function onSubmit(values: Enquiry) {
    setStatus('Submitting your enquiry…');
    try {
      const result = await submitEnquiry(values);
      setStatus(`Thank you, ${values.name}. Your enquiry has been received. Reference: ${result.reference}.`);
      form.reset(emptyEnquiry);
      setInterest('');
    } catch (error) {
      if (applyFieldErrors(error, form.setError, ['name', 'email', 'phone', 'country', 'interest', 'message'])) {
        setStatus('Please check the highlighted fields.');
      } else {
        setStatus(error instanceof Error && error.message ? error.message : 'Unable to submit. Your details are still here; please try again.');
      }
    }
  }

  const textField = (name: 'name' | 'email' | 'phone' | 'country', label: string, props: React.ComponentProps<'input'>) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className={itemClass}>
        <FormLabel className={labelClass}>{label}</FormLabel>
        <FormControl><Input {...props} {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
    <section className="enquiry section" id="enquiry">
      <div className="container enquiry-layout">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>Tell us about your plans</h2>
          <p>Share your goal and our team can review your request. You’ll receive a reference number after submission.</p>
          <p className="privacy-note">Your details are used to respond to this enquiry. Please do not include sensitive financial or identity documents.</p>
        </div>
        <Form {...form}>
          <form id="enquiry-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <div className="form-row">
              {textField('name', 'Full name', { autoComplete: 'name', maxLength: 120 })}
              {textField('email', 'Email address', { type: 'email', autoComplete: 'email', maxLength: 200 })}
            </div>
            <div className="form-row">
              {textField('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'tel', maxLength: 40 })}
              {textField('country', 'Country', { autoComplete: 'country-name', maxLength: 80 })}
            </div>
            <FormField control={form.control} name="interest" render={({ field }) => (
              <FormItem className={itemClass}>
                <FormLabel className={labelClass}>Area of interest</FormLabel>
                <Select name={field.name} value={field.value} onValueChange={value => { field.onChange(value); setInterest(value); }}>
                  <FormControl>
                    <SelectTrigger ref={field.ref} onBlur={field.onBlur}
                      className="mt-[5px] h-auto! w-full rounded-[5px] border-[#bacce0] bg-white p-3 text-base text-[#1a315c] shadow-none">
                      <SelectValue placeholder="Choose one" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem className={itemClass}>
                <FormLabel className={labelClass}>Your plans</FormLabel>
                <FormControl>
                  <Textarea rows={5} maxLength={2000} placeholder="Tell us what you hope to achieve and your preferred timeline." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <input className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" {...form.register('website')} />
            <button className="button button-gold" type="submit" disabled={form.formState.isSubmitting}>{submitLabel}</button>
            <p id="form-status" role="status" aria-live="polite">{status}</p>
          </form>
        </Form>
      </div>
    </section>
  );
}
