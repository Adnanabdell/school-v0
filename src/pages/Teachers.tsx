// src/pages/Teachers.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.ts';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

// Define types for our data objects
interface Class {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  full_name: string;
  phone: string;
  classes: Class[];
}

// This type is used for managing the state of the modal form
interface CurrentTeacher extends Partial<Teacher> {
    selected_classes?: string[];
}

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  // State for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<CurrentTeacher | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const { data: teachersData, error: teachersError } = await supabase.from('teachers').select(`
        id, full_name, phone,
        class_teachers ( classes (id, name) )
      `);
      if (teachersError) throw teachersError;

      const transformedTeachers = (teachersData as any[]).map(t => ({
        ...t,
        classes: t.class_teachers.map((ct: any) => ct.classes).filter(Boolean)
      }));
      setTeachers(transformedTeachers as Teacher[]);

      const { data: classesData, error: classesError } = await supabase.from('classes').select('id, name');
      if (classesError) throw classesError;
      setAllClasses(classesData as Class[]);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('لا يمكن تحميل البيانات. الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (teacher: Teacher | null = null) => {
    if (teacher) {
      setCurrentTeacher({ ...teacher, selected_classes: teacher.classes.map(c => c.id) });
    } else {
      setCurrentTeacher({ full_name: '', phone: '', selected_classes: [] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentTeacher(null);
  };

  const openDeleteConfirm = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
    setIsDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setCurrentTeacher(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentTeacher) {
        setCurrentTeacher({ ...currentTeacher, [e.target.name]: e.target.value });
    }
  };

  const handleClassSelectionChange = (classId: string) => {
    if (currentTeacher) {
        const selected = currentTeacher.selected_classes || [];
        const newSelected = selected.includes(classId)
            ? selected.filter(id => id !== classId)
            : [...selected, classId];
        setCurrentTeacher({ ...currentTeacher, selected_classes: newSelected });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeacher) return;

    const teacherData = {
      full_name: currentTeacher.full_name,
      phone: currentTeacher.phone,

    };

    try {
        let teacherId = currentTeacher.id;

        if (teacherId) {
            const { error } = await supabase.from('teachers').update(teacherData).eq('id', teacherId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('teachers').insert([teacherData]).select();
            if (error) throw error;
            teacherId = data![0].id;
        }

        const selected = currentTeacher.selected_classes || [];
        const { error: deleteError } = await supabase.from('class_teachers').delete().eq('teacher_id', teacherId);
        if (deleteError) throw deleteError;

        if (selected.length > 0) {
            const newAssignments = selected.map(classId => ({ teacher_id: teacherId, class_id: classId }));
            const { error: insertError } = await supabase.from('class_teachers').insert(newAssignments);
            if (insertError) throw insertError;
        }

        closeModal();
        fetchData();
        setSuccessMessage('تم حفظ بيانات المدرس بنجاح');
        setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
        console.error('Error saving teacher:', error);
        setError('حدث خطأ أثناء حفظ بيانات المدرس.');
    }
  };

  const handleDelete = async () => {
    if (!currentTeacher || !currentTeacher.id) return;
    const { error } = await supabase.from('teachers').delete().eq('id', currentTeacher.id);
    if (error) {
      console.error('Error deleting teacher:', error);
      setError('حدث خطأ أثناء حذف المدرس.');
    } else {
      closeDeleteConfirm();
      fetchData();
    }
  };

    return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('manage_teachers')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">إدارة طاقم التدريس وتعيين الصفوف</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-lg shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
        >
          {t('add_new_teacher')}
        </button>
      </div>

      {loading && <p className="text-center py-10 text-slate-500 dark:text-slate-400">{t('loading')}</p>}
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg relative mb-4" role="alert">{error}</div>}
      {successMessage && <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-lg relative mb-4" role="alert">{successMessage}</div>}

      {!loading && !error && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('full_name')}</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('phone')}</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('assigned_classes')}</th>
                  <th className="px-6 py-4 text-relative"><span className="sr-only">{t('actions')}</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">{teacher.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{teacher.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {teacher.classes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.classes.map(c => (
                            <span key={c.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                              {c.name}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-slate-400 dark:text-slate-600 italic">{t('not_assigned')}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right space-x-4 space-x-reverse">
                      <button onClick={() => openModal(teacher)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">{t('edit')}</button>
                      <button onClick={() => openDeleteConfirm(teacher)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors">{t('delete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && currentTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-auto border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{currentTeacher.id ? t('edit_teacher_info') : t('add_teacher_info')}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('full_name')}</label>
                  <input type="text" name="full_name" id="full_name" value={currentTeacher.full_name || ''} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('phone_number')}</label>
                  <input type="text" name="phone" id="phone" value={currentTeacher.phone || ''} onChange={handleFormChange} className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('classes_label')}</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                      {allClasses.map((c) => (
                          <label key={c.id} className="flex items-center space-x-3 space-x-reverse cursor-pointer p-2 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <input 
                                  type="checkbox" 
                                  checked={(currentTeacher.selected_classes || []).includes(c.id)}
                                  onChange={() => handleClassSelectionChange(c.id)}
                                  className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{c.name}</span>
                          </label>
                      ))}
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('cancel')}</button>
                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && currentTeacher && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">{t('delete_teacher_confirm')}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">{t('delete_teacher_message', { name: currentTeacher.full_name })}</p>
              <div className="mt-8 flex justify-center gap-3">
                <button onClick={closeDeleteConfirm} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('cancel')}</button>
                <button onClick={handleDelete} className="px-6 py-2 text-sm font-bold text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all">{t('confirm_delete')}</button>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}
