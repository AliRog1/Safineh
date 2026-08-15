'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './student-exams.module.css';

type ExamStatus = 'pending' | 'active' | 'finished' | 'unknown';

interface Grade {
  id: string;
  name: string;
}

interface Province {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

const EXAMS_KEY = 'exams';
const EXAM_RESULTS_KEY = 'exam_results';
const GRADES_KEY = 'grades';
const PROVINCES_KEY = 'provinces';
const SUBJECTS_KEY = 'subjects';
const ALL_PROVINCES_VALUE = 'all-provinces';

// تابع کمکی برای نرمال‌سازی متون فارسی
const normalizeText = (value: any): string => {
  if (!value) return '';
  return String(value)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .trim();
};

// تابع کمکی برای پارس کردن مقادیر چندتایی و تمیز کردن آن‌ها
function parseMultipleValues(value?: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => normalizeText(v).toLowerCase()).filter((v) => v.length > 0);
  }
  return String(value)
    .split(/[,,،\-]/)
    .map((item) => normalizeText(item).toLowerCase())
    .filter((item) => item.length > 0);
}

export default function StudentExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const currentUserRaw = localStorage.getItem('currentUser');
      const userRaw = localStorage.getItem('user');
      let user = null;

      if (currentUserRaw) {
        user = JSON.parse(currentUserRaw);
      } else if (userRaw) {
        user = JSON.parse(userRaw);
      }
      
      setCurrentUser(user);

      const storedExams = localStorage.getItem(EXAMS_KEY);
      const storedResults = localStorage.getItem(EXAM_RESULTS_KEY);
      const storedGrades = localStorage.getItem(GRADES_KEY);
      const storedProvinces = localStorage.getItem(PROVINCES_KEY);
      const storedSubjects = localStorage.getItem(SUBJECTS_KEY);

      setExams(storedExams ? JSON.parse(storedExams) : []);
      setResults(storedResults ? JSON.parse(storedResults) : []);
      setGrades(storedGrades ? JSON.parse(storedGrades) : []);
      setProvinces(storedProvinces ? JSON.parse(storedProvinces) : []);
      setSubjects(storedSubjects ? JSON.parse(storedSubjects) : []);
    } catch (error) {
      console.error('Error loading data in student panel:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const gradeNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    grades.forEach((g) => { map[g.id] = g.name; });
    return map;
  }, [grades]);

  const provinceNameMap = useMemo(() => {
    const map: Record<string, string> = { [ALL_PROVINCES_VALUE]: 'همه استان‌ها' };
    provinces.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [provinces]);

  const subjectNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    subjects.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [subjects]);

  const filteredExams = useMemo(() => {
    if (!currentUser) return [];

    const studentGrades = parseMultipleValues(currentUser.grade || currentUser.studentGrade || currentUser.gradeId);
    const studentProvinces = parseMultipleValues(currentUser.province || currentUser.studentProvince || currentUser.provinceId);

    return exams.filter((exam) => {
      const examGradeName = normalizeText(gradeNameMap[exam.gradeId]).toLowerCase();
      const hasGradeAccess = studentGrades.length === 0 || studentGrades.some(
        (val) => val === exam.gradeId.toLowerCase() || val === examGradeName
      );

      const examProvinceName = normalizeText(provinceNameMap[exam.provinceId]).toLowerCase();
      const hasProvinceAccess =
        exam.provinceId === ALL_PROVINCES_VALUE ||
        studentProvinces.length === 0 ||
        studentProvinces.some(
          (val) => val === exam.provinceId.toLowerCase() || val === examProvinceName
        );

      return hasGradeAccess && hasProvinceAccess;
    });
  }, [exams, currentUser, grades, provinces, gradeNameMap, provinceNameMap]);

  const getExamStatus = (exam: any): ExamStatus => {
    const now = new Date();
    const start = exam.startTime ? new Date(exam.startTime) : null;
    const end = exam.endTime ? new Date(exam.endTime) : null;

    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'unknown';
    }

    if (now < start) return 'pending';
    if (now >= start && now <= end) return 'active';
    return 'finished';
  };

  const getExamStatusLabel = (status: ExamStatus) => {
    switch (status) {
      case 'pending': return 'در انتظار شروع';
      case 'active': return 'فعال (امکان شرکت)';
      case 'finished': return 'پایان یافته';
      default: return 'نامشخص';
    }
  };

  const hasParticipated = (examId: string) => {
    if (!currentUser?.id) return false;
    return results.some((r) => r.examId === examId && r.studentId === currentUser.id);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>پنل آزمون‌های من</h1>
        <div className={styles.userInfo}>
          <p>دانش‌آموز: <strong>{currentUser?.fullName || currentUser?.name || 'مهمان'}</strong></p>
          {currentUser && (
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
              پایه: {currentUser.gradeName || currentUser.studentGrade || currentUser.grade || 'ثبت نشده'} | 
              استان: {currentUser.provinceName || currentUser.studentProvince || currentUser.province || 'ثبت نشده'}
            </p>
          )}
        </div>
      </header>

      {loading ? (
        <div className={styles.listContainer}>
          <p style={{ textAlign: 'center', opacity: 0.7 }}>در حال بارگذاری آزمون‌ها...</p>
        </div>
      ) : (
        <div className={styles.listContainer}>
          {filteredExams.length === 0 ? (
            <p style={{ opacity: 0.6, textAlign: 'center', marginTop: '2rem' }}>
              آزمونی متناسب با مشخصات شما یافت نشد.
            </p>
          ) : (
            filteredExams.map((exam) => {
              const status = getExamStatus(exam);
              const participated = hasParticipated(exam.id);

              return (
                <div key={exam.id} className={styles.examCard}>
                  <div className={styles.examInfo}>
                    <h3>{exam.title}</h3>
                    
                    <div className={styles.badgeContainer}>
                      <span className={styles.badge}>{gradeNameMap[exam.gradeId] || 'نامشخص'}</span>
                      <span className={styles.badge}>{provinceNameMap[exam.provinceId] || 'نامشخص'}</span>
                      <span className={styles.badge}>{subjectNameMap[exam.subjectId] || 'نامشخص'}</span>
                      <span className={`${styles.badge} ${styles[status]}`}>
                        {getExamStatusLabel(status)}
                      </span>
                    </div>

                    <p>مدت زمان: {exam.duration} دقیقه</p>
                    <p>زمان شروع: {exam.startTime ? exam.startTime.replace('T', ' ') : 'نامشخص'}</p>
                    <p>زمان پایان: {exam.endTime ? exam.endTime.replace('T', ' ') : 'نامشخص'}</p>
                  </div>

                  <div className={styles.examActions}>
                    {participated ? (
                      /* اصلاح شده: هدایت به صفحه نتیجه در مسیر /exams/[id]/result طبق تصویر */
                      <Link href={`/exams/${exam.id}/result`}>
                        <button className={styles.reportBtn}>📊 مشاهده کارنامه</button>
                      </Link>
                    ) : status === 'active' ? (
                      <Link href={`/exams/${exam.id}`}>
                        <button className={styles.startBtn}>▶ شرکت در آزمون</button>
                      </Link>
                    ) : (
                      <button className={styles.disabledBtn} disabled>
                        {status === 'pending' ? '🕒 شروع نشده' : '🏁 زمان پایان یافته'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
