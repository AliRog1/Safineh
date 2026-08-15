'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  name?: string;
  fullName?: string;
  username?: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student' | string;
  avatar?: string;
  createdAt?: string;
  province?: any;
  provinceName?: any;
  provinceId?: any;
  studentProvince?: any;
  grade?: any;
  gradeName?: any;
  gradeId?: any;
  studentGrade?: any;
}

interface Grade {
  id: string;
  name: string;
}

interface Province {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  gradeId?: string;
  provinceId?: string;
  subjectId?: string;
  questions?: any[];
}

interface ExamResult {
  id?: string;
  examId: string;
  studentId: string;
  score?: number;
  submittedAt?: string;
}

interface Ticket {
  id: string;
  title: string;
  status: 'open' | 'answered' | string;
  studentId?: string;
  creatorId?: string;
  createdAt?: string;
}

interface Post {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  createdAt?: string;
  provinceIds?: any;
  provinces?: any;
  province?: any;
  gradeIds?: any;
  grades?: any;
  grade?: any;
  allProvinces?: boolean;
  allGrades?: boolean;
}

const EXAMS_KEY = 'exams';
const EXAM_RESULTS_KEY = 'exam_results';
const GRADES_KEY = 'grades';
const PROVINCES_KEY = 'provinces';
const ALL_PROVINCES_VALUE = 'all-provinces';

// نرمال‌سازی متن
function normalizeText(value?: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
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

// تابع مشابه پنل آزمون
function parseMultipleValues(value?: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((v) => normalizeText(v))
      .filter((v) => v.length > 0);
  }

  return String(value)
    .split(/[,\u060C\-]/)
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0);
}

function parseAndNormalizeValues(value: any, isGrade = false): string[] {
  const parsed = parseMultipleValues(value);
  return parsed
    .map((item) => (isGrade ? normalizeGrade(item) : normalizeText(item)))
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
    normalized.includes('همه پایه‌ها') ||
    normalized.includes(normalizeText(ALL_PROVINCES_VALUE))
  );
}

function hasOverlap(studentValues: string[], itemValues: string[]): boolean {
  if (hasAllAccess(studentValues)) return true;
  if (hasAllAccess(itemValues)) return true;

  if (studentValues.length === 0 || itemValues.length === 0) return true;

  return itemValues.some((item) => studentValues.includes(item));
}

