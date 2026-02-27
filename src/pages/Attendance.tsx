// src/pages/Attendance.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient.ts';
import { CheckCircle, XCircle, User, Book, Calendar, Clock, Search, AlertTriangle, Check, TrendingUp, Download } from 'lucide-react';

// --- TYPES --- //
interface Teacher {
  id: string;
  full_name: string;
}

interface Class {
  id: string;
  name: string;
}

interface Student {
  id: string;
  full_name: string;
}

interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent';
}

// --- MAIN PAGE COMPONENT --- //
export default function Attendance() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const sessions = useMemo(() => Array.from({ length: 8 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  // Fetch initial data (user role and teachers)
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setUserRole(profile?.role || 'teacher');

      // Get all teachers
      const { data: teachersData } = await supabase.from('teachers').select('id, full_name, user_id');
      setTeachers(teachersData || []);

      // If user is a teacher, find their teacher record and auto-select
      if (profile?.role === 'teacher') {
        const teacherRecord = teachersData?.find(t => t.user_id === user.id);
        if (teacherRecord) {
          setCurrentTeacherId(teacherRecord.id);
          setSelectedTeacher(teacherRecord.id);
        }
      }
    };
    fetchInitialData();
  }, []);

  // Fetch classes when a teacher is selected
  useEffect(() => {
    if (!selectedTeacher) {
      setClasses([]);
      setSelectedClass('');
      return;
    }
    const fetchClasses = async () => {
        const { data, error } = await supabase
            .from('class_teachers')
            .select('classes(id, name)')
            .eq('teacher_id', selectedTeacher);

        if (error) {
            console.error('Error fetching classes for teacher', error);
        } else {
            const teacherClasses = data.flatMap(item => item.classes).filter(Boolean) as Class[];
            setClasses(teacherClasses);
        }
    };
    fetchClasses();
  }, [selectedTeacher]);

  // Fetch students and attendance when all filters are selected
  useEffect(() => {
    if (selectedTeacher && selectedClass && selectedMonth && selectedDay && selectedSession) {
      const fetchStudentsAndAttendance = async () => {
        setLoading(true);
        setError(null);
        setAttendance({}); // Clear current state while loading
        setHasExistingData(false);
        // Fetch students in the selected class
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, full_name')
          .eq('class_id', selectedClass);
        
        if (studentsError) {
          setError('لا يمكن تحميل الطلاب.');
          setStudents([]);
        } else {
          setStudents(studentsData || []);
          // Fetch existing attendance for this context
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendances')
            .select('student_id, status')
            .eq('class_id', selectedClass)
            .eq('teacher_id', selectedTeacher)
            .eq('month_year', selectedMonth)
            .eq('day_number', parseInt(selectedDay, 10))
            .eq('session_number', selectedSession);

          if (attendanceError) {
            setError('لا يمكن تحميل بيانات الحضور.');
            setAttendance({});
            setHasExistingData(false);
          } else {
            const exists = attendanceData && attendanceData.length > 0;
            setHasExistingData(exists);
            
            const attendanceMap = (attendanceData || []).reduce((acc, record) => {
              acc[record.student_id] = record.status;
              return acc;
            }, {} as Record<string, 'present' | 'absent'>);
            setAttendance(attendanceMap);
          }
        }
        setLoading(false);
      };
      fetchStudentsAndAttendance();
    }
  }, [selectedTeacher, selectedClass, selectedMonth, selectedDay, selectedSession]);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status: 'present' | 'absent') => {
    const newAttendance = students.reduce((acc, student) => {
      acc[student.id] = status;
      return acc;
    }, {} as Record<string, 'present' | 'absent'>);
    setAttendance(newAttendance);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const recordsToUpsert = Object.entries(attendance).map(([student_id, status]) => ({
      student_id,
      class_id: selectedClass,
      teacher_id: selectedTeacher,
      month_year: selectedMonth,
      day_number: parseInt(selectedDay, 10),
      session_number: selectedSession, // ✅ FIX: keep as string to match DB type and filter queries
      status,
    }));

    if (recordsToUpsert.length === 0) {
        setSaving(false);
        return;
    }

    const { error: upsertError } = await supabase.from('attendances').upsert(recordsToUpsert, {
        onConflict: 'student_id,class_id,teacher_id,month_year,day_number,session_number'
    });

    if (upsertError) {
      setError(`حدث خطأ أثناء حفظ الحضور: ${upsertError.message}`);
      console.error('Error saving attendance', upsertError);
    } else {
      setSuccess('تم حفظ الحضور بنجاح!');
      setTimeout(() => setSuccess(null), 3000);
    }
    setSaving(false);
  };

  const filteredStudents = useMemo(() => 
    students.filter(student => 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [students, searchTerm]);

  const formComplete = selectedTeacher && selectedClass && selectedMonth && selectedDay && selectedSession;

  // ✨ NEW FEATURE: Live attendance stats shown above the list
  const attendanceStats = React.useMemo(() => {
    if (students.length === 0) return null;
    const present = students.filter(s => attendance[s.id] === 'present').length;
    const absent = students.filter(s => attendance[s.id] === 'absent').length;
    const unmarked = students.length - present - absent;
    const rate = students.length > 0 ? Math.round((present / students.length) * 100) : 0;
    return { present, absent, unmarked, rate, total: students.length };
  }, [attendance, students]);

  // ✨ NEW FEATURE: Export attendance to CSV
  const exportAttendanceCSV = () => {
    const rows = [['الاسم', 'الحالة']];
    students.forEach(s => {
      rows.push([s.full_name, attendance[s.id] === 'present' ? 'حاضر' : attendance[s.id] === 'absent' ? 'غائب' : 'لم يسجل']);
    });
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'حضور-' + selectedMonth + '-يوم' + selectedDay + '-حصة' + selectedSession + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">إدارة الحضور والغياب</h1>
            <p className="text-slate-500 dark:text-slate-400">حدد المدرس والصف لتسجيل الحضور</p>
          </div>
        </header>

        {/* Filters Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Teacher Select */}
            <div className="relative">
                <select id="teacher" value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:ring-indigo-500 appearance-none pr-10">
                    <option value="">المدرس</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                <User className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
            </div>
            {/* Class Select */}
            <div className="relative">
                <select id="class" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={!selectedTeacher} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:ring-indigo-500 appearance-none pr-10 disabled:opacity-50">
                    <option value="">القسم</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Book className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
            </div>
            {/* Month Select */}
            <div className="relative">
                <select id="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:ring-indigo-500 appearance-none pr-10">
                    <option value="">الشهر</option>
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
            </div>
            {/* Day Select */}
            <div className="relative">
                <select id="day" value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:ring-indigo-500 appearance-none pr-10">
                    <option value="">اليوم</option>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
            </div>
            {/* Session Select */}
            <div className="relative">
                <select id="session" value={selectedSession} onChange={e => setSelectedSession(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:ring-indigo-500 appearance-none pr-10">
                    <option value="">الحصة</option>
                    {sessions.map(s => <option key={s} value={s}>الحصة {s}</option>)}
                </select>
                <Clock className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Student List & Actions */}
        {formComplete && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center py-20 text-slate-400 dark:text-slate-500">جاري تحميل الطلاب...</div>
            ) : (
              <div>
                {/* ✨ NEW FEATURE: Live Stats Bar */}
                {attendanceStats && (
                  <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'حاضر', count: attendanceStats.present, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                      { label: 'غائب', count: attendanceStats.absent, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                      { label: 'لم يسجل', count: attendanceStats.unmarked, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/30' },
                      { label: 'نسبة الحضور', count: attendanceStats.rate + '%', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                    ].map((stat, i) => (
                      <div key={i} className={`${stat.bg} rounded-xl p-3 text-center`}>
                        <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions Header */}
                <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="relative w-full md:w-1/2">
                        <input type="text" placeholder="ابحث عن طالب..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:ring-indigo-500 pl-10" />
                        <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <button onClick={() => markAll('present')} className="px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">تحديد الكل حاضر</button>
                        <button onClick={() => markAll('absent')} className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">تحديد الكل غائب</button>
                        {/* ✨ NEW FEATURE: Export button */}
                        <button onClick={exportAttendanceCSV} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                          <Download className="w-4 h-4" /> تصدير
                        </button>
                    </div>
                </div>

                {/* Student List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredStudents.length > 0 ? filteredStudents.map(student => (
                    <div key={student.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <span className="font-medium text-slate-900 dark:text-white text-lg sm:text-base">{student.full_name}</span>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleStatusChange(student.id, 'present')} 
                          className={`flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-xl sm:rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${attendance[student.id] === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        >
                            <CheckCircle className="w-5 h-5 sm:w-4 sm:h-4" />
                            حاضر
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'absent')} 
                          className={`flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-xl sm:rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${attendance[student.id] === 'absent' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        >
                            <XCircle className="w-5 h-5 sm:w-4 sm:h-4" />
                            غائب
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-slate-400 dark:text-slate-500">لا يوجد طلاب يطابقون هذا البحث.</div>
                  )}
                </div>

                {/* Save Button & Messages */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                    {hasExistingData && (
                        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm p-3 rounded-lg flex items-center gap-2 border border-amber-100 dark:border-amber-800">
                            <AlertTriangle className="w-4 h-4"/>
                            <span>تم تسجيل الحضور مسبقاً لهذه الحصة. لا يمكنك إعادة التسجيل لتجنب التكرار.</span>
                        </div>
                    )}
                    {error && <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100 dark:border-red-800"><AlertTriangle className="w-4 h-4"/>{error}</div>}
                    {success && <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm p-3 rounded-lg flex items-center gap-2 border border-emerald-100 dark:border-emerald-800"><Check className="w-4 h-4"/>{success}</div>}
                    <button 
                        onClick={handleSave} 
                        disabled={saving || hasExistingData} 
                        className="w-full px-6 py-3 text-base font-semibold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'جاري الحفظ...' : hasExistingData ? 'تم التسجيل مسبقاً' : 'حفظ الحضور'}
                    </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!formComplete && (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                <p>الرجاء تحديد جميع الخيارات أعلاه لعرض قائمة الطلاب.</p>
            </div>
        )}
      </div>
    </div>
  );
}
