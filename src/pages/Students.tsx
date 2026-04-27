// src/pages/Students.tsx
import React, { useEffect, useState, useMemo, FC, PropsWithChildren, useCallback } from 'react';
import { supabase } from '../supabaseClient.ts';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronDown, User, Book, Phone, Edit, Trash2, AlertTriangle, X } from 'lucide-react';

// --- TYPES --- //
interface Student {
  id: string;
  full_name: string;
  birth_date: string | null;
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
    const { t } = useTranslation();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && student?.id) {
            const fetchHistory = async () => {
                setLoading(true);
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
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('attendance_history')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('student')}: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{student?.full_name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500 dark:text-slate-400">{t('loading')}</p>
                        </div>
                    ) : history.length > 0 ? (
                        <div className="space-y-4">
                            {history.map((record, index) => (
                                <div key={record.id || index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${record.status === 'present' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`} />
                                        <div>
                                            <p className="text-slate-900 dark:text-white font-bold">
                                                {record.status === 'present' ? t('present') : t('absent')} - {t('day')} {record.day_number} - {t('session')} {record.session_number}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                {record.month_year} | {new Date(record.created_at).toLocaleDateString('ar-DZ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{record.classes?.name}</p>
                                        <p className="text-[10px] text-slate-400 italic">{t('by')} {record.teachers?.full_name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400">{t('no_attendance_records')}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-center">
                    <button onClick={onClose} className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-bold">{t('close')}</button>
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
    const { t } = useTranslation();
    const [formData, setFormData] = useState<Partial<Student> | null>(null);
    const [modalSelectedTeacherId, setModalSelectedTeacherId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(student ? { ...student } : { full_name: '', birth_date: '', parent_name: '', parent_phone: '', class_id: null });
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
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{formData.id ? t('edit_student') : t('add_student')}</h3>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="sm:col-span-2"><FloatingLabelInput id="full_name" name="full_name" type="text" value={formData.full_name || ''} onChange={handleFormChange} label={t('full_name')} required /></div>
                            <div><FloatingLabelInput id="birth_date" name="birth_date" type="date" value={formData.birth_date || ''} onChange={handleFormChange} label={t('birth_date')} /></div>
                            <div><FloatingLabelInput id="parent_name" name="parent_name" type="text" value={formData.parent_name || ''} onChange={handleFormChange} label={t('parent_name')} /></div>
                            <div className="sm:col-span-2"><FloatingLabelInput id="parent_phone" name="parent_phone" type="text" value={formData.parent_phone || ''} onChange={handleFormChange} label={t('parent_phone')} /></div>
                            <div>
                                <select id="teacher_id" value={modalSelectedTeacherId || ''} onChange={handleTeacherChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-indigo-500">
                                    <option value="">{t('select_teacher')}</option>
                                    {teachers.map((t: Teacher) => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
                                </select>
                            </div>
                            <div>
                                <select name="class_id" id="class_id" value={formData.class_id || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-indigo-500">
                                    <option value="">{t('select_class')}</option>
                                    {(modalSelectedTeacherId ? teachers.find((t: Teacher) => t.id === modalSelectedTeacherId)?.classes : allClasses)?.map((c: Class) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-4 rounded-b-2xl border-t border-slate-100 dark:border-slate-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('cancel')}</button>
                        <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-500 transition-colors">{t('save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeleteConfirmModal = ({ isOpen, onClose, student, handleDelete }: any) => {
    const { t } = useTranslation();
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-auto transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} onClick={(e) => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('delete_student')}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('delete_student_message', { name: student?.full_name })}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-4 rounded-b-2xl border-t border-slate-100 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('cancel')}</button>
                    <button onClick={handleDelete} className="px-4 py-2 text-sm font-bold text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-500 transition-colors">{t('confirm_delete')}</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT --- //
export default function Students() {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student> | null>(null);

  // --- DATA FETCHING (Optimized with JOINs like Teachers.tsx) --- //
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all teachers with their classes (single query with JOIN)
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select(`id, full_name, class_teachers ( classes (id, name) )`);

      if (teachersError) throw teachersError;

      // 2. Fetch all students (single query)
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, birth_date, parent_name, parent_phone, class_id');

      if (studentsError) throw studentsError;

      // Transform teachers with nested classes
      const transformedTeachers = (teachersData || []).map((t: any) => ({
        id: t.id,
        full_name: t.full_name,
        classes: (t.class_teachers || [])
          .map((ct: any) => ct.classes)
          .filter(Boolean)
          .map((c: any) => ({
            ...c,
            students: (studentsData || []).filter((s: any) => s.class_id === c.id),
            teachers: []
          }))
      }));

      setTeachers(transformedTeachers);

      if (transformedTeachers.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(transformedTeachers[0].id);
      }

      // All classes with their students
      const classMap = new Map();
      (studentsData || []).forEach((s: any) => {
        if (s.class_id) {
          if (!classMap.has(s.class_id)) {
            classMap.set(s.class_id, []);
          }
          classMap.get(s.class_id).push(s);
        }
      });

      // Get unique classes from teachers' class_teachers
      const uniqueClasses = Array.from(
        new Map(
          transformedTeachers
            .flatMap((t: Teacher) => t.classes)
            .map((c: any) => [c.id, { ...c, students: classMap.get(c.id) || [] }])
        ).values()
      );

      setAllClasses(uniqueClasses);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(t('error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const openModal = useCallback((student: Partial<Student> | null = null) => {
    setCurrentStudent(student ? { ...student } : { full_name: '', birth_date: '', parent_name: '', parent_phone: '', class_id: null });
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
    const dataToSave = {
      full_name: studentData.full_name,
      birth_date: studentData.birth_date || null,
      parent_name: studentData.parent_name || null,
      parent_phone: studentData.parent_phone || null,
      class_id: studentData.class_id === '' ? null : studentData.class_id
    };

    if (studentData.id) {
      await supabase.from('students').update(dataToSave).eq('id', studentData.id);
    } else {
      await supabase.from('students').insert([dataToSave]);
    }

    closeModal();
    setSuccessMessage(t('student_saved_success'));
    setTimeout(() => setSuccessMessage(null), 3000);
    fetchData();
  }, [closeModal, fetchData, t]);

  const handleDelete = useCallback(async () => {
    if (!currentStudent?.id) return;
    const { error } = await supabase.from('students').delete().eq('id', currentStudent.id);
    if (error) {
      setError(t('error_deleting_student'));
    } else {
      closeDeleteConfirm();
      setSuccessMessage(t('student_deleted_success'));
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchData();
    }
  }, [currentStudent, closeDeleteConfirm, fetchData, t]);

  const selectedTeacher = useMemo(() => teachers.find(t => t.id === selectedTeacherId), [selectedTeacherId, teachers]);

  // --- RENDER --- //
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('students')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('manage_students_by_teachers')}</p>
          </div>
          <button onClick={() => openModal()} className="group flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all duration-300 transform hover:scale-110">
            <Plus className="w-6 h-6 text-white" />
          </button>
        </header>

        {/* Success & Error States */}
        {successMessage && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-3" role="alert">
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-3" role="alert">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
        {loading && <div className="text-center py-10 text-slate-400">{t('loading')}</div>}

        {/* Main Content */}
        {!loading && (
          <div>
            {/* Teacher Tabs */}
            {teachers.length > 0 && (
              <div className="flex items-center border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto scrollbar-hide">
                {teachers.map(teacher => (
                  <button key={teacher.id} onClick={() => setSelectedTeacherId(teacher.id)} className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors duration-300 relative ${selectedTeacherId === teacher.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
                    {teacher.full_name}
                    {selectedTeacherId === teacher.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />}
                  </button>
                ))}
              </div>
            )}

            {/* Student Accordions */}
            {selectedTeacher && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {selectedTeacher.classes.length > 0 ? (
                  selectedTeacher.classes.map(c => (
                    <AccordionItem key={c.id} title={c.name} subtitle={`${c.students.length} ${t('student').toLowerCase()}`}>
                      {c.students.length > 0 ? (
                        <>
                          {/* Desktop Table View */}
                          <div className="hidden sm:block">
                            <table className="min-w-full">
                              <thead className="border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('full_name')}</th>
                                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('parent_name')}</th>
                                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('birth_date')}</th>
                                  <th className="relative px-6 py-3"><span className="sr-only">{t('actions')}</span></th>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.parent_name || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.birth_date || '-'}</td>
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
                                  <span>{t('parent_name')}: {student.parent_name || '-'}</span>
                                </div>
                                {student.parent_phone && (
                                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-500 mt-1">
                                    <Phone className="w-4 h-4" />
                                    <span>{t('phone')}: {student.parent_phone}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : <p className="text-slate-400 text-sm p-6 text-center">{t('no_students_in_class')}</p>}
                    </AccordionItem>
                  ))
                ) : <p className="text-slate-400 text-sm p-6 text-center">{t('teacher_not_assigned')}</p>}
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
