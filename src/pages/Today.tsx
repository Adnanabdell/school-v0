// src/pages/Today.tsx
// ✨ ميزة جديدة: صفحة "يومي" — المدرس يختار الحصة فقط، الباقي يملأ تلقائياً
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient.ts';
import { CheckCircle, XCircle, Clock, BookOpen, Save, AlertTriangle, Check, Zap, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { showError, showSuccess } from '../utils/errorHandler';

interface Student { id: string; full_name: string; }
interface TeacherClass { classId: string; className: string; }

const ARABIC_MONTHS = [
  'جانفي','فيفري','مارس','أفريل','ماي','جوان',
  'جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
];

export default function Today() {
  const today = useMemo(() => new Date(), []);
  const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = today.getDate();
  const dayLabel = `${currentDay} ${ARABIC_MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [hasExisting, setHasExisting] = useState(false);

  const [step, setStep] = useState<'choose' | 'attendance' | 'done'>('choose');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [absenteeAlert, setAbsenteeAlert] = useState<string[]>([]); // names of students with 3+ absences

  // ─── 1. Load teacher identity & their classes ────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tData } = await supabase
        .from('teachers')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();

      if (!tData) { setLoading(false); return; }
      setTeacherId(tData.id);
      setTeacherName(tData.full_name);

      const { data: ctData } = await supabase
        .from('class_teachers')
        .select('classes(id, name)')
        .eq('teacher_id', tData.id);

      const classes: TeacherClass[] = (ctData || [])
        .flatMap((r: any) => r.classes ? [{ classId: r.classes.id, className: r.classes.name }] : []);

      setTeacherClasses(classes);
      if (classes.length === 1) setSelectedClass(classes[0]);
      setLoading(false);
    };
    init();
  }, []);

  // ─── 2. When class + session chosen → load students & check existing ─────
  const loadAttendance = useCallback(async (cls: TeacherClass, session: number) => {
    if (!teacherId) return;
    setLoading(true);
    setAttendance({});
    setHasExisting(false);

    const [{ data: studs }, { data: existing }] = await Promise.all([
      supabase.from('students').select('id, full_name').eq('class_id', cls.classId).order('full_name'),
      supabase.from('attendances').select('student_id, status')
        .eq('class_id', cls.classId)
        .eq('teacher_id', teacherId)
        .eq('month_year', currentMonthYear)
        .eq('day_number', currentDay)
        .eq('session_number', String(session)),
    ]);

    const studentList = studs || [];
    setStudents(studentList);

    if (existing && existing.length > 0) {
      setHasExisting(true);
      const map: Record<string, 'present' | 'absent'> = {};
      existing.forEach(r => { map[r.student_id] = r.status; });
      setAttendance(map);
    } else {
      // Default all to present for faster entry
      const defaultMap: Record<string, 'present' | 'absent'> = {};
      studentList.forEach(s => { defaultMap[s.id] = 'present'; });
      setAttendance(defaultMap);
    }

    // Check for students with 3+ absences this month (alert)
    const { data: absData } = await supabase
      .from('attendances')
      .select('student_id')
      .eq('class_id', cls.classId)
      .eq('teacher_id', teacherId)
      .eq('month_year', currentMonthYear)
      .eq('status', 'absent');

    if (absData) {
      const counts: Record<string, number> = {};
      absData.forEach(r => { counts[r.student_id] = (counts[r.student_id] || 0) + 1; });
      const flaggedIds = Object.entries(counts).filter(([, c]) => c >= 3).map(([id]) => id);
      const flaggedNames = studentList.filter(s => flaggedIds.includes(s.id)).map(s => s.full_name);
      setAbsenteeAlert(flaggedNames);
    }

    setLoading(false);
    setStep('attendance');
  }, [teacherId, currentMonthYear, currentDay]);

  const handleStart = () => {
    if (selectedClass && selectedSession) {
      loadAttendance(selectedClass, selectedSession);
    }
  };

  const toggle = (id: string) => {
    if (hasExisting) return;
    setAttendance(prev => ({
      ...prev,
      [id]: prev[id] === 'present' ? 'absent' : 'present',
    }));
  };

  const markAll = (status: 'present' | 'absent') => {
    if (hasExisting) return;
    const m: Record<string, 'present' | 'absent'> = {};
    students.forEach(s => { m[s.id] = status; });
    setAttendance(m);
  };

  const handleSave = async () => {
    if (!teacherId || !selectedClass || !selectedSession || hasExisting) return;
    setSaving(true);

    const records = students.map(s => ({
      student_id: s.id,
      class_id: selectedClass.classId,
      teacher_id: teacherId,
      month_year: currentMonthYear,
      day_number: currentDay,
      session_number: String(selectedSession),
      status: attendance[s.id] || 'present',
    }));

    const { error } = await supabase.from('attendances').upsert(records, {
      onConflict: 'student_id,class_id,teacher_id,month_year,day_number,session_number',
    });

    if (error) {
      showError(error);
    } else {
      showSuccess('تم حفظ الحضور بنجاح!');
      setHasExisting(true);
      setStep('done');
    }
    setSaving(false);
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const present = students.filter(s => attendance[s.id] === 'present').length;
    const absent = students.filter(s => attendance[s.id] === 'absent').length;
    return { present, absent, total: students.length };
  }, [attendance, students]);

  // ─── UI ───────────────────────────────────────────────────────────────────
  if (loading && step === 'choose') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!teacherId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-slate-700 dark:text-slate-300 font-bold text-lg">هذه الصفحة للمدرسين فقط</p>
          <p className="text-slate-500 dark:text-slate-400 mt-2">حسابك غير مرتبط بسجل مدرس. تواصل مع الإدارة.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
              <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">يومي السريع</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mr-12">
            مرحباً <span className="font-bold text-slate-700 dark:text-slate-300">{teacherName}</span> — {dayLabel}
          </p>
        </div>

        {/* ── STEP 1: Choose class + session ── */}
        {step === 'choose' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-bold text-slate-900 dark:text-white text-lg">ما هي حصتك الآن؟</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">اختر القسم والحصة فقط — التاريخ يتحدد تلقائياً</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Class picker */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">القسم</label>
                {teacherClasses.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">لم يتم تعيينك لأي قسم بعد</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {teacherClasses.map(cls => (
                      <button
                        key={cls.classId}
                        onClick={() => setSelectedClass(cls)}
                        className={`p-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                          selectedClass?.classId === cls.classId
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600'
                        }`}
                      >
                        <BookOpen className="w-4 h-4 mx-auto mb-1 opacity-60" />
                        {cls.className}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Session picker */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">الحصة</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <button
                      key={n}
                      onClick={() => setSelectedSession(n)}
                      className={`py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                        selectedSession === n
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      <Clock className="w-3 h-3 mx-auto mb-1 opacity-60" />
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={!selectedClass || !selectedSession}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-base"
              >
                <Users className="w-5 h-5" />
                عرض قائمة الطلاب
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Attendance ── */}
        {(step === 'attendance' || step === 'done') && (
          <div className="space-y-4">
            {/* Context bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setStep('choose'); setStudents([]); }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedClass?.className} — الحصة {selectedSession}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{dayLabel}</p>
                </div>
              </div>
              {/* Live stat pills */}
              <div className="flex gap-2">
                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">{stats.present} حاضر</span>
                <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full">{stats.absent} غائب</span>
              </div>
            </div>

            {/* Repeat absence alert */}
            {absenteeAlert.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">تنبيه: طلاب بغيابات متكررة هذا الشهر</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{absenteeAlert.join('، ')}</p>
                </div>
              </div>
            )}

            {/* Already saved notice */}
            {hasExisting && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {step === 'done' ? 'تم حفظ الحضور بنجاح ✓' : 'هذه الحصة سُجِّلت مسبقاً — عرض للقراءة فقط'}
                </p>
              </div>
            )}

            {/* Mark all buttons */}
            {!hasExisting && (
              <div className="flex gap-2">
                <button onClick={() => markAll('present')} className="flex-1 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition-colors">
                  ✓ الكل حاضر
                </button>
                <button onClick={() => markAll('absent')} className="flex-1 py-2.5 text-sm font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 transition-colors">
                  ✗ الكل غائب
                </button>
              </div>
            )}

            {/* Student list — large tap targets, optimized for mobile */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <div className="py-16 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : students.map(student => {
                const status = attendance[student.id];
                const isPresent = status === 'present';
                const isAbsent = status === 'absent';
                const isRepeatedAbsentee = absenteeAlert.includes(student.full_name);
                return (
                  <button
                    key={student.id}
                    onClick={() => toggle(student.id)}
                    disabled={hasExisting}
                    className={`w-full flex items-center justify-between px-5 py-4 transition-all text-right ${
                      hasExisting ? 'cursor-default' : 'active:scale-[0.99]'
                    } ${
                      isPresent ? 'bg-emerald-50/60 dark:bg-emerald-900/10' :
                      isAbsent  ? 'bg-red-50/60 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                        isPresent ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' :
                        isAbsent  ? 'bg-red-500 shadow-lg shadow-red-500/30' :
                        'bg-slate-100 dark:bg-slate-700'
                      }`}>
                        {isPresent ? <CheckCircle className="w-5 h-5 text-white" /> :
                         isAbsent  ? <XCircle className="w-5 h-5 text-white" /> :
                         <span className="text-slate-400 text-xs">?</span>}
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-base ${isPresent ? 'text-emerald-800 dark:text-emerald-300' : isAbsent ? 'text-red-800 dark:text-red-300' : 'text-slate-900 dark:text-white'}`}>
                          {student.full_name}
                        </p>
                        {isRepeatedAbsentee && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">⚠ غيابات متكررة</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isPresent ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' :
                      isAbsent  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                      'bg-slate-100 dark:bg-slate-700 text-slate-400'
                    }`}>
                      {isPresent ? 'حاضر' : isAbsent ? 'غائب' : '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Save button */}
            {!hasExisting && (
              <button
                onClick={handleSave}
                disabled={saving || students.length === 0}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-base"
              >
                <Save className="w-5 h-5" />
                {saving ? 'جاري الحفظ...' : `حفظ حضور ${stats.total} طالب`}
              </button>
            )}

            {/* After done — start another session */}
            {step === 'done' && (
              <button
                onClick={() => { setStep('choose'); setSelectedSession(null); setStudents([]); setHasExisting(false); }}
                className="w-full py-3 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                تسجيل حصة أخرى
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
