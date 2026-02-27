// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Attendance from './pages/Attendance';
import Subscriptions from './pages/Subscriptions';
import Evaluations from './pages/Evaluations';
import Subjects from './pages/Subjects';
import Today from './pages/Today';
import FinanceReport from './pages/FinanceReport';
import StudentReport from './pages/StudentReport';
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserProvider, useUser } from './contexts/UserContext';

function AppRoutes() {
  const { session, loadingRole } = useUser();
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
  }, [i18n, i18n.language]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 md:pb-0 transition-colors" key={i18n.language}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Teacher + Admin routes */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/subjects" element={<Subjects />} />
          {/* ✨ NEW: Teacher quick attendance page */}
          <Route path="/today" element={<Today />} />
          {/* ✨ NEW: Printable student report */}
          <Route path="/student-report" element={<StudentReport />} />
        </Route>

        {/* Admin-only routes */}
        <Route path="/" element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/students" element={<Students />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          {/* ✨ NEW: Financial report dashboard */}
          <Route path="/finance" element={<FinanceReport />} />
        </Route>
      </Routes>

      {session && !loadingRole && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  );
}
