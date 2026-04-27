// src/pages/Students.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient.ts';
import { useTranslation } from 'react-i18next';
import { Plus, Search, User, Phone, Book, Calendar, Edit, Trash2, AlertTriangle, X, Users, Filter } from 'lucide-react';

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
}

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
                        <div className="space-y-3">
                            {history.map((record, index) => (
                                <div key={record.id || index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${record.status === 'present' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <div>
                                            <p className="text-slate-900 dark:text-white font-bold text-sm">
                                                {record.status === 'present' ? t('present') : t('absent')} — {t('day')} {record.day_number} — {t('session')} {record.session_number}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {record.month_year} | {new Date(record.created_at).toLocaleDateString('ar-DZ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{record.classes?.name}</p>
                                        <p className="text-[10px] text-slate-400">{t('by')} {record.teachers?.full_name}</p>
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

const StudentModal = ({ isOpen, onClose, student, handleSubmit: handleParentSubmit, allClasses }: any) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<Partial<Student> | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(student ? { ...student } : { full_name: '', birth_date: '', parent_name: '', parent_phone: '', class_id: null });
        }
    }, [isOpen, student]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => (prev ? { ...prev, [name]: value } : null));
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
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-auto transition-all duration-300" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={localHandleSubmit}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{formData.id ? t('edit_student') : t('add_student')}</h3>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2"><FloatingLabelInput id="full_name" name="full_name" type="text" value={formData.full_name || ''} onChange={handleFormChange} label={t('full_name')} required /></div>
                            <div><FloatingLabelInput id="birth_date" name="birth_date" type="date" value={formData.birth_date || ''} onChange={handleFormChange} label={t('birth_date')} /></div>
                            <div><FloatingLabelInput id="parent_name" name="parent_name" type="text" value={formData.parent_name || ''} onChange={handleFormChange} label={t('parent_name')} /></div>
                            <div className="sm:col-span-2"><FloatingLabelInput id="parent_phone" name="parent_phone" type="text" value={formData.parent_phone || ''} onChange={handleFormChange} label={t('parent_phone')} /></div>
                            <div className="sm:col-span-2">
                                <select name="class_id" id="class_id" value={formData.class_id || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-indigo-500">
                                    <option value="">{t('select_class')}</option>
                                    {allClasses?.map((c: Class) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl border-t border-slate-100 dark:border-slate-700">
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
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('delete_student')}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('delete_student_message', { name: student?.full_name })}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl border-t border-slate-100 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('cancel')}</button>
                    <button onClick={handleDelete} className="px-4 py-2 text-sm font-bold text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-500 transition-colors">{t('confirm_delete')}</button>
                </div>
            </div>
        </div>
    );
};

// --- STUDENT CARD COMPONENT --- //
const StudentCard = ({ student, onEdit, onDelete, onHistory }: {
    student: Student;
    onEdit: () => void;
    onDelete: () => void;
    onHistory: () => void;
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-600 transition-all duration-300 overflow-hidden group">
            {/* Card Header */}
            <div className="bg-gradient-to-l from-indigo-600 to-indigo-500 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">{student.full_name}</h3>
                        {student.className && (
                            <p className="text-indigo-200 text-xs flex items-center gap-1 mt-0.5">
                                <Book className="w-3 h-3" /> {student.className}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onHistory} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors" title={t('attendance_history')}>
                        <Calendar className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={onEdit} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors" title={t('edit')}>
                        <Edit className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={onDelete} className="w-8 h-8 bg-red-500/60 hover:bg-red-500 rounded-lg flex items-center justify-center transition-colors" title={t('delete')}>
                        <Trash2 className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            {/* Card Body */}
            <div className="p-5 space-y-3">
                {student.parent_name && (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{t('parent_name')}</p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{student.parent_name}</p>
                        </div>
                    </div>
                )}

                {student.parent_phone && (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{t('phone')}</p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 direction-ltr text-right">{student.parent_phone}</p>
                        </div>
                    </div>
                )}

                {student.birth_date && (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{t('birth_date')}</p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{student.birth_date}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT --- //
export default function Students() {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<Class[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<any>(null);

  // --- DATA FETCHING --- //
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all classes with teachers
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`id, name, class_teachers ( teachers (id, full_name) )`);

      if (classesError) throw classesError;

      // 2. Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, birth_date, parent_name, parent_phone, class_id');

      if (studentsError) throw studentsError;

      // Transform: classes with their students
      const classesWithStudents = (classesData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        students: (studentsData || []).filter((s: any) => s.class_id === c.id),
        teachers: (c.class_teachers || []).map((ct: any) => ct.teachers).filter(Boolean)
      }));

      // Add className to each student for display
      const studentsWithClassName = (studentsData || []).map((s: any) => {
        const cls = classesWithStudents.find((c: any) => c.id === s.class_id);
        return { ...s, className: cls?.name || '' };
      });

      setAllClasses(classesWithStudents);
      if (classesWithStudents.length > 0 && !selectedClassId) {
        setSelectedClassId(null); // "All" by default
      }

      // Set students with className attached
      setClasses(studentsWithClassName);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(t('error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const openModal = useCallback((student: any = null) => {
    setCurrentStudent(student ? { ...student } : { full_name: '', birth_date: '', parent_name: '', parent_phone: '', class_id: null });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const openDeleteConfirm = useCallback((student: any) => {
    setCurrentStudent(student);
    setIsDeleteConfirmOpen(true);
  }, []);
  const closeDeleteConfirm = useCallback(() => setIsDeleteConfirmOpen(false), []);

  const openHistory = useCallback((student: any) => {
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

  // Filter students by class and search
  const filteredStudents = useMemo(() => {
    let result = classes;

    // Class filter
    if (selectedClassId) {
      result = result.filter((s: any) => s.class_id === selectedClassId);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s: any) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.parent_name && s.parent_name.toLowerCase().includes(q)) ||
        (s.parent_phone && s.parent_phone.includes(q))
      );
    }

    return result;
  }, [classes, selectedClassId, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = classes.length;
    const withPhone = classes.filter((s: any) => s.parent_phone).length;
    const noPhone = total - withPhone;
    return { total, withPhone, noPhone };
  }, [classes]);

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

        {/* Success & Error */}
        {successMessage && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-3">
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">{t('loading')}</p>
          </div>
        )}

        {/* Main Content */}
        {!loading && (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('total_students')}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.withPhone}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('with_phone')}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Phone className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-500">{stats.noPhone}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('without_phone')}</p>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`${t('search_student')}...`}
                  className="w-full pr-10 pl-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Class Filter */}
              <div className="relative min-w-[180px]">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <select
                  value={selectedClassId || ''}
                  onChange={(e) => setSelectedClassId(e.target.value || null)}
                  className="w-full appearance-none pr-10 pl-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                >
                  <option value="">{t('all_classes')}</option>
                  {allClasses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.students.length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Cards Grid */}
            {filteredStudents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStudents.map((student: any) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    onEdit={() => openModal(student)}
                    onDelete={() => openDeleteConfirm(student)}
                    onHistory={() => openHistory(student)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">{searchQuery ? t('no_students_match_search') : t('no_students_in_class')}</p>
                <button onClick={() => openModal()} className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors">
                  {t('add_student')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <StudentModal isOpen={isModalOpen} onClose={closeModal} student={currentStudent} handleSubmit={handleSubmit} allClasses={allClasses} />
      <DeleteConfirmModal isOpen={isDeleteConfirmOpen} onClose={closeDeleteConfirm} student={currentStudent} handleDelete={handleDelete} />
      <AttendanceHistoryModal isOpen={isHistoryModalOpen} onClose={closeHistory} student={currentStudent} />
    </div>
  );
}
