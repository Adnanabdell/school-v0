// src/hooks/useStudents.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { showError, showSuccess } from '../utils/errorHandler';

interface Student {
  id: string;
  full_name: string;
  parent_name: string;
  parent_phone?: string;
  class_id: string;
}

// Fetch all students
export const useStudents = () => {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes:class_id(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// Fetch students by class
export const useStudentsByClass = (classId: string | null) => {
  return useQuery({
    queryKey: ['students', 'class', classId],
    queryFn: async () => {
      if (!classId) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
};

// Fetch single student with details
export const useStudent = (studentId: string | null) => {
  return useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes:class_id(id, name),
          attendances(
            id,
            status,
            day_number,
            month_year,
            session_number,
            created_at
          ),
          evaluations(
            id,
            note,
            created_at,
            teachers:teacher_id(id, full_name)
          )
        `)
        .eq('id', studentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
};

// Add student mutation
export const useAddStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (student: Omit<Student, 'id'>) => {
      const { data, error } = await supabase
        .from('students')
        .insert(student)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showSuccess('تم إضافة الطالب بنجاح');
    },
    onError: (error) => {
      showError(error);
    },
  });
};

// Update student mutation
export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Student> }) => {
      const { error } = await supabase
        .from('students')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showSuccess('تم تحديث بيانات الطالب بنجاح');
    },
    onError: (error) => {
      showError(error);
    },
  });
};

// Delete student mutation
export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showSuccess('تم حذف الطالب بنجاح');
    },
    onError: (error) => {
      showError(error);
    },
  });
};

// Search students
export const useSearchStudents = (query: string) => {
  return useQuery({
    queryKey: ['students', 'search', query],
    queryFn: async () => {
      if (query.length < 2) return [];

      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          full_name,
          classes:class_id(id, name)
        `)
        .ilike('full_name', `%${query}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });
};
