'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface UserPermissions {
  viewProvinceStudents: boolean;
  myCourses: boolean;
  questionBank: boolean;
  examManagement: boolean;
  tickets: boolean;
  posts: boolean;
}

interface User {
  id: string;
  name: string;
  username?: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student' | string;
  avatar?: string;
  createdAt?: string;
  province?: any;
  grade?: any;
  permissions?: UserPermissions | null;
}

interface Ticket {
  id: string;
  title: string;
  status: 'open' | 'answered' | string;
  teacherId?: string;
}

const defaultPermissions: UserPermissions = {
  viewProvinceStudents: false,
  myCourses: false,
  questionBank: false,
  examManagement: false,
  tickets: false,
  posts: false,
};

function normalizePermissions(permissions?: Partial<UserPermissions> | null): UserPermissions {
  return {
    viewProvinceStudents: permissions?.viewProvinceStudents ?? defaultPermissions.viewProvinceStudents,
    myCourses: permissions?.myCourses ?? defaultPermissions.myCourses,
    questionBank: permissions?.questionBank ?? defaultPermissions.questionBank,
    examManagement: permissions?.examManagement ?? defaultPermissions.examManagement,
    tickets: permissions?.tickets ?? defaultPermissions.tickets,
    posts: permissions?.posts ?? defaultPermissions.posts,
  };
}

function hasTeacherDashboardAccess(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (user.role !== 'teacher' && user.role !== 'admin') return false;

  const permissions = normalizePermissions(user.permissions);
  return Object.values(permissions).some(Boolean);
}

// نرمال‌سازی متن
function normalizeText(value?: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/‌/g, ' ');
}

// نرمال‌سازی پایه
function normalizeGrade(value?: any): string {
  const v = normalizeText(value);
  if (!v) return '';

  if (v === '10' || v === '۱۰' || v.includes('دهم')) return '10';
  if (v === '11' || v === '۱۱' || v.includes('یازدهم')) return '11';
  if (v === '12' || v === '۱۲' || v.includes('دوازدهم')) return '12';

  return v;
}

