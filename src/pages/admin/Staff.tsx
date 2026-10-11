import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { fetchStaff } from '@/adminApi';
import { formatReceived } from '@/components/admin/EnquiryDetailSheet';
import FormAlert from '@/components/admin/FormAlert';
import StaffFormDialog, { ROLE_LABELS } from '@/components/admin/StaffFormDialog';
import { Button } from '@/components/ui/button';
import usePageMeta from '@/hooks/usePageMeta';
import type { StaffMember } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

/** Admins add portal accounts for staff and manage their role and access. */
export default function Staff() {
  usePageMeta({ title: 'Staff | AFRIGULF Exchange admin', description: 'AFRIGULF Exchange admin portal.' });
  const admin = useAuthStore(s => s.admin);
  const setAdmin = useAuthStore(s => s.setAdmin);
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<StaffMember | 'new' | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (admin?.role !== 'admin') return;
    let cancelled = false;
    setError('');
    fetchStaff()
      .then(result => { if (!cancelled) setStaff(result); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load staff.'); });
    return () => { cancelled = true; };
  }, [admin?.role, reload]);

  if (admin?.role !== 'admin') {
    return (
      <section className="mx-auto max-w-5xl">
        <h1 className="text-3xl">Staff</h1>
        <p className="text-muted-foreground">Only admins can manage staff accounts.</p>
      </section>
    );
  }

  function handleSaved(member: StaffMember) {
    if (member.id === admin?.id) setAdmin({ id: member.id, email: member.email, name: member.name, role: member.role });
    setNotice(editing === 'new' ? `${member.name} can now sign in.` : `${member.name}’s account was updated.`);
    setEditing(null);
    setReload(n => n + 1);
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl">Staff</h1>
          <p className="mb-0 text-muted-foreground">People who can sign in to this admin portal.</p>
        </div>
        <Button onClick={() => { setNotice(''); setEditing('new'); }}><UserPlus /> Add staff</Button>
      </div>

      {notice && <div className="mb-4"><FormAlert tone="success">{notice}</FormAlert></div>}
      {error && (
        <div className="mb-4 grid gap-2">
          <FormAlert tone="error">{error}</FormAlert>
          <Button variant="outline" size="sm" className="w-fit bg-white" onClick={() => setReload(n => n + 1)}>Try again</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-[#f8fafc] text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Name</th>
              <th scope="col" className="px-4 py-3 font-semibold">Role</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Last sign-in</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {staff?.map(member => (
              <tr key={member.id} className={cn('border-b border-border last:border-0', !member.isActive && 'text-muted-foreground')}>
                <td className="px-4 py-3">
                  <div className="font-semibold">{member.name}{member.id === admin.id && <span className="font-normal text-muted-foreground"> (you)</span>}</div>
                  <div className="text-muted-foreground">{member.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold', member.role === 'admin'
                    ? 'border-[#f1dcb8] bg-[#fcf7ef] text-[#8a5a12]' : 'border-[#c9def0] bg-[#eef7fb] text-[#1d4f7a]')}>
                    {ROLE_LABELS[member.role]}
                  </span>
                </td>
                <td className="px-4 py-3">{member.isActive ? 'Active' : 'Deactivated'}</td>
                <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground md:table-cell">{member.lastLogin ? formatReceived(member.lastLogin) : 'Never'}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => { setNotice(''); setEditing(member); }} aria-label={`Edit ${member.name}`}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!staff && !error && <p role="status" className="m-0 px-4 py-10 text-center text-muted-foreground">Loading staff…</p>}
      </div>

      <StaffFormDialog target={editing} currentId={admin.id} onClose={() => setEditing(null)} onSaved={handleSaved} />
    </section>
  );
}
