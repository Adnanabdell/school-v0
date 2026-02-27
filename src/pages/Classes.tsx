// src/pages/Classes.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.ts';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

// Define types for our data objects
interface Class {
  id: string;
  name: string;
  // This field will be populated by a join query
  teachers: { id: string; full_name: string }[];
}

interface Teacher {
  id: string;
  full_name: string;
}

// This represents the data structure for the modal form
interface CurrentClass extends Partial<Omit<Class, 'teachers'>> {
    selected_teachers?: string[];
}

export default function Classes() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  // State for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState<CurrentClass>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Fetch all teachers first
      const { data: teachersData, error: teachersError } = await supabase.from('teachers').select('id, full_name');
      if (teachersError) throw teachersError;
      setAllTeachers(teachersData as Teacher[]);

      // Fetch all classes and their associated teachers
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          class_teachers ( teachers ( id, full_name ) )
        `);

      if (classesError) throw classesError;

      // The data from Supabase has a nested structure. We need to transform it.
      const transformedData = (classesData as any[]).map(c => {
        return {
          id: c.id,
          name: c.name,
          // Extract the teacher objects from the nested structure
          teachers: c.class_teachers.map((ct: any) => ct.teachers).filter(Boolean)
        };
      });

      setClasses(transformedData as Class[]);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('لا يمكن تحميل البيانات. الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (classItem: Class | null = null) => {
    if (classItem) {
        // If editing, populate the form with existing class data
        // and pre-select the teachers assigned to this class.
        const selectedTeacherIds = classItem.teachers.map(t => t.id);
        setCurrentClass({ ...classItem, selected_teachers: selectedTeacherIds });
    } else {
        // If adding a new class, the form is empty.
        setCurrentClass({ name: '', selected_teachers: [] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentClass({});
  };

  const openDeleteConfirm = (classItem: Class) => {
    setCurrentClass(classItem);
    setIsDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setCurrentClass({});
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentClass({ ...currentClass, [e.target.name]: e.target.value });
  };

  const handleTeacherSelectionChange = (teacherId: string) => {
    const currentSelection = currentClass.selected_teachers || [];
    const newSelection = currentSelection.includes(teacherId)
      ? currentSelection.filter(id => id !== teacherId)
      : [...currentSelection, teacherId];
    setCurrentClass({ ...currentClass, selected_teachers: newSelection });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const classData = {
      name: currentClass.name,

    };

    try {
        let classId = currentClass.id;

        // Step 1: Create or Update the class itself
        if (classId) {
            // Update existing class
            const { error } = await supabase.from('classes').update(classData).eq('id', classId);
            if (error) throw error;
        } else {
            // Create new class and get its ID
            const { data, error } = await supabase.from('classes').insert([classData]).select('id');
            if (error || !data) throw error || new Error('Failed to create class');
            classId = data[0].id;
        }

        // Step 2: Manage teacher assignments in the junction table
        if (classId) {
            // First, remove all existing teacher assignments for this class
            const { error: deleteError } = await supabase.from('class_teachers').delete().eq('class_id', classId);
            if (deleteError) throw deleteError;

            // Then, add the new assignments based on the selection
            const selectedTeachers = currentClass.selected_teachers || [];
            if (selectedTeachers.length > 0) {
                const newAssignments = selectedTeachers.map(teacherId => ({ class_id: classId, teacher_id: teacherId }));
                const { error: insertError } = await supabase.from('class_teachers').insert(newAssignments);
                if (insertError) throw insertError;
            }
        }

        closeModal();
        fetchData(); // Refresh all data
        setSuccessMessage('تم حفظ بيانات الصف بنجاح');
        setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving class:', error);
      setError('حدث خطأ أثناء حفظ بيانات الصف.');
    }
  };

  const handleDelete = async () => {
    if (!currentClass.id) return;

    // The database is set up with ON DELETE CASCADE,
    // so deleting a class will automatically remove its entries
    // from the 'class_teachers' junction table.
    const { error } = await supabase.from('classes').delete().eq('id', currentClass.id);

    if (error) {
      console.error('Error deleting class:', error);
      setError('حدث خطأ أثناء حذف الصف.');
    } else {
      closeDeleteConfirm();
      fetchData();
    }
  };

    return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('manage_classes')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">إدارة الفصول الدراسية وتعيين المدرسين</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-lg shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
        >
          {t('add_new_class')}
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
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('class_name')}</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('teachers')}</th>
                  <th className="px-6 py-4 text-relative"><span className="sr-only">{t('actions')}</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700">
                {classes.map((classItem) => (
                  <tr key={classItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">{classItem.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {classItem.teachers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {classItem.teachers.map(t => (
                            <span key={t.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                              {t.full_name}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-slate-400 dark:text-slate-600 italic">{t('not_assigned')}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right space-x-4 space-x-reverse">
                      <button onClick={() => openModal(classItem)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">{t('edit')}</button>
                      <button onClick={() => openDeleteConfirm(classItem)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors">{t('delete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-auto border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{currentClass.id ? t('edit_class_info') : t('add_class_info')}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6">
                  <div>
                      <label htmlFor="name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('class_name')}</label>
                      <input type="text" name="name" id="name" value={currentClass.name || ''} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5" />
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('teachers_label')}</label>
                      <div className="mt-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg h-48 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                          {allTeachers.map(teacher => (
                              <div key={teacher.id} className="flex items-center p-2 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors">
                                  <input
                                      id={`teacher-${teacher.id}`}
                                      type="checkbox"
                                      checked={currentClass.selected_teachers?.includes(teacher.id) || false}
                                      onChange={() => handleTeacherSelectionChange(teacher.id)}
                                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <label htmlFor={`teacher-${teacher.id}`} className="mr-3 block text-sm text-slate-700 dark:text-slate-300 font-medium">
                                      {teacher.full_name}
                                  </label>
                              </div>
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
      {isDeleteConfirmOpen && currentClass && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">{t('delete_class_confirm')}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">{t('delete_class_message', { name: currentClass.name })}</p>
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
