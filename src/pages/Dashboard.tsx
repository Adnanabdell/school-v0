// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.ts';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Users, 
  BookOpen, 
  MessageSquare, 
  PlusCircle, 
  ClipboardCheck,
  Search,
  X,
  Calendar,
  UserCheck,
  Clock,
  ChevronRight,
  AlertTriangle,
  TrendingDown,
  CreditCard,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// NEW FEATURE: use shared user context
import { useUser } from '../contexts/UserContext';

export default function Dashboard() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    evaluations: 0
  });
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<{
    attendance: any[],
    evaluations: any[]
  }>({ attendance: [], evaluations: [] });
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ✨ NEW FEATURE: Smart Alerts System
  const [alerts, setAlerts] = useState<{
    type: 'warning' | 'danger' | 'info';
    message: string;
    count: number;
    action?: string;
    route?: string;
  }[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const { isAdmin } = useUser();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      try {
        const [
          { count: studentCount },
          { count: teacherCount },
          { count: classCount },
          { count: evalCount }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('classes').select('*', { count: 'exact', head: true }),
          supabase.from('evaluations').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          students: studentCount || 0,
          teachers: teacherCount || 0,
          classes: classCount || 0,
          evaluations: evalCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // ✨ NEW FEATURE: Fetch smart alerts for admin
  useEffect(() => {
    if (!isAdmin) return;
    const fetchAlerts = async () => {
      setLoadingAlerts(true);
      const newAlerts: typeof alerts = [];
      const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');

      try {
        // Alert 1: Students with no subscription this month
        const { count: unpaidCount } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true });
        const { count: paidCount } = await supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('month_year', currentMonth)
          .eq('status', 'paid');
        
        const unpaid = (unpaidCount || 0) - (paidCount || 0);
        if (unpaid > 0) {
          newAlerts.push({
            type: 'danger',
            message: `طلاب لم يسددوا اشتراك هذا الشهر`,
            count: unpaid,
            action: 'متابعة الاشتراكات',
            route: '/subscriptions'
          });
        }

        // Alert 2: Students with >3 absences this month
        const { data: absenceData } = await supabase
          .from('attendances')
          .select('student_id')
          .eq('month_year', currentMonth)
          .eq('status', 'absent');

        if (absenceData) {
          const absenceCounts: Record<string, number> = {};
          absenceData.forEach(r => {
            absenceCounts[r.student_id] = (absenceCounts[r.student_id] || 0) + 1;
          });
          const highAbsence = Object.values(absenceCounts).filter(c => c >= 3).length;
          if (highAbsence > 0) {
            newAlerts.push({
              type: 'warning',
              message: `طلاب تجاوزوا 3 غيابات هذا الشهر`,
              count: highAbsence,
              action: 'عرض الحضور',
              route: '/attendance'
            });
          }
        }
      } catch (e) {
        console.error('Error fetching alerts:', e);
      }

      setAlerts(newAlerts);
      setLoadingAlerts(false);
    };
    fetchAlerts();
  }, [isAdmin]);

  // Search logic
  useEffect(() => {
    const searchStudents = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      const { data } = await supabase
        .from('students')
        .select('id, full_name, class_id, classes(name)')
        .ilike('full_name', `%${searchQuery}%`)
        .limit(5);
      
      setSearchResults(data || []);
      setIsSearching(false);
    };

    const timer = setTimeout(searchStudents, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchStudentDetails = async (student: any) => {
    setSelectedStudent(student);
    setLoadingDetails(true);
    
    try {
      const [attendanceRes, evaluationsRes] = await Promise.all([
        supabase
          .from('attendances')
          .select('*')
          .eq('student_id', student.id)
          .order('month_year', { ascending: false })
          .order('day_number', { ascending: false })
          .limit(10),
        supabase
          .from('evaluations')
          .select('*, teachers(full_name)')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      setStudentDetails({
        attendance: attendanceRes.data || [],
        evaluations: evaluationsRes.data || []
      });
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
    <button 
      onClick={onClick}
      className="w-full text-right p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
        {loading ? '...' : value}
      </p>
    </button>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('dashboard_title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">مرحباً بك في لوحة التحكم الخاصة بمدرستك</p>
        </div>

        {/* Stylish Search Bar */}
        <div className="relative w-full md:w-96">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="ابحث عن طالب..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isSearching && (
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              )}
              {searchQuery && !isSearching && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          {(searchResults.length > 0 || (searchQuery.length >= 2 && !isSearching && searchResults.length === 0)) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-up">
              {searchResults.length > 0 ? (
                searchResults.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      fetchStudentDetails(student);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{student.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{student.classes?.name || 'بدون قسم'}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">لم يتم العثور على نتائج لـ "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('total_students')} value={stats.students} icon={User} color="bg-indigo-500" onClick={() => navigate('/students')} />
        <StatCard title={t('teachers')} value={stats.teachers} icon={Users} color="bg-emerald-500" onClick={() => navigate('/teachers')} />
        <StatCard title={t('classes')} value={stats.classes} icon={BookOpen} color="bg-amber-500" onClick={() => navigate('/classes')} />
        <StatCard title="التقييمات المسجلة" value={stats.evaluations} icon={MessageSquare} color="bg-rose-500" onClick={() => navigate('/evaluations')} />
      </div>


      {/* ✨ NEW FEATURE: Smart Alerts Panel — visible to admin only */}
      {isAdmin && alerts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">تنبيهات تحتاج انتباهك</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {alerts.map((alert, i) => (
              <button
                key={i}
                onClick={() => alert.route && navigate(alert.route)}
                className={`flex items-center justify-between p-5 rounded-2xl border text-right transition-all hover:scale-[1.02] ${
                  alert.type === 'danger'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : alert.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    alert.type === 'danger' ? 'bg-red-100 dark:bg-red-900/40' :
                    alert.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/40' :
                    'bg-blue-100 dark:bg-blue-900/40'
                  }`}>
                    {alert.type === 'danger' ? (
                      <CreditCard className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div>
                    <p className={`text-3xl font-black ${
                      alert.type === 'danger' ? 'text-red-600 dark:text-red-400' :
                      alert.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>{alert.count}</p>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{alert.message}</p>
                  </div>
                </div>
                <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  alert.type === 'danger' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                  alert.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' :
                  'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                }`}>
                  {alert.action} ←
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">الوصول السريع</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/attendance')}
              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all text-right group"
            >
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">تسجيل حضور</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">إضافة حصة جديدة</p>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/students')}
              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-500/50 transition-all text-right group"
            >
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">إضافة طالب</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">تسجيل طالب جديد</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/evaluations')}
              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 dark:hover:border-rose-500/50 transition-all text-right group"
            >
              <div className="p-3 bg-rose-100 dark:bg-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">تقييم الطلاب</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">إضافة ملاحظة تربوية</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/subscriptions')}
              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-500/50 transition-all text-right group"
            >
              <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">الاشتراكات</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">متابعة المدفوعات</p>
              </div>
            </button>
          </div>
        </div>
        
        <div className="p-8 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-600/20 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl"></div>
          
          <h3 className="text-2xl font-bold text-white mb-4 relative z-10">نظام الإدارة المدرسية</h3>
          <p className="text-indigo-50 leading-relaxed relative z-10">
            هذا النظام مصمم لمساعدتك في إدارة شؤون مدرستك بكل سهولة ويسر. يمكنك تتبع الحضور، إدارة الاشتراكات، وتقييم أداء الطلاب من مكان واحد.
          </p>
          <div className="mt-6 relative z-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
              النسخة 2.0
            </span>
          </div>
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedStudent.full_name}</h2>
                  <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {selectedStudent.classes?.name || 'بدون قسم'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">جاري تحميل البيانات...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Attendance Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">سجل الحضور الأخير</h3>
                    </div>
                    <div className="space-y-3">
                      {studentDetails.attendance.length > 0 ? (
                        studentDetails.attendance.map((record, idx) => (
                          <div key={record.id || idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${record.status === 'present' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{record.day_number} {record.month_year}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">الحصة {record.session_number}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              record.status === 'present' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            }`}>
                              {record.status === 'present' ? 'حاضر' : 'غائب'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                          <p className="text-slate-500 dark:text-slate-400">لا توجد سجلات حضور</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Evaluations Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-5 h-5 text-rose-600" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">التقييمات والملاحظات</h3>
                    </div>
                    <div className="space-y-4">
                      {studentDetails.evaluations.length > 0 ? (
                        studentDetails.evaluations.map((evalItem, idx) => (
                          <div key={evalItem.id || idx} className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-1 h-full bg-rose-500"></div>
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                                  <UserCheck className="w-4 h-4" />
                                </div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{evalItem.teachers?.full_name || 'مدرس'}</p>
                              </div>
                              <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                                <Clock className="w-3 h-3" />
                                {new Date(evalItem.created_at).toLocaleDateString('ar-DZ')}
                              </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {evalItem.note}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                          <p className="text-slate-500 dark:text-slate-400">لا توجد تقييمات مسجلة</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 text-center">
              <button 
                onClick={() => setSelectedStudent(null)}
                className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold hover:opacity-90 transition-opacity"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
