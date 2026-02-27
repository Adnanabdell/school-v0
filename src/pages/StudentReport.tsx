// src/pages/StudentReport.tsx
// ✨ ميزة جديدة: تقرير طالب شامل — قابل للطباعة ومناسب لاجتماعات الأولياء
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient.ts';
import {
  User, Search, BookOpen, Calendar, MessageSquare,
  TrendingUp, TrendingDown, Printer, ChevronRight, AlertTriangle, CheckCircle, X
} from 'lucide-react';

const ARABIC_MONTHS = [
  'جانفي','فيفري','مارس','أفريل','ماي','جوان',
  'جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
];

interface StudentResult { id: string; full_name: string; className: string; parent_name: string; parent_phone: string; }
interface MonthStat { month: string; label: string; present: number; absent: number; total: number; rate: number; }

export default function StudentReport() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<StudentResult | null>(null);

  const [monthStats, setMonthStats] = useState<MonthStat[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Search
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('students')
        .select('id, full_name, parent_name, parent_phone, classes:class_id(name)')
        .ilike('full_name', `%${query}%`)
        .limit(8);
      setResults((data || []).map((s: any) => ({
        id: s.id, full_name: s.full_name,
        className: s.classes?.name || '—',
        parent_name: s.parent_name || '—',
        parent_phone: s.parent_phone || '—',
      })));
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const selectStudent = async (s: StudentResult) => {
    setSelected(s);
    setQuery('');
    setResults([]);
    setLoadingReport(true);

    // Last 4 months
    const months: string[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const [attRes, evalRes, subRes] = await Promise.all([
      supabase.from('attendances').select('month_year, status').eq('student_id', s.id).in('month_year', months),
      supabase.from('evaluations').select('note, created_at, teachers:teacher_id(full_name)').eq('student_id', s.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('subscriptions').select('month_year, status, paid_at').eq('student_id', s.id).in('month_year', months),
    ]);

    // Build per-month attendance stats
    const attMap: Record<string, { present: number; absent: number }> = {};
    (attRes.data || []).forEach((r: any) => {
      if (!attMap[r.month_year]) attMap[r.month_year] = { present: 0, absent: 0 };
      attMap[r.month_year][r.status as 'present' | 'absent']++;
    });
    const stats = months.map(m => {
      const [year, mo] = m.split('-');
      const data = attMap[m] || { present: 0, absent: 0 };
      const total = data.present + data.absent;
      return {
        month: m,
        label: `${ARABIC_MONTHS[parseInt(mo) - 1]} ${year}`,
        present: data.present, absent: data.absent, total,
        rate: total > 0 ? Math.round((data.present / total) * 100) : 0,
      };
    });

    setMonthStats(stats);
    setEvaluations(evalRes.data || []);
    setSubscriptions(subRes.data || []);
    setLoadingReport(false);
  };

  const handlePrint = () => { window.print(); };

  const overallRate = useMemo(() => {
    const total = monthStats.reduce((a, m) => a + m.total, 0);
    const present = monthStats.reduce((a, m) => a + m.present, 0);
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }, [monthStats]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-xl">
            <Printer className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">تقرير الطالب</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">ابحث عن طالب لعرض تقريره الشامل القابل للطباعة</p>
          </div>
        </div>

        {/* Search box */}
        <div className="relative mb-8">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث باسم الطالب..."
              className="w-full py-4 pr-12 pl-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 shadow-sm text-base"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            {searching && <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />}
          </div>

          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
              {results.map(r => (
                <button key={r.id} onClick={() => selectStudent(r)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 text-right">
                  <div className="w-9 h-9 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{r.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.className}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 mr-auto" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Report */}
        {selected && (
          <div>
            {/* Print button */}
            <div className="flex justify-end mb-4 print:hidden">
              <button onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg">
                <Printer className="w-4 h-4" /> طباعة / حفظ PDF
              </button>
            </div>

            <div ref={printRef} className="space-y-6">

              {/* ── Identity card ── */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm print:shadow-none print:border-2">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-600/20 shrink-0">
                    <User className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selected.full_name}</h2>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {selected.className}</span>
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> ولي الأمر: {selected.parent_name}</span>
                      {selected.parent_phone !== '—' && <span>📞 {selected.parent_phone}</span>}
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <p className={`text-4xl font-black ${overallRate >= 80 ? 'text-emerald-600' : overallRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{overallRate}%</p>
                    <p className="text-xs text-slate-500 font-medium">معدل الحضور</p>
                  </div>
                </div>
              </div>

              {loadingReport ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* ── Monthly attendance chart ── */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                      <Calendar className="w-5 h-5 text-indigo-500" />
                      الحضور — آخر 4 أشهر
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {monthStats.map(m => (
                        <div key={m.month} className={`rounded-2xl p-4 border ${
                          m.rate >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
                          m.rate >= 60 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                          m.total === 0 ? 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700' :
                          'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{m.label}</p>
                          {m.total === 0 ? (
                            <p className="text-sm text-slate-400 font-medium">لا بيانات</p>
                          ) : (
                            <>
                              <p className={`text-3xl font-black ${m.rate >= 80 ? 'text-emerald-700 dark:text-emerald-400' : m.rate >= 60 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}>{m.rate}%</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.present} حاضر / {m.absent} غائب</p>
                              {/* Mini progress bar */}
                              <div className="mt-2 h-1.5 bg-white/70 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${m.rate >= 80 ? 'bg-emerald-500' : m.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${m.rate}%` }} />
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Subscriptions ── */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      الاشتراكات — آخر 4 أشهر
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {monthStats.map(m => {
                        const sub = subscriptions.find((s: any) => s.month_year === m.month);
                        const paid = sub?.status === 'paid';
                        return (
                          <div key={m.month} className={`rounded-2xl p-4 border flex flex-col items-center text-center ${
                            paid ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                 : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          }`}>
                            {paid
                              ? <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-1" />
                              : <X className="w-6 h-6 text-red-600 dark:text-red-400 mb-1" />
                            }
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{m.label}</p>
                            <p className={`text-xs font-black mt-0.5 ${paid ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                              {paid ? 'مدفوع' : 'غير مدفوع'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Evaluations ── */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                      <MessageSquare className="w-5 h-5 text-rose-500" />
                      ملاحظات المدرسين
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">{evaluations.length}</span>
                    </h3>
                    {evaluations.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">لا توجد ملاحظات مسجلة حتى الآن</p>
                    ) : (
                      <div className="space-y-3">
                        {evaluations.map((ev, i) => (
                          <div key={i} className="relative pl-4 border-r-4 border-rose-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4">
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{ev.note}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{ev.teachers?.full_name || 'مدرس'}</span>
                              <span className="text-xs text-slate-400">{new Date(ev.created_at).toLocaleDateString('ar-DZ', { dateStyle: 'long' })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Print footer */}
                  <div className="hidden print:block text-center text-xs text-slate-400 pt-4 border-t border-slate-200">
                    تم إنشاء هذا التقرير بتاريخ {new Date().toLocaleDateString('ar-DZ', { dateStyle: 'full' })} — نظام إدارة المدرسة
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selected && (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-rose-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">ابدأ بالبحث عن اسم الطالب</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">ستظهر التقارير جاهزة للطباعة أو المشاركة</p>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #root > * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          [ref="printRef"], [ref="printRef"] * { visibility: visible; }
        }
      `}</style>
    </div>
  );
}
