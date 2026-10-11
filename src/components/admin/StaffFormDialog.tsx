import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createStaff, updateStaff } from '@/adminApi';
import FormAlert from '@/components/admin/FormAlert';
import PasswordInput from '@/components/admin/PasswordInput';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { applyFieldErrors } from '@/lib/http';
import { staffFormSchema, type StaffFormValues, type StaffMember } from '@/lib/schemas';

export const ROLE_LABELS = { admin: 'Admin', staff: 'Staff' } as const;

interface StaffFormDialogProps {
  /** `null` is closed, `'new'` adds an account, a member edits that account. */
  target: StaffMember | 'new' | null;
  /** The signed-in admin, who can't remove their own admin role or deactivate themselves. */
  currentId?: string;
  onClose: () => void;
  onSaved: (member: StaffMember) => void;
}

export default function StaffFormDialog({ target, currentId, onClose, onSaved }: StaffFormDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {/* Keyed so each opening starts from a fresh form. */}
        {target && <StaffForm key={target === 'new' ? 'new' : target.id} target={target} isSelf={target !== 'new' && target.id === currentId} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function StaffForm({ target, isSelf, onSaved }: { target: StaffMember | 'new'; isSelf: boolean; onSaved: (member: StaffMember) => void }) {
  const creating = target === 'new';
  const [error, setError] = useState('');
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(creating
      ? staffFormSchema.refine(v => v.password !== '', { path: ['password'], message: 'Set a password for the new account.' })
      : staffFormSchema),
    defaultValues: creating
      ? { firstName: '', lastName: '', email: '', role: 'staff', isActive: true, password: '' }
      : { firstName: target.firstName, lastName: target.lastName, email: target.email, role: target.role, isActive: target.isActive, password: '' },
  });

  async function onSubmit(values: StaffFormValues) {
    setError('');
    // A blank password on edit means "keep the current one", so don't send it.
    const { password, ...rest } = values;
    const payload = password ? values : rest;
    try {
      onSaved(creating ? await createStaff(values) : await updateStaff(target.id, payload));
    } catch (err) {
      if (!applyFieldErrors(err, form.setError, ['firstName', 'lastName', 'email', 'role', 'isActive', 'password'])) {
        setError(err instanceof Error ? err.message : 'Could not save this account. Please try again.');
      }
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-sans! text-xl tracking-normal!">{creating ? 'Add staff' : `Edit ${target.name}`}</DialogTitle>
        <DialogDescription>
          {creating ? 'They’ll sign in at /admin/login with this email and password. Share the password with them securely.' : 'Changing the password or deactivating the account signs them out.'}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          {error && <FormAlert tone="error">{error}</FormAlert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem><FormLabel>First name</FormLabel><FormControl><Input autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem><FormLabel>Last name</FormLabel><FormControl><Input autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Email address</FormLabel><FormControl><Input type="email" autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="role" render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={isSelf}>
                <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
                  <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>{isSelf ? 'You can’t change your own role.' : 'Admins can also add and manage staff.'}</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>{creating ? 'Password' : 'New password'}</FormLabel>
              <FormControl><PasswordInput autoComplete="new-password" {...field} /></FormControl>
              <FormDescription>{creating ? 'At least 8 characters; avoid common or all-number passwords.' : 'Leave blank to keep their current password.'}</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          {!creating && (
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem>
                <label className="flex items-start gap-3 text-sm">
                  <FormControl>
                    <input type="checkbox" className="mt-0.5 size-4 accent-[#0d2b45]" checked={field.value} disabled={isSelf}
                      onChange={e => field.onChange(e.target.checked)} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                  </FormControl>
                  <span><span className="font-medium">Account active</span><br />
                    <span className="text-muted-foreground">{isSelf ? 'You can’t deactivate your own account.' : 'Deactivated accounts can’t sign in.'}</span>
                  </span>
                </label>
                <FormMessage />
              </FormItem>
            )} />
          )}
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting || (!creating && !form.formState.isDirty)}>
              {form.formState.isSubmitting ? 'Saving…' : creating ? 'Add staff' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
