'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './reports.module.css';

interface Exam {
  id: string;
  title: string;
}

interface StoredExamResult {
  attemptId: string;
  examId: string;
  examTitle?: string;
  submittedAt: string;
  startedAt?: string;
  duration?: number;
  score: number;
  totalScore: number;
  answeredCount?: number;
  totalQuestions?: number;
  answers?: Record<string, number>;
  questionResults?: {
    questionId: string;
    isCorrect: boolean;
    selectedOption: number | null;
    correctOption: number;
    points: number;
    earnedPoints: number;
  }[];
  studentName?: string;
  gradeName?: string;
  provinceName?: string;
}

interface ReportRow {
  id: string;
  examId: string;
  studentName: string;
  gradeName: string;
  provinceName: string;
  score: number;
  totalPoints: number;
  status: 'passed' | 'failed';
  date: string;
}

export default function ExamReportPage() {
  const params = useParams();
  const router = useRouter();
  const examId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const [exam, setExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedExams = localStorage.getItem('exams');
      const allExams: Exam[] = storedExams ? JSON.parse(storedExams) : [];
      const currentExam = allExams.find((e) => e.id === examId);

      if (!currentExam) {
        setExam(null);
        setResults([]);
        setLoading(false);
        return;
      }

      setExam(currentExam);

      const allResultsRaw = localStorage.getItem('exam_results');
      const allResults: StoredExamResult[] = allResultsRaw ? JSON.parse(allResultsRaw) : [];

      const filteredResults = allResults
        .filter((r) => r.examId === examId)
        .map((r, index): ReportRow => {
          const totalPoints = Number(r.totalScore ?? 0);
          const score = Number(r.score ?? 0);

          return {
            id: r.attemptId || `${r.examId}-${index}`, // key یکتا
            examId: r.examId,
            studentName: r.studentName || `دانش‌آموز ${index + 1}`,
            gradeName: r.gradeName || '-',
            provinceName: r.provinceName || '-',
            score,
            totalPoints,
            status: totalPoints > 0 && score >= totalPoints * 0.5 ? 'passed' : 'failed',
            date: r.submittedAt
              ? new Date(r.submittedAt).toLocaleString('fa-IR')
              : '-',
          };
        });

      setResults(filteredResults);
    } catch (error) {
      console.error('Error loading exam report:', error);
      setExam(null);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className={styles.loading}>در حال بارگذاری اطلاعات واقعی...</div>;
  }

  if (!exam) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <h2>⚠️ آزمون مورد نظر یافت نشد</h2>
          <p>ممکن است این آزمون حذف شده باشد یا آدرس اشتباه است.</p>
          <button onClick={() => router.push('/admin/exams')} className={styles.backBtn}>
            بازگشت به لیست آزمون‌ها
          </button>
        </div>
      </div>
    );
  }

  const totalParticipants = results.length;
  const averageScore =
    totalParticipants > 0
      ? (results.reduce((acc, curr) => acc + curr.score, 0) / totalParticipants).toFixed(2)
      : '0.00';

  const passedCount = results.filter((r) => r.status === 'passed').length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.topLabel}>گزارش تحلیلی مدیریت</span>
          <h1>{exam.title}</h1>
          <p className={styles.examIdTag}>کد آزمون: {exam.id}</p>
        </div>

        <div className={styles.actions}>
          {totalParticipants > 0 && (
            <button onClick={handlePrint} className={styles.printBtn}>
              🖨️ خروجی PDF / چاپ گزارش
            </button>
          )}
          <button onClick={() => router.back()} className={styles.backBtn}>
            بازگشت
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statInfo}>
            <h3>شرکت‌کنندگان</h3>
            <p>{totalParticipants} نفر</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📈</div>
          <div className={styles.statInfo}>
            <h3>میانگین نمرات</h3>
            <p>{averageScore}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statInfo}>
            <h3>تعداد قبولی</h3>
            <p className={styles.successText}>{passedCount} نفر</p>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {totalParticipants > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ردیف</th>
                <th>نام دانش‌آموز</th>
                <th>پایه تحصیلی</th>
                <th>استان</th>
                <th>نمره کسب شده</th>
                <th>وضعیت نهایی</th>
                <th>تاریخ شرکت</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res, index) => (
                <tr key={res.id}>
                  <td>{index + 1}</td>
                  <td className={styles.studentName}>{res.studentName}</td>
                  <td>{res.gradeName}</td>
                  <td>{res.provinceName}</td>
                  <td className={styles.scoreCell}>
                    {res.score} <small>از {res.totalPoints}</small>
                  </td>
                  <td>
                    <span
                      className={
                        res.status === 'passed' ? styles.statusSuccess : styles.statusFail
                      }
                    >
                      {res.status === 'passed' ? 'قبول' : 'مردود'}
                    </span>
                  </td>
                  <td>{res.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.noData}>
            <div className={styles.noDataIcon}>🔍</div>
            <p>تاکنون هیچ دانش‌آموزی در این آزمون شرکت نکرده است.</p>
            <span>داده‌ها بلافاصله پس از اتمام اولین آزمون در اینجا ظاهر می‌شوند.</span>
          </div>
        )}
      </div>
    </div>
  );
}
