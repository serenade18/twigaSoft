import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login } from '@/adminApi';
import AuthLayout, { AuthLink } from '@/components/admin/AuthLayout';
import FormAlert from '@/components/admin/FormAlert';
import PasswordInput from '@/components/admin/PasswordInput';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import usePageMeta from '@/hooks/usePageMeta';
import { loginSchema, type LoginValues } from '@/lib/schemas';
import { useAuthStore } from '@/store/useAuthStore';

interface LoginState {
  from?: string;
  notice?: string;
}

export default function Login() {
  usePageMeta({ title: 'Admin sign in | AFRIGULF Exchange', description: 'Sign in to the AFRIGULF Exchange admin portal.' });
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as LoginState;
  const token = useAuthStore(s => s.token);
  const signIn = useAuthStore(s => s.signIn);
  const [error, setError] = useState('');
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  if (token) return <Navigate to={state.from ?? '/admin'} replace />;

  async function onSubmit(values: LoginValues) {
    setError('');
    try {
      signIn(await login(values));
      navigate(state.from ?? '/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
      form.resetField('password');
    }
  }

  return (
    <AuthLayout title="Welcome back" description="Sign in to manage enquiries, events and updates.">
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
          {state.notice && !error && <FormAlert tone="success">{state.notice}</FormAlert>}
          {error && <FormAlert tone="error">{error}</FormAlert>}
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl><Input type="email" autoComplete="username" autoFocus className="h-11" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <AuthLink to="/admin/forgot-password">Forgot password?</AuthLink>
              </div>
              <FormControl><PasswordInput autoComplete="current-password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" size="lg" className="h-11 w-full font-semibold!" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
