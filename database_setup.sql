-- database_setup.sql
-- قاعدة البيانات المحسنة لنظام إدارة المدرسة

-- ==============================================
-- 1. Row Level Security (RLS) Policies
-- ==============================================

-- تفعيل RLS للجداول الرئيسية
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- سياسات الطلاب (Students)
-- المدرسون: يمكنهم رؤية طلاب صفوفهم فقط
CREATE POLICY "teachers_read_own_students" ON students
FOR SELECT
USING (
  class_id IN (
    SELECT class_id 
    FROM class_teachers 
    WHERE teacher_id = (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  )
);

-- المديرون: يمكنهم رؤية والتعديل على كل الطلاب
CREATE POLICY "admins_all_access_students" ON students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- سياسات المدرسين (Teachers)
-- المدرسون: يمكنهم رؤية معلوماتهم فقط
CREATE POLICY "teachers_read_self" ON teachers
FOR SELECT
USING (user_id = auth.uid());

-- المديرون: وصول كامل
CREATE POLICY "admins_all_access_teachers" ON teachers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- سياسات الحضور (Attendances)
-- المدرسون: يمكنهم قراءة وكتابة حضور طلابهم
CREATE POLICY "teachers_manage_own_attendance" ON attendances
FOR ALL
USING (
  teacher_id = (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

-- المديرون: وصول كامل
CREATE POLICY "admins_all_access_attendance" ON attendances
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- سياسات التقييمات (Evaluations)
-- المدرسون: يمكنهم إضافة وقراءة تقييماتهم
CREATE POLICY "teachers_manage_own_evaluations" ON evaluations
FOR ALL
USING (
  teacher_id = (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

-- المديرون: وصول كامل
CREATE POLICY "admins_all_access_evaluations" ON evaluations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ==============================================
-- 2. Indexes للأداء الأفضل
-- ==============================================

-- Indexes للطلاب
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_full_name_trgm ON students USING gin(full_name gin_trgm_ops);

-- Indexes للحضور
CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_class_id ON attendances(class_id);
CREATE INDEX IF NOT EXISTS idx_attendances_teacher_id ON attendances(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(month_year, day_number);
CREATE INDEX IF NOT EXISTS idx_attendances_created_at ON attendances(created_at DESC);

-- Composite index للحضور (للاستعلامات المعقدة)
CREATE INDEX IF NOT EXISTS idx_attendances_lookup ON attendances(
  class_id, 
  teacher_id, 
  month_year, 
  day_number, 
  session_number
);

-- Indexes للتقييمات
CREATE INDEX IF NOT EXISTS idx_evaluations_student_id ON evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_teacher_id ON evaluations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at DESC);

-- Indexes للاشتراكات
CREATE INDEX IF NOT EXISTS idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_dates ON subscriptions(start_date, end_date);

-- Indexes للمدرسين
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_full_name ON teachers(full_name);

-- Indexes للصفوف
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

-- ==============================================
-- 3. Functions للإحصائيات
-- ==============================================

-- دالة لحساب معدل الحضور
CREATE OR REPLACE FUNCTION get_attendance_rate(
  p_student_id UUID,
  p_month_year TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total INT;
  v_present INT;
  v_rate DECIMAL;
BEGIN
  -- حساب الحضور
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'present') as present
  INTO v_total, v_present
  FROM attendances
  WHERE student_id = p_student_id
    AND (p_month_year IS NULL OR month_year = p_month_year);

  -- حساب النسبة
  IF v_total > 0 THEN
    v_rate := ROUND((v_present::DECIMAL / v_total::DECIMAL) * 100, 2);
  ELSE
    v_rate := 0;
  END IF;

  -- إرجاع النتيجة
  v_result := jsonb_build_object(
    'total', v_total,
    'present', v_present,
    'absent', v_total - v_present,
    'rate', v_rate
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحساب إحصائيات الحضور الشهرية
CREATE OR REPLACE FUNCTION get_monthly_attendance_stats(
  p_start_month TEXT,
  p_end_month TEXT
)
RETURNS TABLE (
  month TEXT,
  total_sessions INT,
  total_present INT,
  total_absent INT,
  attendance_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    month_year as month,
    COUNT(*)::INT as total_sessions,
    COUNT(*) FILTER (WHERE status = 'present')::INT as total_present,
    COUNT(*) FILTER (WHERE status = 'absent')::INT as total_absent,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
       NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 
      2
    ) as attendance_rate
  FROM attendances
  WHERE month_year BETWEEN p_start_month AND p_end_month
  GROUP BY month_year
  ORDER BY month_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على أكثر الطلاب غياباً
CREATE OR REPLACE FUNCTION get_most_absent_students(
  p_month_year TEXT,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  student_id UUID,
  full_name TEXT,
  total_absences BIGINT,
  total_sessions BIGINT,
  absence_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as student_id,
    s.full_name,
    COUNT(*) FILTER (WHERE a.status = 'absent') as total_absences,
    COUNT(*) as total_sessions,
    ROUND(
      (COUNT(*) FILTER (WHERE a.status = 'absent')::DECIMAL / 
       NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 
      2
    ) as absence_rate
  FROM students s
  JOIN attendances a ON s.id = a.student_id
  WHERE a.month_year = p_month_year
  GROUP BY s.id, s.full_name
  HAVING COUNT(*) FILTER (WHERE a.status = 'absent') > 0
  ORDER BY total_absences DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 4. Triggers للتحديثات التلقائية
-- ==============================================

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الـ trigger على الجداول
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teachers_updated_at ON teachers;
CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON teachers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 5. Views للاستعلامات الشائعة
-- ==============================================

-- View لعرض الطلاب مع معلومات الصف
CREATE OR REPLACE VIEW students_with_class AS
SELECT 
  s.*,
  c.name as class_name,
  c.level as class_level
FROM students s
LEFT JOIN classes c ON s.class_id = c.id;

-- View لعرض الحضور مع التفاصيل
CREATE OR REPLACE VIEW attendance_details AS
SELECT 
  a.*,
  s.full_name as student_name,
  c.name as class_name,
  t.full_name as teacher_name
FROM attendances a
JOIN students s ON a.student_id = s.id
JOIN classes c ON a.class_id = c.id
JOIN teachers t ON a.teacher_id = t.id;

-- ==============================================
-- 6. Constraints إضافية
-- ==============================================

-- التأكد من أن تاريخ النهاية بعد تاريخ البداية في الاشتراكات
ALTER TABLE subscriptions 
ADD CONSTRAINT check_subscription_dates 
CHECK (end_date > start_date);

-- التأكد من أن المبلغ موجب
ALTER TABLE subscriptions 
ADD CONSTRAINT check_subscription_amount 
CHECK (amount > 0);

-- ==============================================
-- 7. إعداد Full Text Search
-- ==============================================

-- إضافة عمود للبحث
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- تحديث عمود البحث
UPDATE students 
SET search_vector = to_tsvector('arabic', full_name || ' ' || parent_name);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_students_search_vector 
ON students USING gin(search_vector);

-- Trigger لتحديث search_vector تلقائياً
CREATE OR REPLACE FUNCTION update_student_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('arabic', NEW.full_name || ' ' || COALESCE(NEW.parent_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_students_search_vector ON students;
CREATE TRIGGER update_students_search_vector
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_student_search_vector();

-- ==============================================
-- 8. Backup & Maintenance
-- ==============================================

-- دالة للنسخ الاحتياطي (يمكن جدولتها مع pg_cron)
CREATE OR REPLACE FUNCTION create_backup_log()
RETURNS VOID AS $$
BEGIN
  -- يمكن إضافة logic للنسخ الاحتياطي هنا
  -- أو استدعاء edge function
  RAISE NOTICE 'Backup initiated at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- ملاحظات هامة:
-- ==============================================
-- 1. تأكد من تفعيل pg_trgm extension للبحث:
--    CREATE EXTENSION IF NOT EXISTS pg_trgm;
--
-- 2. لجدولة المهام اليومية، استخدم pg_cron:
--    CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- 3. بعد تطبيق هذا الملف، قم باختبار جميع الـ policies
--    للتأكد من عملها بشكل صحيح
--
-- 4. راجع performance باستخدام EXPLAIN ANALYZE
--    على الاستعلامات الرئيسية
-- ==============================================

-- رسالة نهائية
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup completed successfully!';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Test RLS policies';
  RAISE NOTICE '2. Run ANALYZE on all tables';
  RAISE NOTICE '3. Monitor query performance';
  RAISE NOTICE '4. Set up automated backups';
END $$;
