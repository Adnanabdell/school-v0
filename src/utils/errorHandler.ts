// src/utils/errorHandler.ts
import toast from 'react-hot-toast';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    this.name = 'AppError';
  }
}

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export const handleError = (error: any): string => {
  // Log error for debugging
  console.error('[Error Handler]:', {
    message: error.message,
    code: error.code,
    details: error.details,
    timestamp: new Date().toISOString(),
    stack: error.stack
  });

  // Supabase specific errors
  if (error.code === 'PGRST116') {
    return 'لم يتم العثور على البيانات المطلوبة';
  }
  
  if (error.code === '23505') {
    return 'البيانات المدخلة موجودة مسبقاً';
  }
  
  if (error.code === '23503') {
    return 'لا يمكن حذف هذا العنصر لأنه مرتبط ببيانات أخرى';
  }
  
  if (error.code === '42501') {
    return 'ليس لديك صلاحية للقيام بهذا الإجراء';
  }

  // Network errors
  if (error.message?.includes('fetch')) {
    return 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت';
  }

  // Auth errors
  if (error.message?.includes('Invalid login credentials')) {
    return 'بيانات الدخول غير صحيحة';
  }
  
  if (error.message?.includes('Email not confirmed')) {
    return 'يرجى تأكيد بريدك الإلكتروني أولاً';
  }

  // Default error message
  return error.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى';
};

export const showError = (error: any) => {
  const message = handleError(error);
  toast.error(message, {
    duration: 4000,
    position: 'top-center',
    style: {
      background: '#FEE2E2',
      color: '#991B1B',
      fontWeight: 'bold',
      direction: 'rtl'
    }
  });
};

export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-center',
    style: {
      background: '#D1FAE5',
      color: '#065F46',
      fontWeight: 'bold',
      direction: 'rtl'
    }
  });
};

export const showInfo = (message: string) => {
  toast(message, {
    duration: 3000,
    position: 'top-center',
    icon: 'ℹ️',
    style: {
      background: '#DBEAFE',
      color: '#1E40AF',
      fontWeight: 'bold',
      direction: 'rtl'
    }
  });
};
