import { useState } from 'react';
import { CalendarDays, Inbox, LayoutDashboard, LogOut, Ticket, UsersRound } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '@/adminApi';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/store/useAuthStore';

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/bookings', label: 'Bookings', icon: Ticket },
  { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
  { to: '/admin/staff', label: 'Staff', icon: UsersRound, adminOnly: true },
];

/** Shell for signed-in admin pages: collapsible sidebar navigation plus a top bar. */
export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const admin = useAuthStore(s => s.admin);
  const [signingOut, setSigningOut] = useState(false);
  const nav = ADMIN_NAV.filter(item => !item.adminOnly || admin?.role === 'admin');
  // The deepest matching section, so /admin/events/12 highlights Events rather than Dashboard.
  const path = pathname.replace(/\/$/, '');
  const current = nav.filter(item => path === item.to || path.startsWith(`${item.to}/`)).at(-1);

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="p-3">
            <NavLink to="/admin" className="block w-fit rounded-md bg-white px-3 py-2 group-data-[collapsible=icon]:hidden" aria-label="Admin dashboard">
              <img src="/assets/twb-footer-logo.png" alt="TWB Global Tourism" width="140" height="84" className="h-9 w-auto" />
            </NavLink>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="tracking-[0.13em] text-sidebar-primary">ADMIN PORTAL</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.map(({ to, label, icon: Icon }) => (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton asChild isActive={current?.to === to} tooltip={label}>
                        <NavLink to={to} end><Icon /><span>{label}</span></NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <p className="mb-1 truncate px-2 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">{admin?.name || admin?.email}</p>
                <SidebarMenuButton onClick={handleSignOut} disabled={signingOut} tooltip="Sign out">
                  <LogOut /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="bg-[#f3f7fb]">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-white px-4">
            <SidebarTrigger />
            <span className="text-sm font-semibold">{current?.label ?? 'Admin'}</span>
          </header>
          <main id="main" className="px-6 py-10">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
