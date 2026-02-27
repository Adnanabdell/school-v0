// src/utils/validationSchemas.ts
import { z } from 'zod';

// Student Schema
export const studentSchema = z.object({
  full_name: z.string()
    .min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل')
    .max(100, 'الاسم طويل جداً')
    .regex(/^[\u0600-\u06FF\s]+$/, 'يجب أن يحتوي الاسم على أحرف عربية فقط'),
  
  parent_name: z.string()
    .min(3, 'اسم ولي الأمر مطلوب')
    .max(100, 'الاسم طويل جداً'),
  
  parent_phone: z.string()
    .regex(/^(05|06|07)[0-9]{8}$/, 'رقم الهاتف غير صحيح (يجب أن يبدأ بـ 05, 06, أو 07 ويتكون من 10 أرقام)')
    .optional()
    .or(z.literal('')),
  
  class_id: z.string()
    .uuid('يرجى اختيار الصف')
    .min(1, 'يرجى اختيار الصف')
});

export type StudentFormData = z.infer<typeof studentSchema>;

// Teacher Schema
export const teacherSchema = z.object({
  full_name: z.string()
    .min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل')
    .max(100, 'الاسم طويل جداً'),
  
  email: z.string()
    .email('البريد الإلكتروني غير صحيح')
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .regex(/^(05|06|07)[0-9]{8}$/, 'رقم الهاتف غير صحيح')
    .optional()
    .or(z.literal('')),
  
  specialization: z.string()
    .min(2, 'التخصص مطلوب')
    .optional()
    .or(z.literal(''))
});

export type TeacherFormData = z.infer<typeof teacherSchema>;

// Class Schema
export const classSchema = z.object({
  name: z.string()
    .min(2, 'اسم الصف يجب أن يكون حرفين على الأقل')
    .max(50, 'اسم الصف طويل جداً'),
  
  level: z.string()
    .min(1, 'يرجى تحديد المستوى')
    .optional()
    .or(z.literal('')),
  
  capacity: z.number()
    .int('السعة يجب أن تكون رقماً صحيحاً')
    .positive('السعة يجب أن تكون رقماً موجباً')
    .max(100, 'السعة كبيرة جداً')
    .optional()
});

export type ClassFormData = z.infer<typeof classSchema>;

// Subscription Schema
export const subscriptionSchema = z.object({
  student_id: z.string().uuid('يرجى اختيار الطالب'),
  
  amount: z.number()
    .positive('المبلغ يجب أن يكون موجباً')
    .max(1000000, 'المبلغ كبير جداً'),
  
  start_date: z.string()
    .min(1, 'تاريخ البداية مطلوب')
    .refine((date) => !isNaN(Date.parse(date)), 'تاريخ غير صحيح'),
  
  end_date: z.string()
    .min(1, 'تاريخ النهاية مطلوب')
    .refine((date) => !isNaN(Date.parse(date)), 'تاريخ غير صحيح'),
  
  payment_method: z.enum(['cash', 'card', 'transfer'], {
    errorMap: () => ({ message: 'يرجى اختيار طريقة الدفع' })
  }),
  
  notes: z.string()
    .max(500, 'الملاحظات طويلة جداً')
    .optional()
    .or(z.literal(''))
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  {
    message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
    path: ['end_date']
  }
);

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

// Evaluation Schema
export const evaluationSchema = z.object({
  student_id: z.string().uuid('يرجى اختيار الطالب'),
  
  note: z.string()
    .min(10, 'الملاحظة يجب أن تكون 10 أحرف على الأقل')
    .max(1000, 'الملاحظة طويلة جداً'),
  
  type: z.enum(['positive', 'negative', 'neutral'], {
    errorMap: () => ({ message: 'يرجى تحديد نوع التقييم' })
  }).optional()
});

export type EvaluationFormData = z.infer<typeof evaluationSchema>;

// Login Schema
export const loginSchema = z.object({
  email: z.string()
    .email('البريد الإلكتروني غير صحيح')
    .min(1, 'البريد الإلكتروني مطلوب'),
  
  password: z.string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .max(100, 'كلمة المرور طويلة جداً')
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Helper function to validate and return errors
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } => {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => err.message);
      return { success: false, errors };
    }
    return { success: false, errors: ['خطأ غير متوقع في التحقق من البيانات'] };
  }
};