function formatDisplayValue(value: any, fallback = 'تعریف نشده'): string {
  if (Array.isArray(value)) {
    const cleaned = value.map((v) => String(v).trim()).filter(Boolean);
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

function parseDate(value?: any): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// دقیقا هماهنگ با منطق پنل آزمون
function getExamStatus(exam: Exam): 'pending' | 'active' | 'finished' | 'unknown' {
  const now = new Date();
  const start = exam.startTime ? new Date(exam.startTime) : null;
  const end = exam.endTime ? new Date(exam.endTime) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'unknown';
  }

  if (now < start) return 'pending';
  if (now >= start && now <= end) return 'active';
  return 'finished';
}

function getComparableId(value?: any): string {
  return String(value ?? '').trim();
}

export default function StudentDashboardPage() {
  const [currentStudent, setCurrentStudent] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    coursesCount: 0,
    activeQuizzesCount: 0,
    upcomingQuizzesCount: 0,
    participatedQuizzesCount: 0,
    ticketsCount: 0,
  });

  const [activeQuizzes, setActiveQuizzes] = useState<Exam[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const currentUserRaw = localStorage.getItem('currentUser');
      const userRaw = localStorage.getItem('user');
      const usersRaw = localStorage.getItem('users');

      const baseUser = currentUserRaw
        ? JSON.parse(currentUserRaw)
        : userRaw
        ? JSON.parse(userRaw)
        : null;

      if (!baseUser) {
        setIsLoading(false);
        return;
      }

      if (usersRaw) {
        const allUsers: User[] = JSON.parse(usersRaw);
        const activeStudent = allUsers.find((u) => u.id === baseUser.id);
        setCurrentStudent(activeStudent || baseUser);
      } else {
        setCurrentStudent(baseUser);
      }
    } catch (error) {
      console.error('خطا در بارگذاری مشخصات دانش‌آموز:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentStudent) return;

    try {
      const db = getSafinehDB();

      const grades: Grade[] = getArrayFromPossibleKeys([GRADES_KEY]) as Grade[];
      const provinces: Province[] = getArrayFromPossibleKeys([PROVINCES_KEY]) as Province[];

      const gradeNameMap: Record<string, string> = {};
      grades.forEach((g) => {
        gradeNameMap[g.id] = g.name;
      });

      const provinceNameMap: Record<string, string> = {
        [ALL_PROVINCES_VALUE]: 'همه استان‌ها',
      };
      provinces.forEach((p) => {
        provinceNameMap[p.id] = p.name;
      });

      // داده دانش‌آموز مثل StudentExamsPage
      const studentGrades = parseAndNormalizeValues(
        currentStudent.grade ||
          currentStudent.studentGrade ||
          currentStudent.gradeName ||
          currentStudent.gradeId,
        true
      );

      const studentProvinces = parseAndNormalizeValues(
        currentStudent.province ||
          currentStudent.studentProvince ||
          currentStudent.provinceName ||
          currentStudent.provinceId,
        false
      );

      // ۱) دوره‌ها - همان منطق قبلی
      let allCourses: any[] = [];
      if (db) {
        if (Array.isArray(db.courses)) allCourses = db.courses;
        else if (Array.isArray(db.classes)) allCourses = db.classes;
      }
      if (!allCourses.length) {
        allCourses = getArrayFromPossibleKeys(['courses', 'classes']);
      }

      const matchedCourses = allCourses.filter((course: any) => {
        const courseProvinces = parseAndNormalizeValues(
          course.provinceIds ?? course.provinces ?? course.province,
          false
        );
        const courseGrades = parseAndNormalizeValues(
          course.gradeIds ?? course.grades ?? course.grade,
          true
        );
        return (
          hasOverlap(studentProvinces, courseProvinces) &&
          hasOverlap(studentGrades, courseGrades)
        );
      });

      // ۲) آزمون‌ها - هماهنگ با StudentExamsPage
      const allExams: Exam[] = getArrayFromPossibleKeys([EXAMS_KEY]) as Exam[];

      const matchedExams = allExams.filter((exam) => {
        const examGradeName = normalizeGrade(gradeNameMap[exam.gradeId || '']);
        const examProvinceName = normalizeText(provinceNameMap[exam.provinceId || '']);

        const examGradeCandidates = [
          normalizeGrade(exam.gradeId),
          examGradeName,
        ].filter(Boolean);

        const examProvinceCandidates = [
          normalizeText(exam.provinceId),
          examProvinceName,
        ].filter(Boolean);

        const hasGradeAccess =
          studentGrades.length === 0 ||
          examGradeCandidates.some((candidate) => studentGrades.includes(candidate));

        const hasProvinceAccess =
          exam.provinceId === ALL_PROVINCES_VALUE ||
          studentProvinces.length === 0 ||
          examProvinceCandidates.some((candidate) => studentProvinces.includes(candidate));

        return hasGradeAccess && hasProvinceAccess;
      });

      const activeList: Exam[] = [];
      const upcomingList: Exam[] = [];

      matchedExams.forEach((exam) => {
        const status = getExamStatus(exam);
        if (status === 'active') activeList.push(exam);
        if (status === 'pending') upcomingList.push(exam);
      });

      activeList.sort((a, b) => {
        const aTime = parseDate(a.startTime)?.getTime() ?? 0;
        const bTime = parseDate(b.startTime)?.getTime() ?? 0;
        return aTime - bTime;
      });

      upcomingList.sort((a, b) => {
        const aTime = parseDate(a.startTime)?.getTime() ?? 0;
        const bTime = parseDate(b.startTime)?.getTime() ?? 0;
        return aTime - bTime;
      });

      setActiveQuizzes(activeList.slice(0, 3));

      // ۳) آزمون‌های شرکت‌کرده - هماهنگ با StudentExamsPage
      const allResults: ExamResult[] = getArrayFromPossibleKeys([EXAM_RESULTS_KEY]) as ExamResult[];

      const studentId = getComparableId(currentStudent.id);

      const studentResults = allResults.filter(
        (result) => getComparableId(result.studentId) === studentId
      );

      const participatedExamIds = new Set(
        studentResults
          .map((result) => getComparableId(result.examId))
          .filter(Boolean)
      );

      // فقط آزمون‌هایی که به همین دانش‌آموز مربوط‌اند و در لیست خودش هم هستند
      const participatedMatchedExamIds = new Set(
        matchedExams
          .filter((exam) => participatedExamIds.has(getComparableId(exam.id)))
          .map((exam) => getComparableId(exam.id))
      );

      // ۴) تیکت‌ها
      let allTickets: Ticket[] = [];
      if (db && Array.isArray(db.tickets)) {
        allTickets = db.tickets;
      } else {
        allTickets = getArrayFromPossibleKeys(['tickets', 'supportTickets']) as Ticket[];
      }

      const studentTickets = allTickets.filter(
        (ticket) =>
          getComparableId(ticket.studentId) === studentId ||
          getComparableId(ticket.creatorId) === studentId
      );

      const sortedTickets = [...studentTickets].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      setRecentTickets(sortedTickets.slice(0, 3));

      // ۵) اخبار/مقالات
      let allPosts: Post[] = [];
      if (db && Array.isArray(db.posts)) {
        allPosts = db.posts;
      } else {
        allPosts = getArrayFromPossibleKeys(['demo_posts', 'posts', 'news', 'articles']) as Post[];
      }

      const matchedPosts = allPosts.filter((post) => {
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

        const provinceMatch = allProvinceAccess || hasOverlap(studentProvinces, postProvinces);
        const gradeMatch = allGradeAccess || hasOverlap(studentGrades, postGrades);

        return provinceMatch && gradeMatch;
      });

      const sortedPosts = matchedPosts.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      setRecentPosts(sortedPosts.slice(0, 3));

      setStats({
        coursesCount: matchedCourses.length,
        activeQuizzesCount: activeList.length,
        upcomingQuizzesCount: upcomingList.length,
        participatedQuizzesCount: participatedMatchedExamIds.size,
        ticketsCount: studentTickets.length,
      });
    } catch (error) {
      console.error('خطا در پردازش اطلاعات داشبورد دانش‌آموز:', error);
    }
  }, [currentStudent]);

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
        در حال بارگذاری اطلاعات پنل کاربری...
      </div>
    );
  }

  if (!currentStudent) {
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
        جهت مشاهده پنل ابتدا باید وارد سیستم شوید.
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
            سلام، {currentStudent.name || currentStudent.fullName || 'دانش‌آموز عزیز'} خوش‌آمدی 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px' }}>
            پایه تحصیلی:{' '}
            {formatDisplayValue(
              currentStudent.gradeName || currentStudent.studentGrade || currentStudent.grade,
              'تعریف نشده'
            )}{' '}
            | استان:{' '}
            {formatDisplayValue(
              currentStudent.provinceName || currentStudent.studentProvince || currentStudent.province,
              'سراسری'
            )}
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
          <span style={{ color: '#00e5ff', fontSize: '14px' }}>
            📅 {new Date().toLocaleDateString('fa-IR')}
          </span>
        </div>
      </header>

      <div style={gridContainer}>
        <StatCard
          title="دوره‌های فعال من"
          value={stats.coursesCount}
          icon="📚"
          color="#3b82f6"
          href="/student/courses"
        />

        <StatCard
          title="آزمون‌های فعال فعلی"
          value={stats.activeQuizzesCount}
          icon="🎯"
          color="#10b981"
          href="/student/exams"
        />

        <StatCard
          title="آزمون‌های پیش رو"
          value={stats.upcomingQuizzesCount}
          icon="⏳"
          color="#f59e0b"
          href="/student/exams"
        />

        <StatCard
          title="آزمون‌های شرکت‌کرده"
          value={stats.participatedQuizzesCount}
          icon="📝"
          color="#00e5ff"
          href="/student/exams"
        />
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
            🔥 آزمون‌های فعال
          </h3>

          {activeQuizzes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--card-bg-light)',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    borderRight: '4px solid #10b981',
                    gap: '12px',
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 'bold' }}>
                      {quiz.title}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ⏱ زمان پاسخ‌دهی: {quiz.duration || 30} دقیقه
                    </span>
                  </div>
                </div>
              ))}
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
              در حال حاضر آزمون فعالی برای شما وجود ندارد.
            </p>
          )}
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
            📰 آخرین اخبار و مقالات آموزشی
          </h3>

          {recentPosts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: 'var(--card-bg-light)',
                    padding: '12px 14px',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 'bold' }}>
                      {post.title}
                    </h4>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString('fa-IR') : 'به‌تازگی'}
                    </span>
                  </div>
                  {post.summary && (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.6' }}>
                      {post.summary}
                    </p>
                  )}
                  <Link
                    href={`/news/${post.id}`}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '6px 12px',
                      background: '#3b82f6',
                      color: '#fff',
                      fontSize: '12px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      boxShadow: '0 0 10px rgba(59, 130, 246, 0.35)',
                      marginTop: '6px',
                    }}
                  >
                    ورود به مقاله
                  </Link>
                </div>
              ))}
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
              اخبار جدیدی متناسب با پایه و استان شما یافت نشد.
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginTop: '20px',
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
            💬 تیکت‌های پشتیبانی من
          </h3>

          {recentTickets.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentTickets.map((ticket) => {
                const isAnswered = normalizeText(ticket.status) === 'answered';

                return (
                  <div
                    key={ticket.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--card-bg-light)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>
                      {ticket.title}
                    </span>

                    {isAnswered ? (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#fff',
                          background: '#10b981',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        جواب تیکت
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          background: 'var(--border-color)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        در انتظار پاسخ
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
              شما تا کنون تیکتی ثبت نکرده‌اید.
            </p>
          )}
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
            ⚡ دسترسی سریع
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <QuickActionLink href="/student/courses" title="دوره‌های من" icon="📚" />
            <QuickActionLink href="/student/question-bank" title="بانک سوالات" icon="❓" />
            <QuickActionLink href="/student/exams" title="آزمون‌ها" icon="🎯" />
            <QuickActionLink href="/student/support" title="تیکت و پشتیبانی" icon="💬" />
            <QuickActionLink href="/news" title="اخبار و مقالات" icon="📰" />
            <QuickActionLink href="/student/profile" title="پروفایل من" icon="👤" />
          </div>
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
  href: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...cardStyle,
          cursor: 'pointer',
          transform: isHovered ? 'translateY(-5px)' : 'none',
          boxShadow: isHovered
            ? `0 12px 24px -10px rgba(0, 0, 0, 0.15), 0 0 1px 1px ${color}80`
            : '0 8px 16px -4px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
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
      </div>
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
