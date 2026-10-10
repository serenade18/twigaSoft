import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const token = useAuthStore(s => s.token);
  const location = useLocation();
  if (!token) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}
