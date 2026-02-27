// src/pages/Students.tsx
import React, { useEffect, useState, useMemo, FC, PropsWithChildren, useCallback } from 'react';
import { supabase } from '../supabaseClient.ts';
import { Plus, ChevronDown, User, Book, Phone, Edit, Trash2, AlertTriangle, X } from 'lucide-react';

// --- TYPES --- //
interface Student {
  id: string;
  full_name: string;
  parent_name: string;
  parent_phone: string;
  class_id: string | null;
}

interface Class {
  id: string;
  name: string;
  students: Student[];
  teachers: { id: string; full_name: string }[];
}

interface Teacher {
  id: string;
  full_name: string;
  classes: Class[];
}

// --- UI COMPONENTS --- //
const AccordionItem: FC<PropsWithChildren<{ title: string; subtitle: string }>> = ({ title, subtitle, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-right p-4 flex justify-between items-center transition-colors duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                        <Book className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white">{title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="pb-4 px-4 bg-slate-50/50 dark:bg-slate-900/20">{children}</div>}
        </div>
    );
};

// --- MODAL COMPONENTS --- //
const AttendanceHistoryModal = ({ isOpen, onClose, student }: any) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && student?.id) {
            const fetchHistory = async () => {
                setLoading(true);
                // FIX: Use a single query with joins instead of 3 separate DB calls
                const { data, error } = await supabase
                    .from('attendances')
                    .select('*, classes:class_id(id, name), teachers:teacher_id(id, full_name)')
                    .eq('student_id', student.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching history:', error);
                    setHistory([]);
                } else {
                    setHistory(data || []);
                }
                setLoading(false);
            };
            fetchHistory();
        }
    }, [isOpen, student]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">سجل الحضور والغياب</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">للطالب: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{student?.full_name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500 dark:text-slate-400">جاري تحميل السجل...</p>
                        </div>
                    ) : history.length > 0 ? (
                        <div className="space-y-4">
                            {history.map((record, index) => (
                                <div key={record.id || index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${record.status === 'present' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`} />
                                        <div>
                                            <p className="text-slate-900 dark:text-white font-bold">
                                                {record.status === 'present' ? 'حاضر' : 'غائب'} - اليوم {record.day_number} - الحصة {record.session_number}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                {record.month_year} | {new Date(record.created_at).toLocaleDateString('ar-DZ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{record.classes?.name}</p>
                                        <p className="text-[10px] text-slate-400 italic">بواسطة: {record.teachers?.full_name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400">لا يوجد سجل حضور مسجل لهذا الطالب بعد.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-center">
                    <button onClick={onClose} className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-bold">إغلاق</button>
                </div>
            </div>
        </div>
    );
};

const FloatingLabelInput = ({ id, name, type, value, onChange, label, required }: any) => (
    <div className="relative">
        <input id={id} name={name} type={type} value={value} onChange={onChange} placeholder=" " required={required} className="block px-3.5 pb-2.5 pt-4 w-full text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 appearance-none focus:outline-none focus:ring-0 focus:border-indigo-500 peer" />
        <label htmlFor={id} className="absolute text-sm text-slate-500 dark:text-slate-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-slate-900 px-2 peer-focus:px-2 peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1">
            {label}
        </label>
    </div>
);

const StudentModal = ({ isOpen, onClose, student, handleSubmit: handleParentSubmit, teachers, allClasses }: any) => {
    const [formData, setFormData] = useState<Partial<Student> | null>(null);
    const [modalSelectedTeacherId, setModalSelectedTeacherId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(student ? { ...student } : { full_name: '', parent_name: '', parent_phone: '', class_id: null });
            if (student?.class_id) {
                const teacher = teachers.find((t: Teacher) => t.classes.some((c: Class) => c.id === student.class_id));
                if (teacher) {
                    setModalSelectedTeacherId(teacher.id);
                }
            } else {
                setModalSelectedTeacherId(null);
            }
        }
    }, [isOpen, student, teachers]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => (prev ? { ...prev, [name]: value } : null));
    };

    const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const teacherId = e.target.value;
        setModalSelectedTeacherId(teacherId);
        setFormData(prev => (prev ? { ...prev, class_id: '' } : null));
    };

    const localHandleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            handleParentSubmit(formData);
        }
    };

    if (!isOpen || !formData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-auto transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} onClick={(e) => e.stopPropagation()}>
                <form onSubmit={localHandleSubmit}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{formData.id ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="sm:col-span-2"><FloatingLabelInput id="full_name" name="full_name" type="text" value={formData.full_name || ''} onChange={handleFormChange} label="الاسم الكامل" required /></div>
                            <div><FloatingLabelInput id="parent_name" name="parent_name" type="text" value={formData.parent_name || ''} onChange={handleFormChange} label="اسم ولي الأمر" /></div>
                            <div><FloatingLabelInput id="parent_phone" name="parent_phone" type="text" value={formData.parent_phone || ''} onChange={handleFormChange} label="هاتف ولي الأمر" /></div>
                            <div>
                                <select id="teacher_id" value={modalSelectedTeacherId || ''} onChange={handleTeacherChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-indigo-500">
                                    <option value="">اختر مدرساً</option>
                                    {teachers.map((t: Teacher) => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
                                </select>
                            </div>
                            <div>
                                <select name="class_id" id="class_id" value={formData.class_id || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-indigo-500">
                                    <option value="">اختر صفاً</option>
                                    {(modalSelectedTeacherId ? teachers.find((t: Teacher) => t.id === modalSelectedTeacherId)?.classes : allClasses)?.map((c: Class) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-4 rounded-b-2xl border-t border-slate-100 dark:border-slate-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">إلغاء</button>
                        <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-500 transition-colors">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeleteConfirmModal = ({ isOpen, onClose, student, handleDelete }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-auto transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} onClick={(e) => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">حذف الطالب</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">هل أنت متأكد أنك تريد حذف الطالب "{student?.full_name}"؟ لا يمكن التراجع عن هذا الإجراء.</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-4 rounded-b-2xl border-t border-slate-100 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">إلغاء</button>
                    <button onClick={handleDelete} className="px-4 py-2 text-sm font-bold text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-500 transition-colors">تأكيد الحذف</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT --- //
export default function Students() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student> | null>(null);

  // --- DATA FETCHING & LOGIC (Unchanged) --- //
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('id, full_name');
      
      if (teachersError) throw teachersError;

      // 2. Fetch all classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name');
      
      if (classesError) throw classesError;

      // 3. Fetch class-teacher assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('class_teachers')
        .select('teacher_id, class_id');
      
      if (assignmentsError) throw assignmentsError;

      // 4. Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, parent_name, parent_phone, class_id');
      
      if (studentsError) throw studentsError;

      // 5. Transform data into the structure expected by the component
      const transformedTeachers = (teachersData || []).map(t => {
        const teacherClassIds = (assignmentsData || [])
          .filter(a => a.teacher_id === t.id)
          .map(a => a.class_id);
        
        const teacherClasses = (classesData || [])
          .filter(c => teacherClassIds.includes(c.id))
          .map(c => ({
            ...c,
            students: (studentsData || []).filter(s => s.class_id === c.id),
            teachers: [] // Not strictly needed for the accordion
          }));

        return {
          id: t.id,
          full_name: t.full_name,
          classes: teacherClasses
        };
      });

      setTeachers(transformedTeachers);

      if (transformedTeachers.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(transformedTeachers[0].id);
      }

      const transformedClasses = (classesData || []).map(c => ({
        ...c,
        students: (studentsData || []).filter(s => s.class_id === c.id),
        teachers: []
      }));
      
      setAllClasses(transformedClasses);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('لا يمكن تحميل البيانات. الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = useCallback((student: Partial<Student> | null = null) => {
    setCurrentStudent(student ? { ...student } : { full_name: '', parent_name: '', parent_phone: '', class_id: null });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const openDeleteConfirm = useCallback((student: Student) => {
    setCurrentStudent(student);
    setIsDeleteConfirmOpen(true);
  }, []);
  const closeDeleteConfirm = useCallback(() => setIsDeleteConfirmOpen(false), []);

  const openHistory = useCallback((student: Student) => {
    setCurrentStudent(student);
    setIsHistoryModalOpen(true);
  }, []);

  const closeHistory = useCallback(() => setIsHistoryModalOpen(false), []);

  

  const handleSubmit = useCallback(async (studentData: Partial<Student>) => {
    const dataToSave = { full_name: studentData.full_name, parent_name: studentData.parent_name || null, parent_phone: studentData.parent_phone || null, class_id: studentData.class_id === '' ? null : studentData.class_id };
    const { error } = studentData.id ? await supabase.from('students').update(dataToSave).eq('id', studentData.id) : await supabase.from('students').insert([dataToSave]);

    if (error) {
      console.error('Error saving student:', error);
      setError(`حدث خطأ: ${error.message}`);
    } else {
      closeModal();
      fetchData();
    }
  }, [closeModal, fetchData]);

  const handleDelete = useCallback(async () => {
    if (!currentStudent?.id) return;
    const { error } = await supabase.from('students').delete().eq('id', currentStudent.id);
    if (error) {
      console.error('Error deleting student:', error);
      setError('حدث خطأ أثناء حذف الطالب.');
    } else {
      closeDeleteConfirm();
      fetchData();
    }
  }, [currentStudent, closeDeleteConfirm, fetchData]);

  const selectedTeacher = useMemo(() => teachers.find(t => t.id === selectedTeacherId), [selectedTeacherId, teachers]);

  // --- RENDER --- //
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">الطلاب</h1>
            <p className="text-slate-500 dark:text-slate-400">إدارة الطلاب حسب المدرسين والصفوف</p>
          </div>
          <button onClick={() => openModal()} className="group flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all duration-300 transform hover:scale-110">
            <Plus className="w-6 h-6 text-white" />
          </button>
        </header>

        {/* Loading and Error States */}
        {loading && <div className="text-center py-10 text-slate-400">جاري تحميل البيانات...</div>}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-4" role="alert">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <div>
            {/* Teacher Tabs */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto scrollbar-hide">
              {teachers.map(teacher => (
                <button key={teacher.id} onClick={() => setSelectedTeacherId(teacher.id)} className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors duration-300 relative ${selectedTeacherId === teacher.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
                  {teacher.full_name}
                  {selectedTeacherId === teacher.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />} 
                </button>
              ))}
            </div>

            {/* Student Accordions */}
            {selectedTeacher && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {selectedTeacher.classes.length > 0 ? (
                  selectedTeacher.classes.map(c => (
                    <AccordionItem key={c.id} title={c.name} subtitle={`${c.students.length} طالب`}>
                      {c.students.length > 0 ? (
                        <>
                          {/* Desktop Table View */}
                          <div className="hidden sm:block">
                            <table className="min-w-full">
                              <thead className="border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">الاسم الكامل</th>
                                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">اسم ولي الأمر</th>
                                  <th className="relative px-6 py-3"><span className="sr-only">إجراءات</span></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {c.students.map(student => (
                                  <tr key={student.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors duration-200">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                        <button 
                                            onClick={() => openHistory(student)}
                                            className="text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-right w-full"
                                        >
                                            {student.full_name}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.parent_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                      <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <button onClick={() => openModal(student)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => openDeleteConfirm(student)} className="text-red-600 dark:text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Card View */}
                          <div className="sm:hidden space-y-3 pt-2">
                            {c.students.map(student => (
                              <div key={student.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-start mb-2">
                                  <button onClick={() => openHistory(student)} className="text-slate-900 dark:text-white font-bold text-lg text-right">
                                    {student.full_name}
                                  </button>
                                  <div className="flex gap-3">
                                    <button onClick={() => openModal(student)} className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400"><Edit className="w-5 h-5" /></button>
                                    <button onClick={() => openDeleteConfirm(student)} className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400"><Trash2 className="w-5 h-5" /></button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                  <User className="w-4 h-4" />
                                  <span>ولي الأمر: {student.parent_name || 'غير مسجل'}</span>
                                </div>
                                {student.parent_phone && (
                                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-500 mt-1">
                                    <Phone className="w-4 h-4" />
                                    <span>الهاتف: {student.parent_phone}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : <p className="text-slate-400 text-sm p-6 text-center">لا يوجد طلاب في هذا الصف.</p>}
                    </AccordionItem>
                  ))
                ) : <p className="text-slate-400 text-sm p-6 text-center">هذا المدرس غير معين لأي صف.</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <StudentModal isOpen={isModalOpen} onClose={closeModal} student={currentStudent} handleSubmit={handleSubmit} teachers={teachers} allClasses={allClasses} />
      <DeleteConfirmModal isOpen={isDeleteConfirmOpen} onClose={closeDeleteConfirm} student={currentStudent} handleDelete={handleDelete} />
      <AttendanceHistoryModal isOpen={isHistoryModalOpen} onClose={closeHistory} student={currentStudent} />
    </div>
  );
}
