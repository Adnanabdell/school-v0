// src/pages/Subscriptions.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { showError } from '../utils/errorHandler'; // FIX: unified error system
import { supabase } from '../supabaseClient.ts';
import { Search, Filter, CheckCircle, XCircle, DollarSign, User, Book, Calendar, AlertTriangle, Download } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  class_id: string;
  classes: { name: string };
}

interface AttendanceSummary {
  student_id: string;
  session_number: number;
  status: string;
}

interface Subscription {
  student_id: string;
  status: 'paid' | 'unpaid';
}

export default function Subscriptions() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<Record<string, Record<number, 'present' | 'absent'>>>({});
  const [subscriptions, setSubscriptions] = useState<Record<string, {status: 'paid' | 'unpaid', paid_at: string | null}>>({});
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  
  // FIX: Default to current month dynamically
  const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // توليد الأشهر من سبتمبر 2025 إلى أوت 2030 (5 سنوات دراسية كاملة)
  const generateMonths = () => {
    const arabicMonthNames = [
      'جانفي','فيفري','مارس','أفريل','ماي','جوان',
      'جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
    ];
    const result = [];
    const start = new Date(2025, 8, 1);  // سبتمبر 2025
    const end   = new Date(2030, 7, 1);  // أوت 2030
    const d = new Date(start);
    while (d <= end) {
      const year  = d.getFullYear();
      const month = d.getMonth();
      const value = year + '-' + String(month + 1).padStart(2, '0');
      result.push({ value, label: arabicMonthNames[month] + ' ' + year });
      d.setMonth(d.getMonth() + 1);
    }
    return result;
  };
  const months = generateMonths();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchSubscriptionData();
  }, [selectedMonth]);

  const fetchInitialData = async () => {
    const { data: classesData } = await supabase.from('classes').select('id, name');
    setClasses(classesData || []);
    
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, full_name, class_id, classes(name)');
    setStudents(studentsData as any || []);
    setLoading(false);
  };

  const fetchSubscriptionData = async () => {
    setLoading(true);
    
    // 1. Fetch Subscriptions for the month
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('student_id, status, paid_at')
      .eq('month_year', selectedMonth);
    
    const subsMap = (subsData || []).reduce((acc, curr) => {
      acc[curr.student_id] = { status: curr.status, paid_at: curr.paid_at };
      return acc;
    }, {} as Record<string, {status: 'paid' | 'unpaid', paid_at: string | null}>);
    setSubscriptions(subsMap);

    // 2. Fetch Attendance for the month to show 1-8 sessions (both present and absent)
    const { data: attData } = await supabase
      .from('attendances')
      .select('student_id, session_number, status')
      .eq('month_year', selectedMonth);

    const attMap: Record<string, Record<number, 'present' | 'absent'>> = {};
    (attData || []).forEach(record => {
      if (!attMap[record.student_id]) attMap[record.student_id] = {};
      // We take the latest status if there are duplicates (though SQL constraint should prevent this)
      attMap[record.student_id][record.session_number] = record.status as 'present' | 'absent';
    });
    setAttendances(attMap);
    
    setLoading(false);
  };

  const togglePayment = async (studentId: string) => {
    const currentSub = subscriptions[studentId] || { status: 'unpaid', paid_at: null };
    const newStatus = currentSub.status === 'paid' ? 'unpaid' : 'paid';
    const newPaidAt = newStatus === 'paid' ? new Date().toISOString() : null;
    
    setUpdatingId(studentId);
    
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        student_id: studentId,
        month_year: selectedMonth,
        status: newStatus,
        paid_at: newPaidAt
      }, { onConflict: 'student_id,month_year' });

    if (!error) {
      setSubscriptions(prev => ({ 
        ...prev, 
        [studentId]: { status: newStatus, paid_at: newPaidAt } 
      }));
    } else {
      showError(error); // FIX: use unified toast notification system
    }
    
    setUpdatingId(null);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClass === 'all' || s.class_id === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClass]);

  // ✨ NEW FEATURE: Export subscription report to CSV
  const exportToCSV = () => {
    const arabicMonthLabels: Record<string, string> = {
      '01': 'جانفي', '02': 'فيفري', '03': 'مارس', '04': 'أفريل',
      '05': 'ماي', '06': 'جوان', '07': 'جويلية', '08': 'أوت',
      '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
    };
    const [year, month] = selectedMonth.split('-');
    const monthLabel = arabicMonthLabels[month] + ' ' + year;
    
    const rows = [
      ['الاسم', 'القسم', 'حالة الدفع', 'تاريخ الدفع', 'الحصة1', 'الحصة2', 'الحصة3', 'الحصة4', 'الحصة5', 'الحصة6', 'الحصة7', 'الحصة8']
    ];
    
    filteredStudents.forEach(student => {
      const sub = subscriptions[student.id] || { status: 'unpaid', paid_at: null };
      const studentAtt = attendances[student.id] || {};
      rows.push([
        student.full_name,
        student.classes?.name || '',
        sub.status === 'paid' ? 'مدفوع' : 'غير مدفوع',
        sub.paid_at ? new Date(sub.paid_at).toLocaleDateString('ar-DZ') : '',
        ...([1,2,3,4,5,6,7,8].map(n => studentAtt[n] === 'present' ? 'حاضر' : studentAtt[n] === 'absent' ? 'غائب' : '-'))
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'اشتراكات-' + monthLabel + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            إدارة الاشتراكات والمدفوعات
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">تتبع مستحقات الطلاب الشهرية وحالة حضورهم</p>
        </header>
        {/* ✨ NEW FEATURE: CSV Export Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white pr-10 focus:ring-2 focus:ring-indigo-500 appearance-none font-bold"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="relative">
            <Book className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              value={selectedClass} 
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white pr-10 focus:ring-2 focus:ring-indigo-500 appearance-none font-bold"
            >
              <option value="all">كل الأقسام</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="ابحث عن طالب..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white pr-10 focus:ring-2 focus:ring-indigo-500 font-bold"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">الطالب</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">القسم</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400 text-center">الحصص (1-8)</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400 text-center">حالة الدفع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-20 text-slate-400 dark:text-slate-500">جاري تحميل البيانات...</td></tr>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map(student => {
                    const sub = subscriptions[student.id] || { status: 'unpaid', paid_at: null };
                    const isPaid = sub.status === 'paid';
                    const studentAtt = attendances[student.id] || {};
                    
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{student.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm font-medium">
                          {student.classes?.name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-1.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                              const status = studentAtt[num];
                              let bgColor = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600';
                              if (status === 'present') bgColor = 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400';
                              if (status === 'absent') bgColor = 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400';

                              return (
                                <div 
                                  key={num}
                                  title={`الحصة ${num}: ${status || 'لم تُسجل'}`}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold border transition-all ${bgColor}`}
                                >
                                  {num}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => togglePayment(student.id)}
                                disabled={updatingId === student.id}
                                className={`px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-2 mx-auto ${
                                isPaid 
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                                    : 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                                } ${updatingId === student.id ? 'opacity-50 animate-pulse' : 'hover:scale-105 active:scale-95'}`}
                            >
                                {isPaid ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    تم الدفع
                                </>
                                ) : (
                                <>
                                    <XCircle className="w-4 h-4" />
                                    لم يدفع
                                </>
                                )
                                }
                            </button>
                            {isPaid && sub.paid_at && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic font-medium">
                                    بتاريخ: {new Date(sub.paid_at).toLocaleString('ar-DZ', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={4} className="text-center py-20 text-slate-400 dark:text-slate-500">لا يوجد طلاب يطابقون البحث.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500">جاري تحميل البيانات...</div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map(student => {
              const sub = subscriptions[student.id] || { status: 'unpaid', paid_at: null };
              const isPaid = sub.status === 'paid';
              const studentAtt = attendances[student.id] || {};
              
              return (
                <div key={student.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{student.full_name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{student.classes?.name}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={() => togglePayment(student.id)}
                        disabled={updatingId === student.id}
                        className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all ${
                          isPaid ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                        }`}
                      >
                        {isPaid ? 'تم الدفع' : 'لم يدفع'}
                      </button>
                      {isPaid && sub.paid_at && (
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                          {new Date(sub.paid_at).toLocaleDateString('ar-DZ')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-50 dark:border-slate-700">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 text-center font-bold">حالة الحصص (1-8)</p>
                    <div className="flex justify-between gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                        const status = studentAtt[num];
                        let bgColor = 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600';
                        if (status === 'present') bgColor = 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400';
                        if (status === 'absent') bgColor = 'bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400';

                        return (
                          <div 
                            key={num}
                            className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold border ${bgColor}`}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500">لا يوجد طلاب يطابقون البحث.</div>
          )}
        </div>
      </div>
    </div>
  );
}
