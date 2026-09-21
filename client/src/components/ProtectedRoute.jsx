import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading…</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

export function CoachRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'coach' && user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}