// src/hooks/useAttendance.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { showError, showSuccess } from '../utils/errorHandler';

interface AttendanceRecord {
  student_id: string;
  class_id: string;
  teacher_id: string;
  month_year: string;
  day_number: number;
  session_number: string;
  status: 'present' | 'absent';
}

interface AttendanceParams {
  classId: string;
  teacherId: string;
  monthYear: string;
  dayNumber: number;
  sessionNumber: string;
}

// Fetch attendance for specific criteria
export const useAttendance = (params: AttendanceParams | null) => {
  return useQuery({
    queryKey: ['attendance', params],
    queryFn: async () => {
      if (!params) return null;

      const { classId, teacherId, monthYear, dayNumber, sessionNumber } = params;

      const { data, error } = await supabase
        .from('attendances')
        .select('student_id, status')
        .eq('class_id', classId)
        .eq('teacher_id', teacherId)
        .eq('month_year', monthYear)
        .eq('day_number', dayNumber)
        .eq('session_number', sessionNumber);

      if (error) throw error;
      
      // Convert to map for easy lookup
      const attendanceMap: Record<string, 'present' | 'absent'> = {};
      data?.forEach(record => {
        attendanceMap[record.student_id] = record.status;
      });

      return {
        records: data || [],
        attendanceMap,
        hasExistingData: (data?.length || 0) > 0
      };
    },
    enabled: !!params,
  });
};

// Fetch student attendance history
export const useStudentAttendanceHistory = (studentId: string | null) => {
  return useQuery({
    queryKey: ['attendance', 'history', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('attendances')
        .select(`
          *,
          classes:class_id(id, name),
          teachers:teacher_id(id, full_name)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
};

// Save or update attendance
export const useSaveAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      records,
      params
    }: {
      records: AttendanceRecord[];
      params: AttendanceParams;
    }) => {
      // First, delete existing records for this session
      const { error: deleteError } = await supabase
        .from('attendances')
        .delete()
        .eq('class_id', params.classId)
        .eq('teacher_id', params.teacherId)
        .eq('month_year', params.monthYear)
        .eq('day_number', params.dayNumber)
        .eq('session_number', params.sessionNumber);

      if (deleteError) throw deleteError;

      // Then insert new records
      if (records.length > 0) {
        const { error: insertError } = await supabase
          .from('attendances')
          .insert(records);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { params }) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', params] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'history'] });
      showSuccess('تم حفظ الحضور بنجاح');
    },
    onError: (error) => {
      showError(error);
    },
  });
};

// Get attendance statistics
export const useAttendanceStats = (studentId: string | null, monthYear?: string) => {
  return useQuery({
    queryKey: ['attendance', 'stats', studentId, monthYear],
    queryFn: async () => {
      if (!studentId) return null;

      let query = supabase
        .from('attendances')
        .select('status')
        .eq('student_id', studentId);

      if (monthYear) {
        query = query.eq('month_year', monthYear);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.length || 0;
      const present = data?.filter(r => r.status === 'present').length || 0;
      const absent = total - present;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        total,
        present,
        absent,
        rate
      };
    },
    enabled: !!studentId,
  });
};