// منطق استخراج دقیقا هم‌راستا با فایل پروفایل
function parseMultipleValues(value?: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(v => v.length > 0);
  }

  return String(value)
    .split(/[,\u060C\-\n]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

function parseAndNormalizeValues(value: any, isGrade = false): string[] {
  const parsed = parseMultipleValues(value);
  return parsed
    .map(item => (isGrade ? normalizeGrade(item) : normalizeText(item)))
    .filter(Boolean);
}

function hasAllAccess(values: string[]): boolean {
  const normalized = values.map(normalizeText);

  return (
    normalized.length === 0 ||
    normalized.includes('all') ||
    normalized.includes('همه') ||
    normalized.includes('سراسری') ||
    normalized.includes('تمام') ||
    normalized.includes('همه پایه ها') ||
    normalized.includes('همه پایه‌ها')
  );
}

function hasOverlap(teacherValues: string[], itemValues: string[]): boolean {
  if (hasAllAccess(teacherValues)) return true;
  if (hasAllAccess(itemValues)) return true;

  if (teacherValues.length === 0 || itemValues.length === 0) return true;

  return itemValues.some(item => teacherValues.includes(item));
}

function formatDisplayValue(value: any, fallback = 'تعریف نشده'): string {
  if (Array.isArray(value)) {
    const cleaned = value.map(v => String(v).trim()).filter(Boolean);
    return cleaned.length ? cleaned.join('، ') : fallback;
  }

  if (value === null || value === undefined || String(value).trim() === '') {
    return fallback;
  }

  return String(value);
}

function safeParseJSON(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getArrayFromPossibleKeys(keys: string[]): any[] {
  for (const key of keys) {
    const parsed = safeParseJSON(localStorage.getItem(key));

    if (Array.isArray(parsed)) return parsed;

    if (parsed && typeof parsed === 'object') {
      if (Array.isArray((parsed as any).data)) return (parsed as any).data;
      if (Array.isArray((parsed as any).items)) return (parsed as any).items;
      if (Array.isArray((parsed as any).list)) return (parsed as any).list;
    }
  }

  return [];
}

function getSafinehDB(): Record<string, any> | null {
  const possibleDbKeys = ['safinehDB', 'safineh-db', 'db', 'database', 'appDB'];

  for (const key of possibleDbKeys) {
    const parsed = safeParseJSON(localStorage.getItem(key));
    if (parsed && typeof parsed === 'object') return parsed as Record<string, any>;
  }

  return null;
}

export default function TeacherDashboardPage() {
  const [currentTeacher, setCurrentTeacher] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const [stats, setStats] = useState({
    studentsCount: 0,
    coursesCount: 0,
    quizzesCount: 0,
    unansweredTicketsCount: 0,
    postsCount: 0,
  });

  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  const permissions = useMemo(() => normalizePermissions(currentTeacher?.permissions), [currentTeacher]);
  const isSuperAdmin = useMemo(() => currentTeacher?.role === 'superadmin', [currentTeacher]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedUserRaw = localStorage.getItem('currentUser');
      const usersRaw = localStorage.getItem('users');

      if (!storedUserRaw) {
        setHasAccess(false);
        return;
      }

      const parsedUser: User = JSON.parse(storedUserRaw);

      if (usersRaw) {
        const allUsers: User[] = JSON.parse(usersRaw);
        const activeTeacher = allUsers.find(u => u.id === parsedUser.id);
        const finalUser = activeTeacher || parsedUser;

        setCurrentTeacher(finalUser);
        setHasAccess(hasTeacherDashboardAccess(finalUser));
      } else {
        setCurrentTeacher(parsedUser);
        setHasAccess(hasTeacherDashboardAccess(parsedUser));
      }
    } catch (error) {
      console.error('خطا در خواندن اطلاعات کاربر جاری:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentTeacher || !hasAccess) return;

    try {
      const db = getSafinehDB();

      let allUsers: User[] =
        (getArrayFromPossibleKeys(['users', 'allUsers', 'appUsers', 'safinehUsers']) as User[]) || [];

      if (!allUsers.length && db) {
        if (Array.isArray(db.users)) allUsers = db.users;
        else if (Array.isArray(db.members)) allUsers = db.members;
        else if (Array.isArray(db.accounts)) allUsers = db.accounts;
      }

      const teacherProvinces = parseAndNormalizeValues(currentTeacher.province, false);
      const teacherGrades = parseAndNormalizeValues(currentTeacher.grade, true);

      // دانش‌آموزان
      const matchedStudents = allUsers.filter((user) => {
        const role = normalizeText(user.role);
        const isStudent = role === 'student' || role === 'user' || role === 'learner' || !role;

        if (!isStudent) return false;
        if (isSuperAdmin) return true;

        const studentProvinces = parseAndNormalizeValues(user.province, false);
        const studentGrades = parseAndNormalizeValues(user.grade, true);

        return hasOverlap(teacherProvinces, studentProvinces) && hasOverlap(teacherGrades, studentGrades);
      });

      // دوره‌ها
      let allCourses: any[] = [];
      if (db) {
        if (Array.isArray(db.courses)) allCourses = db.courses;
        else if (Array.isArray(db.classes)) allCourses = db.classes;
        else if (Array.isArray(db.lessons)) allCourses = db.lessons;
        else if (Array.isArray(db.programs)) allCourses = db.programs;
      }

      if (!allCourses.length) {
        allCourses = getArrayFromPossibleKeys(['courses', 'classes', 'lessons', 'programs']);
      }

      const filteredCourses = allCourses.filter((course: any) => {
        if (isSuperAdmin) return true;

        const isCreatedByTeacher = course.creatorId === currentTeacher.id || course.teacherId === currentTeacher.id;
        if (isCreatedByTeacher) return true;

        const courseProvinces = parseAndNormalizeValues(
          course.provinceIds ?? course.provinces ?? course.province,
          false
        );
        const courseGrades = parseAndNormalizeValues(
          course.gradeIds ?? course.grades ?? course.grade,
          true
        );

        return hasOverlap(teacherProvinces, courseProvinces) && hasOverlap(teacherGrades, courseGrades);
      });

      // آزمون‌ها
      let allQuizzes: any[] = [];
      if (db) {
        if (Array.isArray(db.quizzes)) allQuizzes = db.quizzes;
        else if (Array.isArray(db.exams)) allQuizzes = db.exams;
        else if (Array.isArray(db.tests)) allQuizzes = db.tests;
        else if (Array.isArray(db.assessments)) allQuizzes = db.assessments;
      }

      if (!allQuizzes.length) {
        allQuizzes = getArrayFromPossibleKeys(['quizzes', 'exams', 'tests', 'assessments']);
      }

      const filteredQuizzes = allQuizzes.filter((quiz: any) => {
        // [ninja]: بررسی دقیق فعال بودن آزمون بر اساس بازه زمانی شروع و پایان
        const now = new Date();
        const start = quiz.startTime ? new Date(quiz.startTime) : null;
        const end = quiz.endTime ? new Date(quiz.endTime) : null;

        const isTimeActive =
          start &&
          end &&
          !Number.isNaN(start.getTime()) &&
          !Number.isNaN(end.getTime()) &&
          now >= start &&
          now <= end;

        // اگر آزمون به لحاظ زمانی فعال نباشد، شمرده نمی‌شود
        if (!isTimeActive) return false;

        if (isSuperAdmin) return true;

        // بررسی مالکیت بر اساس تمام فیلدهای ممکن (از جمله authorId و createdBy معرفی شده در پنل مدرس و ادمین)
        const isCreatedByTeacher =
          quiz.creatorId === currentTeacher.id ||
          quiz.teacherId === currentTeacher.id ||
          quiz.authorId === currentTeacher.id ||
          quiz.createdBy === currentTeacher.id;

        if (isCreatedByTeacher) return true;

        const quizProvinces = parseAndNormalizeValues(
          quiz.provinceIds ?? quiz.provinces ?? quiz.province,
          false
        );
        const quizGrades = parseAndNormalizeValues(
          quiz.gradeIds ?? quiz.grades ?? quiz.grade,
          true
        );

        return hasOverlap(teacherProvinces, quizProvinces) && hasOverlap(teacherGrades, quizGrades);
      });

      // تیکت‌ها
      let allTickets: Ticket[] = [];
      if (db && Array.isArray(db.tickets)) {
        allTickets = db.tickets;
      } else {
        allTickets = getArrayFromPossibleKeys(['tickets', 'supportTickets']) as Ticket[];
      }

      const openTickets = allTickets.filter((ticket) => {
        const isOpen = normalizeText(ticket.status) === 'open';
        if (!isOpen) return false;
        if (isSuperAdmin) return true;
        return ticket.teacherId ? ticket.teacherId === currentTeacher.id : true;
      });

      // مقالات
      let allPosts: any[] = [];
      if (db) {
        if (Array.isArray(db.posts)) allPosts = db.posts;
        else if (Array.isArray(db.news)) allPosts = db.news;
        else if (Array.isArray(db.articles)) allPosts = db.articles;
      }

      if (!allPosts.length) {
        allPosts = getArrayFromPossibleKeys(['demo_posts', 'posts', 'news', 'articles']);
      }

      const postsCount = allPosts.filter((post: any) => {
        if (isSuperAdmin) return true;

        const isCreatedByTeacher =
          post.authorId === currentTeacher.id ||
          post.creatorId === currentTeacher.id ||
          post.teacherId === currentTeacher.id;

        if (isCreatedByTeacher) return true;

        const postProvinces = parseAndNormalizeValues(
          post.provinceIds ?? post.provinces ?? post.province,
          false
        );
        const postGrades = parseAndNormalizeValues(
          post.gradeIds ?? post.grades ?? post.grade,
          true
        );

        const allProvinceAccess = post.allProvinces === true;
        const allGradeAccess = post.allGrades === true;

        const provinceMatch = allProvinceAccess || hasOverlap(teacherProvinces, postProvinces);
        const gradeMatch = allGradeAccess || hasOverlap(teacherGrades, postGrades);

        return provinceMatch && gradeMatch;
      }).length;

      setStats({
        studentsCount: matchedStudents.length,
        coursesCount: filteredCourses.length,
        quizzesCount: filteredQuizzes.length, // تعداد نهایی آزمون‌های کاملا فعال
        unansweredTicketsCount: openTickets.length,
        postsCount,
      });

      const filteredRecentUsers = matchedStudents
        .filter(u => u.id !== currentTeacher.id)
        .sort((a, b) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 3);

      setRecentUsers(filteredRecentUsers);
    } catch (error) {
      console.error('خطا در محاسبه آمارهای معلم:', error);
    }
  }, [currentTeacher, hasAccess, isSuperAdmin]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return { label: 'مدیر کل', color: '#8b5cf6' };
      case 'admin':
        return { label: 'مدیر', color: '#3b82f6' };
      case 'teacher':
        return { label: 'دبیر / همکار', color: '#f59e0b' };
      case 'student':
        return { label: 'دانش‌آموز', color: '#00e5ff' };
      default:
        return { label: role || 'کاربر', color: '#94a3b8' };
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '300px',
          color: 'var(--text-muted)',
        }}
      >
        در حال بارگذاری اطلاعات داشبورد...
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '300px',
          color: '#ef4444',
          fontSize: '16px',
        }}
      >
        شما به این بخش دسترسی ندارید
      </div>
    );
  }

  return (
    <div style={{ padding: '10px', animation: 'fadeIn 0.5s ease-out' }}>
      <header
        style={{
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            پنل همکار آموزشی | {currentTeacher?.name || 'کاربر'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px' }}>
            پایه هدف: {formatDisplayValue(currentTeacher?.grade, 'همه پایه‌ها')} | استان: {formatDisplayValue(currentTeacher?.province, 'سراسری')}
          </p>
        </div>

        <div
          style={{
            background: 'var(--card-bg-light)',
            padding: '8px 15px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span style={{ color: '#10b981', fontSize: '14px' }}>
            📅 {new Date().toLocaleDateString('fa-IR')}
          </span>
        </div>
      </header>

      <div style={gridContainer}>
        <StatCard
          title={`دانش‌آموزان ${currentTeacher?.province ? 'بخش مجاز' : 'سیستم'}`}
          value={stats.studentsCount}
          icon="👥"
          color="#10b981"
          href={permissions.viewProvinceStudents || isSuperAdmin ? '/teacher/students' : undefined}
        />

        <StatCard
          title="دوره‌های مرتبط"
          value={stats.coursesCount}
          icon="📚"
          color="#3b82f6"
          href={permissions.myCourses || isSuperAdmin ? '/teacher/courses' : undefined}
        />

        <StatCard
          title="آزمون‌های فعال"
          value={stats.quizzesCount}
          icon="🎯"
          color="#f59e0b"
          href={permissions.examManagement || isSuperAdmin ? '/teacher/exams' : undefined}
        />

        <StatCard
          title="تیکت‌های باز"
          value={stats.unansweredTicketsCount}
          icon="💬"
          color="#ef4444"
          href={permissions.tickets || isSuperAdmin ? '/teacher/tickets' : undefined}
        />
      </div>

      <div
        style={{
          marginTop: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}
      >
        {(permissions.posts || isSuperAdmin) && (
          <StatCard
            title="اخبار و مقالات"
            value={stats.postsCount}
            icon="📰"
            color="#8b5cf6"
            href="/teacher/posts"
          />
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginTop: '30px',
        }}
      >
        <div style={cardStyle}>
          <h3
            style={{
              fontSize: '17px',
              marginBottom: '20px',
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '10px',
            }}
          >
            ⚡ دسترسی سریع
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {(permissions.viewProvinceStudents || isSuperAdmin) && (
              <QuickActionLink href="/teacher/students" title="لیست دانش‌آموزان" icon="👥" />
            )}

            {(permissions.questionBank || isSuperAdmin) && (
              <QuickActionLink href="/teacher/questions" title="طرح سوال جدید" icon="❓" />
            )}

            {(permissions.examManagement || isSuperAdmin) && (
              <QuickActionLink href="/teacher/exams" title="مدیریت آزمون‌ها" icon="🎯" />
            )}

            {(permissions.tickets || isSuperAdmin) && (
              <QuickActionLink href="/teacher/tickets" title="پاسخ به تیکت‌ها" icon="💬" />
            )}

            {(permissions.myCourses || isSuperAdmin) && (
              <QuickActionLink href="/teacher/courses" title="دوره‌های من" icon="📘" />
            )}

            {(permissions.posts || isSuperAdmin) && (
              <QuickActionLink href="/teacher/posts" title="مقالات و اخبار" icon="📰" />
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <h3
            style={{
              fontSize: '17px',
              marginBottom: '20px',
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '10px',
            }}
          >
            🆕 آخرین اعضای {currentTeacher?.province ? 'بخش مجاز شما' : 'سیستم'}
          </h3>

          {recentUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentUsers.map((user: User) => {
                const roleInfo = getRoleBadge(user.role);

                return (
                  <div
                    key={user.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--card-bg-light)',
                      padding: '10px 14px',
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          overflow: 'hidden',
                        }}
                      >
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                          />
                        ) : (
                          user.name ? user.name.charAt(0) : '👤'
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                          {user.name || user.username || 'کاربر'}
                        </div>
                        <div style={{ fontSize: '11px', color: roleInfo.color }}>
                          {roleInfo.label}
                        </div>
                      </div>
                    </div>

                    {user.createdAt && (
                      <span style={{ fontSize: '11px', color: '#10b981' }}>
                        {user.createdAt}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                color: 'var(--text-muted)',
                textAlign: 'center',
                fontSize: '13px',
                padding: '20px 0',
              }}
            >
              هنوز کاربری در این بخش ثبت نشده است.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  href,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
  href?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const cardElement = (
    <div
      onMouseEnter={() => href && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...cardStyle,
        cursor: href ? 'pointer' : 'not-allowed',
        opacity: href ? 1 : 0.72,
        transform: href && isHovered ? 'translateY(-5px)' : 'none',
        boxShadow:
          href && isHovered
            ? `0 12px 24px -10px rgba(0, 0, 0, 0.15), 0 0 1px 1px ${color}80`
            : '0 8px 16px -4px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      title={href ? title : 'عدم دسترسی به این بخش'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{title}</span>
          <h2 style={{ fontSize: '30px', color, marginTop: '8px', fontWeight: 'bold' }}>
            {value}
          </h2>
        </div>
        <div style={{ fontSize: '36px', opacity: 0.85 }}>{icon}</div>
      </div>

      <div
        style={{
          height: '4px',
          width: '100%',
          background: 'var(--border-color)',
          marginTop: '15px',
          borderRadius: '2px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: value > 0 ? '70%' : '0%',
            background: color,
            borderRadius: '2px',
            boxShadow: value > 0 ? `0 0 10px ${color}` : 'none',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {!href && (
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#ef4444' }}>
          🚫 عدم دسترسی به این بخش
        </div>
      )}
    </div>
  );

  if (!href) return cardElement;

  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      {cardElement}
    </Link>
  );
}

function QuickActionLink({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '12px',
        background: 'var(--card-bg-light)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        color: 'var(--text-main)',
        fontSize: '13px',
        transition: 'all 0.2s',
      }}
    >
      <span>{title}</span>
      <span>{icon}</span>
    </Link>
  );
}

const gridContainer: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '20px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--card-bg)',
  backdropFilter: 'blur(10px)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '20px',
  color: 'var(--text-main)',
  boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.1)',
};
