import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Admin, AdminSession } from '@/lib/schemas';

interface AuthState {
  token: string | null;
  admin: Admin | null;
  signIn: (session: AdminSession) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      admin: null,
      signIn: ({ token, admin }) => set({ token, admin }),
      signOut: () => set({ token: null, admin: null }),
    }),
    { name: 'twb-admin-session' },
  ),
);
