// src/components/ProtectedRoute.tsx
// FIX: Uses UserContext instead of fetching role independently — no duplicate DB calls
import { Navigate, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useUser } from '../contexts/UserContext';

interface ProtectedRouteProps {
  requiredRole?: 'admin' | 'teacher';
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { session, role, loadingRole } = useUser();

  if (!session) {
    return <Navigate to="/login" />;
  }

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p>جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && role !== requiredRole && role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div>
      <Navbar />
      <main className="p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
