// src/pages/FinanceReport.tsx
// ✨ ميزة جديدة: لوحة الإدارة المالية — ملخص الاشتراكات مع إحصاءات شاملة
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient.ts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, CheckCircle,
  XCircle, Calendar, Download, ChevronLeft, ChevronRight, BarChart2, Filter
} from 'lucide-react';

const ARABIC_MONTHS = [
  'جانفي','فيفري','مارس','أفريل','ماي','جوان',
  'جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
];

interface ClassStat {
  classId: string;
  className: string;
  total: number;
  paid: number;
  unpaid: number;
  rate: number;
}

interface StudentRow {
  id: string;
  full_name: string;
  className: string;
  status: 'paid' | 'unpaid';
  paid_at: string | null;
  absences: number;
}

export default function FinanceReport() {
  const today = new Date();

  const buildMonthList = () => {
    const list = [];
    const start = new Date(2025, 8, 1); // سبتمبر 2025
    const end   = new Date(2030, 7, 1); // أوت 2030
    const d = new Date(start);
    while (d <= end) {
      list.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      });
      d.setMonth(d.getMonth() + 1);
    }
    return list.reverse(); // الأحدث أولاً
  };
  const monthList = buildMonthList();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(true);

  const [totalStudents, setTotalStudents] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');

  useEffect(() => { fetchData(); }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all required data in parallel
      const [
        { data: studs },
        { data: subs },
        { data: classes },
        { data: absences },
      ] = await Promise.all([
        supabase.from('students').select('id, full_name, class_id, classes(id, name)'),
        supabase.from('subscriptions').select('student_id, status, paid_at').eq('month_year', selectedMonth),
        supabase.from('classes').select('id, name'),
        supabase.from('attendances').select('student_id').eq('month_year', selectedMonth).eq('status', 'absent'),
      ]);

      const subsMap: Record<string, { status: 'paid' | 'unpaid'; paid_at: string | null }> = {};
      (subs || []).forEach(s => { subsMap[s.student_id] = { status: s.status, paid_at: s.paid_at }; });

      const absMap: Record<string, number> = {};
      (absences || []).forEach(a => { absMap[a.student_id] = (absMap[a.student_id] || 0) + 1; });

      const studentRows: StudentRow[] = (studs || []).map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        className: s.classes?.name || '—',
        status: subsMap[s.id]?.status || 'unpaid',
        paid_at: subsMap[s.id]?.paid_at || null,
        absences: absMap[s.id] || 0,
      }));

      setStudents(studentRows);
      setTotalStudents(studentRows.length);
      setPaidCount(studentRows.filter(s => s.status === 'paid').length);

      // Build per-class stats
      const classMap: Record<string, ClassStat> = {};
      (classes || []).forEach((c: any) => {
        classMap[c.id] = { classId: c.id, className: c.name, total: 0, paid: 0, unpaid: 0, rate: 0 };
      });
      studentRows.forEach(s => {
        const cls = (studs || []).find((st: any) => st.id === s.id) as any;
        const cid = cls?.class_id;
        if (cid && classMap[cid]) {
          classMap[cid].total++;
          if (s.status === 'paid') classMap[cid].paid++; else classMap[cid].unpaid++;
        }
      });
      Object.values(classMap).forEach(c => {
        c.rate = c.total > 0 ? Math.round((c.paid / c.total) * 100) : 0;
      });
      setClassStats(Object.values(classMap).filter(c => c.total > 0).sort((a, b) => b.rate - a.rate));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filterClass !== 'all' && s.className !== filterClass) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      return true;
    });
  }, [students, filterClass, filterStatus]);

  const unpaidCount = totalStudents - paidCount;
  const collectionRate = totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0;

  // CSV export
  const exportCSV = () => {
    const rows = [['الاسم', 'القسم', 'حالة الدفع', 'تاريخ الدفع', 'الغيابات']];
    filteredStudents.forEach(s => rows.push([
      s.full_name, s.className,
      s.status === 'paid' ? 'مدفوع' : 'غير مدفوع',
      s.paid_at ? new Date(s.paid_at).toLocaleDateString('ar-DZ') : '—',
      String(s.absences),
    ]));
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `تقرير-مالي-${selectedMonth}.csv`; a.click();
  };

  // Month navigation
  const currentIdx = monthList.findIndex(m => m.value === selectedMonth);
  const canPrev = currentIdx < monthList.length - 1;
  const canNext = currentIdx > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">التقرير المالي</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">نظرة شاملة على الاشتراكات والتحصيل</p>
            </div>
          </div>

          {/* Month switcher */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 shadow-sm">
            <button onClick={() => canPrev && setSelectedMonth(monthList[currentIdx + 1].value)}
              disabled={!canPrev}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-900 dark:text-white min-w-[110px] text-center">
              {monthList.find(m => m.value === selectedMonth)?.label}
            </span>
            <button onClick={() => canNext && setSelectedMonth(monthList[currentIdx - 1].value)}
              disabled={!canNext}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'إجمالي الطلاب', value: totalStudents, icon: Users, color: 'indigo' },
                { label: 'دفعوا الاشتراك', value: paidCount, icon: CheckCircle, color: 'emerald' },
                { label: 'لم يدفعوا بعد', value: unpaidCount, icon: XCircle, color: 'red' },
                { label: 'نسبة التحصيل', value: `${collectionRate}%`, icon: TrendingUp, color: collectionRate >= 70 ? 'emerald' : 'amber' },
              ].map((card, i) => (
                <div key={i} className={`bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 bg-${card.color}-50 dark:bg-${card.color}-900/30`}>
                    <card.icon className={`w-5 h-5 text-${card.color}-600 dark:text-${card.color}-400`} />
                  </div>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* ── Collection progress bar ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 mb-8 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-900 dark:text-white">تقدم التحصيل الشهري</h3>
                <span className={`text-sm font-black ${collectionRate >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{collectionRate}%</span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${collectionRate >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>{paidCount} دفعوا</span>
                <span>{unpaidCount} لم يدفعوا</span>
              </div>
            </div>

            {/* ── Per-class stats ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 mb-8 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                <BarChart2 className="w-5 h-5 text-indigo-500" />
                التحصيل حسب القسم
              </h3>
              <div className="space-y-3">
                {classStats.map(cls => (
                  <div key={cls.classId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{cls.className}</span>
                      <span className={`font-black text-xs ${cls.rate >= 70 ? 'text-emerald-600 dark:text-emerald-400' : cls.rate >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {cls.paid}/{cls.total} — {cls.rate}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cls.rate >= 70 ? 'bg-emerald-500' : cls.rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${cls.rate}%`, transition: 'width 0.6s ease' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Student table with filters ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              {/* Table header with filters */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  قائمة الطلاب
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full font-medium">{filteredStudents.length}</span>
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={filterClass}
                    onChange={e => setFilterClass(e.target.value)}
                    className="text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">كل الأقسام</option>
                    {[...new Set(students.map(s => s.className))].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value as any)}
                    className="text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">الكل</option>
                    <option value="paid">دفعوا</option>
                    <option value="unpaid">لم يدفعوا</option>
                  </select>
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> تصدير CSV
                  </button>
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase">الطالب</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase">القسم</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase">الغيابات</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase">الحالة</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase">تاريخ الدفع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {filteredStudents.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white text-sm">{s.full_name}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">{s.className}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                            s.absences >= 3 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                            s.absences > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          }`}>{s.absences}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                            s.status === 'paid'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {s.status === 'paid' ? '✓ مدفوع' : '✗ غير مدفوع'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                          {s.paid_at ? new Date(s.paid_at).toLocaleDateString('ar-DZ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                {filteredStudents.map(s => (
                  <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{s.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{s.className} · {s.absences} غياب</p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${
                      s.status === 'paid'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {s.status === 'paid' ? '✓ مدفوع' : '✗ لم يدفع'}
                    </span>
                  </div>
                ))}
              </div>

              {filteredStudents.length === 0 && (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500">لا يوجد طلاب يطابقون الفلتر</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
