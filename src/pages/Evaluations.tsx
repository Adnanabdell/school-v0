// src/pages/Evaluations.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { showError, showSuccess } from '../utils/errorHandler'; // FIX: use proper toast system
import { supabase } from '../supabaseClient.ts';
import { MessageSquare, User, Book, Search, Save, CheckCircle, AlertCircle, History } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  class_id: string;
}

interface Evaluation {
  id?: string;
  student_id: string;
  note: string;
  created_at?: string;
}

export default function Evaluations() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, Evaluation[]>>({});
  
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsAndEvaluations();
    }
  }, [selectedClass]);

  const fetchInitialData = async () => {
    const { data: classesData } = await supabase.from('classes').select('id, name');
    setClasses(classesData || []);
    if (classesData && classesData.length > 0) {
      setSelectedClass(classesData[0].id);
    }
    setLoading(false);
  };

  const fetchStudentsAndEvaluations = async () => {
    setLoading(true);
    // Fetch students
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, full_name')
      .eq('class_id', selectedClass);
    
    setStudents(studentsData || []);

    // Fetch evaluations for these students
    const studentIds = (studentsData || []).map(s => s.id);
    if (studentIds.length > 0) {
      const { data: evalData } = await supabase
        .from('evaluations')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      const historyMap: Record<string, Evaluation[]> = {};
      (evalData || []).forEach(ev => {
        if (!historyMap[ev.student_id]) historyMap[ev.student_id] = [];
        historyMap[ev.student_id].push(ev);
      });
      setHistory(historyMap);
    }
    
    setLoading(false);
  };

  const handleSaveNote = async (studentId: string) => {
    const note = notes[studentId];
    if (!note || note.trim() === '') return;

    setSavingId(studentId);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get teacher_id if the user is a teacher
    let teacherId = null;
    if (user) {
        const { data: teacherData } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .single();
        teacherId = teacherData?.id;
    }

    const { error } = await supabase
      .from('evaluations')
      .insert([{
        student_id: studentId,
        teacher_id: teacherId,
        note: note.trim()
      }]);

    if (!error) {
      setSuccessId(studentId);
      setNotes(prev => ({ ...prev, [studentId]: '' }));
      showSuccess('تم حفظ الملاحظة بنجاح'); // FIX: unified toast notification
      fetchStudentsAndEvaluations();
      setTimeout(() => setSuccessId(null), 3000);
    } else {
      showError(error); // FIX: use proper toast notification instead of alert()
    }
    
    setSavingId(null);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            تقييم الطلاب والملاحظات التربوية
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">اكتب ملاحظاتك حول أداء الطلاب لإرسالها لأوليائهم لاحقاً</p>
        </header>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 mb-8 flex flex-col md:flex-row gap-4 shadow-sm">
          <div className="flex-1 relative">
            <Book className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select 
              value={selectedClass} 
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white pr-10 focus:ring-2 focus:ring-indigo-500 appearance-none font-bold"
            >
              <option value="">اختر القسم</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex-1 relative">
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

        {/* ✨ NEW FEATURE: Quick stats strip */}
        {!loading && students.length > 0 && (
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm">
              <span className="text-indigo-600 dark:text-indigo-400 text-lg font-black">{students.length}</span>
              طالب في هذا القسم
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm">
              <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">{students.filter(s => (history[s.id]?.length || 0) > 0).length}</span>
              لديهم ملاحظات
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm">
              <span className="text-amber-600 dark:text-amber-400 text-lg font-black">{students.filter(s => !history[s.id]?.length).length}</span>
              بدون ملاحظات بعد
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">جاري تحميل قائمة الطلاب...</div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map(student => (
              <div key={student.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-500/50">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{student.full_name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">كتابة ملاحظة جديدة</p>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={notes[student.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [student.id]: e.target.value }))}
                      placeholder="اكتب ملاحظاتك هنا..."
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white min-h-[120px] focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-base font-medium"
                    />
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                            {successId === student.id && (
                                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-1 animate-bounce">
                                    <CheckCircle className="w-4 h-4" /> تم الحفظ بنجاح
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => handleSaveNote(student.id)}
                            disabled={savingId === student.id || !notes[student.id]?.trim()}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg shadow-indigo-600/20"
                        >
                            {savingId === student.id ? 'جاري الحفظ...' : (
                                <>
                                    <Save className="w-5 h-5" /> حفظ الملاحظة
                                </>
                            )}
                        </button>
                    </div>
                  </div>

                  {/* History Section */}
                  {history[student.id] && history[student.id].length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                      <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
                        <History className="w-4 h-4" /> السجل السابق للملاحظات
                      </h4>
                      <div className="space-y-3">
                        {history[student.id].slice(0, 3).map((ev, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 text-sm">
                            <p className="text-slate-900 dark:text-slate-200 leading-relaxed font-medium">{ev.note}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 italic font-bold">
                              {new Date(ev.created_at!).toLocaleDateString('ar-DZ', { dateStyle: 'full' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">لا يوجد طلاب في هذا القسم حالياً.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
