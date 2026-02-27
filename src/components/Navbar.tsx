// src/components/Navbar.tsx
import { useState, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.ts';
import { ThemeContext } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Globe, Zap, BarChart2, FileText } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

export default function Navbar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useContext(ThemeContext);
  const { t, i18n } = useTranslation();
  const { isAdmin } = useUser();

  const changeLanguage = (lng: string) => { i18n.changeLanguage(lng); };
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const desktopLinkClasses = 'px-3 py-2 rounded-md text-sm font-medium transition-colors';
  const activeLinkClasses = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
  const inactiveLinkClasses = 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400';

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xl">{t('school_management')}</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-1 space-x-reverse">
                <NavLink to="/" end className={({ isActive }) => `${desktopLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                  {t('dashboard')}
                </NavLink>

                {/* ✨ NEW: يومي link — for teachers */}
                {!isAdmin && (
                  <NavLink to="/today" className={({ isActive }) => `${desktopLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses} flex items-center gap-1`}>
                    <Zap className="w-3.5 h-3.5" />
                    يومي السريع
                  </NavLink>
                )}

                {isAdmin && (
                  <>
                    <NavLink to="/students" className={({ isActive }) => `${desktopLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>{t('students')}</NavLink>
                    <NavLink to="/teachers" className={({ isActive }) => `${desktopLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>{t('teachers')}</NavLink>
                    <NavLink to="/classes" className={({ isActive }) => `${desktopLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>{t('classes')}</NavLink>
                    <NavLink to="/subscriptions" className={({ isActive }) => `${desktopLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>الاشتراكات</NavLink>
                    {/* ✨ NEW: Finance report link */}
                    <NavLink to="/finance" className={({ isActive }) => `${desktopLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses} flex items-center gap-1`}>
                      <BarChart2 className="w-3.5 h-3.5" />
                      التقرير المالي
                    </NavLink>
                  </>
                )}

                <NavLink to="/attendance" className={({ isActive }) => `${desktopLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>{t('attendance')}</NavLink>
                <NavLink to="/evaluations" className={({ isActive }) => `${desktopLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>التقييمات</NavLink>

                {/* ✨ NEW: Student report */}
                <NavLink to="/student-report" className={({ isActive }) => `${desktopLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses} flex items-center gap-1`}>
                  <FileText className="w-3.5 h-3.5" />
                  تقرير طالب
                </NavLink>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="relative group">
              <button className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center">
                <Globe className="h-5 w-5" />
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 hidden group-hover:block">
                <button onClick={() => changeLanguage('en')} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-right">English</button>
                <button onClick={() => changeLanguage('fr')} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-right">Français</button>
                <button onClick={() => changeLanguage('ar')} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-right">العربية</button>
              </div>
            </div>

            <button onClick={handleLogout} className="hidden sm:block px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
