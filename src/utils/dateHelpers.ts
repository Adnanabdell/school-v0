// src/utils/dateHelpers.ts
import { format, addMonths, startOfYear, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

export const generateMonths = (yearOffset: number = 0): Array<{ value: string; label: string }> => {
  const currentYear = new Date().getFullYear() + yearOffset;
  const startDate = startOfYear(new Date(currentYear, 0));
  
  return Array.from({ length: 12 }, (_, i) => {
    const date = addMonths(startDate, i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ar })
    };
  });
};

export const getAllMonths = (): Array<{ value: string; label: string }> => {
  return [
    ...generateMonths(-1), // السنة الماضية
    ...generateMonths(),   // السنة الحالية
    ...generateMonths(1)   // السنة القادمة
  ];
};

export const formatDate = (dateString: string | Date, formatStr: string = 'dd/MM/yyyy'): string => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, formatStr, { locale: ar });
  } catch (error) {
    return 'تاريخ غير صالح';
  }
};

export const formatDateTime = (dateString: string | Date): string => {
  return formatDate(dateString, 'dd/MM/yyyy HH:mm');
};

export const formatRelativeTime = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'الآن';
  if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
  if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
  if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
  
  return formatDate(date);
};

export const getCurrentMonthYear = (): string => {
  return format(new Date(), 'yyyy-MM');
};

export const getDaysInMonth = (monthYear: string): number => {
  const [year, month] = monthYear.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};
