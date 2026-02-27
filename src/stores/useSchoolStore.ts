// src/stores/useSchoolStore.ts
import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { showError, showSuccess } from '../utils/errorHandler';

interface Student {
  id: string;
  full_name: string;
  parent_name: string;
  parent_phone: string;
  class_id: string | null;
  created_at?: string;
}

interface Teacher {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  user_id?: string;
}

interface Class {
  id: string;
  name: string;
  level?: string;
  capacity?: number;
}

interface SchoolStore {
  // State
  students: Student[];
  teachers: Teacher[];
  classes: Class[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchStudents: () => Promise<void>;
  fetchTeachers: () => Promise<void>;
  fetchClasses: () => Promise<void>;
  addStudent: (student: Omit<Student, 'id'>) => Promise<Student | null>;
  updateStudent: (id: string, student: Partial<Student>) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<Teacher | null>;
  updateTeacher: (id: string, teacher: Partial<Teacher>) => Promise<boolean>;
  deleteTeacher: (id: string) => Promise<boolean>;
  addClass: (classData: Omit<Class, 'id'>) => Promise<Class | null>;
  updateClass: (id: string, classData: Partial<Class>) => Promise<boolean>;
  deleteClass: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useSchoolStore = create<SchoolStore>((set, get) => ({
  // Initial State
  students: [],
  teachers: [],
  classes: [],
  loading: false,
  error: null,

  // Students Actions
  fetchStudents: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ students: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
    }
  },

  addStudent: async (student) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('students')
        .insert(student)
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({
        students: [data, ...state.students],
        loading: false
      }));
      
      showSuccess('تم إضافة الطالب بنجاح');
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
      return null;
    }
  },

  updateStudent: async (id, student) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('students')
        .update(student)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        students: state.students.map((s) =>
          s.id === id ? { ...s, ...student } : s
        ),
        loading: false
      }));

      showSuccess('تم تحديث بيانات الطالب بنجاح');
      return true;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
      return false;
    }
  },

  deleteStudent: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        students: state.students.filter((s) => s.id !== id),
        loading: false
      }));

      showSuccess('تم حذف الطالب بنجاح');
      return true;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
      return false;
    }
  },

  // Teachers Actions
  fetchTeachers: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      set({ teachers: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
    }
  },

  addTeacher: async (teacher) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('teachers')
        .insert(teacher)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        teachers: [...state.teachers, data],
        loading: false
      }));

      showSuccess('تم إضافة المدرس بنجاح');
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
      return null;
    }
  },

  updateTeacher: async (id, teacher) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('teachers')
        .update(teacher)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        teachers: state.teachers.map((t) =>
          t.id === id ? { ...t, ...teacher } : t
        ),
        loading: false
      }));

      showSuccess('تم تحديث بيانات المدرس بنجاح');
      return true;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
      return false;
    }
  },

  deleteTeacher: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        teachers: state.teachers.filter((t) => t.id !== id),
        loading: false
      }));

      showSuccess('تم حذف المدرس بنجاح');
      return true;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
      return false;
    }
  },

  // Classes Actions
  fetchClasses: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      set({ classes: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
    }
  },

  addClass: async (classData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert(classData)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        classes: [...state.classes, data],
        loading: false
      }));

      showSuccess('تم إضافة الصف بنجاح');
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
      return null;
    }
  },

  updateClass: async (id, classData) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('classes')
        .update(classData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        classes: state.classes.map((c) =>
          c.id === id ? { ...c, ...classData } : c
        ),
        loading: false
      }));

      showSuccess('تم تحديث بيانات الصف بنجاح');
      return true;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
      return false;
    }
  },

  deleteClass: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        classes: state.classes.filter((c) => c.id !== id),
        loading: false
      }));

      showSuccess('تم حذف الصف بنجاح');
      return true;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      showError(error);
      return false;
    }
  },

  clearError: () => set({ error: null })
}));
