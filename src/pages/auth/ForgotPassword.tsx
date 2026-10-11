import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { requestPasswordReset } from '@/adminApi';
import { applyFieldErrors } from '@/lib/http';
import AuthLayout, { AuthLink } from '@/components/admin/AuthLayout';
import FormAlert from '@/components/admin/FormAlert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import usePageMeta from '@/hooks/usePageMeta';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/schemas';

export default function ForgotPassword() {
  usePageMeta({ title: 'Forgot password | AFRIGULF Exchange', description: 'Reset your AFRIGULF Exchange admin password.' });
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const form = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  async function onSubmit(values: ForgotPasswordValues) {
    setError('');
    try {
      await requestPasswordReset(values);
      setSentTo(values.email);
    } catch (err) {
      if (applyFieldErrors(err, form.setError, ['email'])) return;
      setError(err instanceof Error ? err.message : 'Unable to send the reset link. Please try again.');
    }
  }

  const footer = <span>Remembered it? <AuthLink to="/admin/login">Back to sign in</AuthLink></span>;

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" description={<>If an admin account exists for <strong className="text-foreground">{sentTo}</strong>, we’ve sent a link to reset your password. The link expires shortly, so use it soon.</>} footer={footer}>
        <Button type="button" variant="outline" size="lg" className="h-11 w-full font-semibold!" onClick={() => setSentTo('')}>
          Use a different email
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" description="Enter the email you use to sign in and we’ll send you a link to reset your password." footer={footer}>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
          {error && <FormAlert tone="error">{error}</FormAlert>}
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl><Input type="email" autoComplete="email" autoFocus className="h-11" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" size="lg" className="h-11 w-full font-semibold!" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
