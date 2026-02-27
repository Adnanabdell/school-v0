// src/pages/Subjects.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.ts';

// Define the type for a Subject
interface Subject {
  id: string;
  name: string;
  coefficient: number | null;
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({});

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw error;
      setSubjects(data as Subject[]);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      setError('لا يمكن تحميل المواد. الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (subject: Subject | null = null) => {
    setCurrentSubject(subject || {});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentSubject({});
  };

  const openDeleteConfirm = (subject: Subject) => {
    setCurrentSubject(subject);
    setIsDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setCurrentSubject({});
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentSubject({ ...currentSubject, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const subjectData = {
      name: currentSubject.name,
      coefficient: currentSubject.coefficient,
    };

    try {
      if (currentSubject.id) {
        // Update existing subject
        const { error } = await supabase.from('subjects').update(subjectData).eq('id', currentSubject.id);
        if (error) throw error;
      } else {
        // Create new subject
        const { error } = await supabase.from('subjects').insert([subjectData]);
        if (error) throw error;
      }
      closeModal();
      fetchSubjects();
      setSuccessMessage('تم حفظ بيانات المادة بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving subject:', error);
      setError('حدث خطأ أثناء حفظ بيانات المادة.');
    }
  };

  const handleDelete = async () => {
    if (!currentSubject.id) return;
    const { error } = await supabase.from('subjects').delete().eq('id', currentSubject.id);
    if (error) {
      console.error('Error deleting subject:', error);
      setError('حدث خطأ أثناء حذف المادة.');
    } else {
      closeDeleteConfirm();
      fetchSubjects();
      setSuccessMessage('تم حذف المادة بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إدارة المواد</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">إدارة المواد الدراسية ومعاملاتها</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-lg shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
        >
          إضافة مادة جديدة
        </button>
      </div>

      {loading && <p className="text-center py-10 text-slate-500 dark:text-slate-400">جاري تحميل البيانات...</p>}
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg relative mb-4" role="alert">{error}</div>}
      {successMessage && <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-lg relative mb-4" role="alert">{successMessage}</div>}

      {!loading && !error && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">اسم المادة</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">المعامل</th>
                  <th className="px-6 py-4 text-relative"><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700">
                {subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">{subject.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-medium">{subject.coefficient}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right space-x-4 space-x-reverse">
                      <button onClick={() => openModal(subject)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">تعديل</button>
                      <button onClick={() => openDeleteConfirm(subject)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors">حذف</button>
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{currentSubject.id ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المادة</label>
                  <input type="text" name="name" id="name" value={currentSubject.name || ''} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5" />
                </div>
                <div>
                  <label htmlFor="coefficient" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">المعامل</label>
                  <input type="number" name="coefficient" id="coefficient" value={currentSubject.coefficient || ''} onChange={handleFormChange} className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5" />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">إلغاء</button>
                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && currentSubject && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">حذف المادة</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">هل أنت متأكد أنك تريد حذف المادة "{currentSubject.name}"؟</p>
              <div className="mt-8 flex justify-end gap-3">
                <button onClick={closeDeleteConfirm} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">إلغاء</button>
                <button onClick={handleDelete} className="px-6 py-2 text-sm font-bold text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all">تأكيد الحذف</button>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}
