// src/pages/StudentsImproved.tsx
import { useState } from 'react';
import { Plus, Edit, Trash2, User, Phone, Search, BookOpen } from 'lucide-react';
import { useStudents, useAddStudent, useUpdateStudent, useDeleteStudent } from '../hooks/useStudents';
import { studentSchema, type StudentFormData } from '../utils/validationSchemas';
import { validateData } from '../utils/validationSchemas';
import { showError } from '../utils/errorHandler';
import { useSchoolStore } from '../stores/useSchoolStore';

export default function StudentsImproved() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [formData, setFormData] = useState<StudentFormData>({
    full_name: '',
    parent_name: '',
    parent_phone: '',
    class_id: ''
  });

  // Hooks
  const { data: students = [], isLoading } = useStudents();
  const { classes, fetchClasses } = useSchoolStore();
  const addStudentMutation = useAddStudent();
  const updateStudentMutation = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();

  // Load classes on mount
  useState(() => {
    if (classes.length === 0) {
      fetchClasses();
    }
  });

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.parent_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassId === 'all' || student.class_id === selectedClassId;
    return matchesSearch && matchesClass;
  });

  // Group by class
  const studentsByClass = filteredStudents.reduce((acc, student) => {
    const className = student.classes?.name || 'بدون صف';
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(student);
    return acc;
  }, {} as Record<string, typeof students>);

  const openModal = (student?: any) => {
    if (student) {
      setCurrentStudent(student);
      setFormData({
        full_name: student.full_name,
        parent_name: student.parent_name,
        parent_phone: student.parent_phone || '',
        class_id: student.class_id
      });
    } else {
      setCurrentStudent(null);
      setFormData({
        full_name: '',
        parent_name: '',
        parent_phone: '',
        class_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentStudent(null);
    setFormData({
      full_name: '',
      parent_name: '',
      parent_phone: '',
      class_id: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate data
    const validation = validateData(studentSchema, formData);
    if (!validation.success) {
      validation.errors?.forEach(error => showError({ message: error }));
      return;
    }

    if (currentStudent) {
      // Update
      await updateStudentMutation.mutateAsync({
        id: currentStudent.id,
        data: validation.data!
      });
    } else {
      // Create
      await addStudentMutation.mutateAsync(validation.data!);
    }

    closeModal();
  };

  const handleDelete = async (studentId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      await deleteStudentMutation.mutateAsync(studentId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">الطلاب</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              إجمالي الطلاب: {students.length}
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة طالب</span>
          </button>
        </header>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن طالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          >
            <option value="all">جميع الصفوف</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        {/* Students List */}
        {Object.keys(studentsByClass).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(studentsByClass).map(([className, classStudents]) => (
              <div key={className} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white">{className}</h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      ({classStudents.length} طالب)
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {classStudents.map(student => (
                    <div
                      key={student.id}
                      className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                              {student.full_name}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-1">
                              <User className="w-4 h-4" />
                              ولي الأمر: {student.parent_name}
                            </p>
                            {student.parent_phone && (
                              <p className="text-sm text-slate-500 dark:text-slate-500 flex items-center gap-2 mt-1">
                                <Phone className="w-4 h-4" />
                                {student.parent_phone}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openModal(student)}
                            className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">لا توجد نتائج</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {currentStudent ? 'تعديل الطالب' : 'إضافة طالب جديد'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  اسم ولي الأمر *
                </label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  placeholder="0555123456"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  الصف *
                </label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">اختر الصف</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={addStudentMutation.isPending || updateStudentMutation.isPending}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(addStudentMutation.isPending || updateStudentMutation.isPending) ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
