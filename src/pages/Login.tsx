// src/pages/Login.tsx
import React, { useState, useContext } from 'react';
import { supabase } from '../supabaseClient.ts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, setTheme } = useContext(ThemeContext);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="absolute top-4 right-4">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
          className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-sm transition-all"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('login_title')}</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">مرحباً بك مجدداً في نظام الإدارة المدرسية</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('email_address')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              placeholder="name@school.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium">{error}</p>
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex justify-center w-full px-4 py-3 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? t('signing_in_button') : t('sign_in_button')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
