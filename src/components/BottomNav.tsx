// src/components/BottomNav.tsx
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardCheck, MoreHorizontal, BookOpen, UserCheck, DollarSign, MessageSquare, Zap, BarChart2, FileText } from 'lucide-react';
import { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

export default function BottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const { isAdmin } = useUser();

  const navItemClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full transition-colors ${
      isActive
        ? 'text-indigo-600 dark:text-indigo-400'
        : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300'
    }`;

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 h-16 z-50 transition-colors">
        <div className="grid h-full grid-cols-4 mx-auto font-medium">
          <NavLink to="/dashboard" className={navItemClasses}>
            <LayoutDashboard className="w-6 h-6 mb-1" />
            <span className="text-[10px]">{t('dashboard')}</span>
          </NavLink>

          {/* ✨ Teachers see "يومي", Admins see "Students" */}
          {isAdmin ? (
            <NavLink to="/students" className={navItemClasses}>
              <Users className="w-6 h-6 mb-1" />
              <span className="text-[10px]">{t('students')}</span>
            </NavLink>
          ) : (
            <NavLink to="/today" className={navItemClasses}>
              <Zap className="w-6 h-6 mb-1" />
              <span className="text-[10px]">يومي</span>
            </NavLink>
          )}

          <NavLink to="/evaluations" className={navItemClasses}>
            <MessageSquare className="w-6 h-6 mb-1" />
            <span className="text-[10px]">التقييمات</span>
          </NavLink>

          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              isMoreOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <MoreHorizontal className="w-6 h-6 mb-1" />
            <span className="text-[10px]">المزيد</span>
          </button>
        </div>
      </div>

      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMoreOpen(false)}>
          <div
            className="fixed bottom-16 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl border-t border-slate-200 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 text-center">القائمة كاملة</h3>

            <div className="grid grid-cols-3 gap-4">
              <NavLink to="/attendance" className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" onClick={() => setIsMoreOpen(false)}>
                <ClipboardCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('attendance')}</span>
              </NavLink>

              {/* ✨ NEW: Student report in more menu */}
              <NavLink to="/student-report" className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors" onClick={() => setIsMoreOpen(false)}>
                <FileText className="w-6 h-6 text-rose-600 dark:text-rose-400 mb-2" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تقرير طالب</span>
              </NavLink>

              <NavLink to="/subjects" className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" onClick={() => setIsMoreOpen(false)}>
                <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">المواد</span>
              </NavLink>

              {isAdmin && (
                <>
                  <NavLink to="/teachers" className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" onClick={() => setIsMoreOpen(false)}>
                    <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('teachers')}</span>
                  </NavLink>
                  <NavLink to="/classes" className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" onClick={() => setIsMoreOpen(false)}>
                    <BookOpen className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('classes')}</span>
                  </NavLink>
                  <NavLink to="/subscriptions" className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" onClick={() => setIsMoreOpen(false)}>
                    <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">الاشتراكات</span>
                  </NavLink>
                  {/* ✨ NEW: Finance report in more menu */}
                  <NavLink to="/finance" className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" onClick={() => setIsMoreOpen(false)}>
                    <BarChart2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">التقرير المالي</span>
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
