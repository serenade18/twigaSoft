import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@/adminApi';
import AuthLayout, { AuthLink } from '@/components/admin/AuthLayout';
import FormAlert from '@/components/admin/FormAlert';
import PasswordInput from '@/components/admin/PasswordInput';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import usePageMeta from '@/hooks/usePageMeta';
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/schemas';

export default function ResetPassword() {
  usePageMeta({ title: 'Reset password | AFRIGULF Exchange', description: 'Choose a new AFRIGULF Exchange admin password.' });
  const navigate = useNavigate();
  const token = useSearchParams()[0].get('token');
  const [error, setError] = useState('');
  const form = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });

  const footer = <AuthLink to="/admin/login">Back to sign in</AuthLink>;

  if (!token) {
    return (
      <AuthLayout title="Link not valid" description="This password reset link is missing or incomplete. Request a new one to continue." footer={footer}>
        <Button asChild size="lg" className="h-11 w-full font-semibold! text-primary-foreground!">
          <Link to="/admin/forgot-password">Request a new link</Link>
        </Button>
      </AuthLayout>
    );
  }

  async function onSubmit(values: ResetPasswordValues) {
    setError('');
    try {
      await resetPassword(token!, values.password);
      navigate('/admin/login', { replace: true, state: { notice: 'Your password has been updated. Sign in with your new password.' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset your password. The link may have expired.');
    }
  }

  return (
    <AuthLayout title="Choose a new password" description="Your new password must be different from the one you used before." footer={footer}>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
          {error && (
            <FormAlert tone="error">{error} <AuthLink to="/admin/forgot-password">Request a new link</AuthLink></FormAlert>
          )}
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl><PasswordInput autoComplete="new-password" autoFocus {...field} /></FormControl>
              <FormDescription>At least 8 characters, including a letter and a number.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl><PasswordInput autoComplete="new-password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" size="lg" className="h-11 w-full font-semibold!" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
