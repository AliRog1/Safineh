'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

interface ExamQuestion {
  id: string;
  text: string;
  options: string[];
  correctOption: number;
  points: number;
  imageUrl?: string;
}

interface Exam {
  id: string;
  title: string;
  duration: number;
  questions: ExamQuestion[];
  endTime?: string;
}

interface ExamResult {
  attemptId: string;
  examId: string;
  examTitle: string;
  submittedAt: string;
  startedAt: string;
  duration: number;
  score: number;
  totalScore: number;
  answeredCount: number;
  totalQuestions: number;
  answers: Record<string, number>;
  questionResults: {
    questionId: string;
    isCorrect: boolean;
    selectedOption: number | null;
    correctOption: number;
    points: number;
    earnedPoints: number;
  }[];
}

interface CurrentUser {
  id?: string;
  name?: string;
  fullName?: string;
  role?: string;
  userType?: string;
  type?: string;
}

const EXAMS_KEY = 'exams';

const normalizeText = (value: unknown): string => {
  if (value == null) return '';
  return String(value).trim().toLowerCase();
};

const getUserRole = (user: CurrentUser | null): string => {
  if (!user) return '';

  return (
    normalizeText(user.role) ||
    normalizeText(user.userType) ||
    normalizeText(user.type)
  );
};

const getExamListRouteByRole = (role: string): string => {
  switch (role) {
    case 'admin':
      return '/admin/exams';

    case 'teacher':
    case 'mentor':
    case 'support':
      return '/teacher/exams';

    case 'student':
      return '/student/exams';

    default:
      return '/';
  }
};

export default function ExamResultPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const autoSubmitted = searchParams.get('autoSubmitted') === '1';

  const [exam, setExam] = useState<Exam | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const rawExams = localStorage.getItem(EXAMS_KEY);
      const exams: Exam[] = rawExams ? JSON.parse(rawExams) : [];
      const foundExam = exams.find((item) => item.id === examId) || null;
      setExam(foundExam);

      const rawLatestResult = localStorage.getItem(`latest_exam_result_${examId}`);
      const latestResult: ExamResult | null = rawLatestResult ? JSON.parse(rawLatestResult) : null;
      setResult(latestResult);

      const currentUserRaw = localStorage.getItem('currentUser');
      const userRaw = localStorage.getItem('user');
      const parsedUser: CurrentUser | null = currentUserRaw
        ? JSON.parse(currentUserRaw)
        : userRaw
        ? JSON.parse(userRaw)
        : null;

      setCurrentUser(parsedUser);
    } catch (error) {
      console.error('Error loading result:', error);
      setResult(null);
      setExam(null);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const isExamFinished = useMemo(() => {
    if (!exam?.endTime) return false;
    return new Date() >= new Date(exam.endTime);
  }, [exam]);

  const correctCount = useMemo(() => {
    return result?.questionResults.filter((q) => q.isCorrect).length || 0;
  }, [result]);

  const wrongCount = useMemo(() => {
    return result?.questionResults.filter(
      (q) => q.selectedOption !== null && !q.isCorrect
    ).length || 0;
  }, [result]);

  const unansweredCount = useMemo(() => {
    return result?.questionResults.filter((q) => q.selectedOption === null).length || 0;
  }, [result]);

  const backToPanelRoute = useMemo(() => {
    const role = getUserRole(currentUser);
    return getExamListRouteByRole(role);
  }, [currentUser]);

  if (loading) {
    return <div style={pageStyle}>در حال بارگذاری نتیجه آزمون...</div>;
  }

  if (!exam) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2>آزمونی برای این شناسه پیدا نشد</h2>
          <button style={buttonStyle} onClick={() => router.push(`/exams/${examId}`)}>
            بازگشت به صفحه آزمون
          </button>
        </div>
      </div>
    );
  }

  if (!isExamFinished) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={warningStyle}>
            نتیجه این آزمون پس از پایان زمان آزمون قابل مشاهده است.
          </div>

          <button style={buttonStyle} onClick={() => router.push(`/exams/${examId}`)}>
            بازگشت به صفحه آزمون
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2>نتیجه‌ای برای این آزمون پیدا نشد</h2>
          <button style={buttonStyle} onClick={() => router.push(`/exams/${examId}`)}>
            بازگشت به صفحه آزمون
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={badgeStyle}>نتیجه آزمون</div>
          <h1 style={{ marginTop: 0 }}>{result.examTitle}</h1>

          {autoSubmitted && (
            <div style={warningStyle}>
              زمان آزمون به پایان رسید و پاسخ‌ها به صورت خودکار ثبت شدند.
            </div>
          )}

          <div style={gridStyle}>
            <div style={statCardStyle}>
              <span style={labelStyle}>نمره کسب‌شده</span>
              <strong style={valueStyle}>
                {result.score} / {result.totalScore}
              </strong>
            </div>

            <div style={statCardStyle}>
              <span style={labelStyle}>پاسخ صحیح</span>
              <strong style={valueStyle}>{correctCount}</strong>
            </div>

            <div style={statCardStyle}>
              <span style={labelStyle}>پاسخ غلط</span>
              <strong style={valueStyle}>{wrongCount}</strong>
            </div>

            <div style={statCardStyle}>
              <span style={labelStyle}>بدون پاسخ</span>
              <strong style={valueStyle}>{unansweredCount}</strong>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h2>جزئیات سوالات</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {exam.questions.map((question, index) => {
              const qResult = result.questionResults.find((x) => x.questionId === question.id);

              return (
                <div key={question.id} style={questionCardStyle}>
                  <div style={{ marginBottom: 10, fontWeight: 800 }}>
                    سوال {index + 1}: {question.text}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {question.options.map((option, optionIndex) => {
                      const isSelected = qResult?.selectedOption === optionIndex;
                      const isCorrect = qResult?.correctOption === optionIndex;

                      return (
                        <div
                          key={optionIndex}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 12,
                            border: '1px solid #ddd',
                            background: isCorrect
                              ? '#dcfce7'
                              : isSelected
                              ? '#fee2e2'
                              : '#f8fafc',
                            color: '#0f172a',
                            fontWeight: isSelected || isCorrect ? 700 : 500,
                          }}
                        >
                          {option}
                          {isSelected ? ' (انتخاب شما)' : ''}
                          {isCorrect ? ' (پاسخ صحیح)' : ''}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 12, color: '#475569', fontWeight: 700 }}>
                    نمره این سوال: {qResult?.earnedPoints ?? 0} از {question.points}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button style={buttonStyle} onClick={() => router.push(backToPanelRoute)}>
              بازگشت به لیست آزمون‌ها
            </button>

            <button style={secondaryButtonStyle} onClick={() => router.push(`/exams/${examId}`)}>
              بازگشت به صفحه آزمون
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
  padding: '24px',
  direction: 'rtl',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '24px',
  padding: '24px',
  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
  border: '1px solid #e2e8f0',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#dbeafe',
  color: '#1d4ed8',
  padding: '8px 14px',
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: 800,
  marginBottom: '14px',
};

const warningStyle: React.CSSProperties = {
  background: '#fff7ed',
  color: '#9a3412',
  border: '1px solid #fdba74',
  borderRadius: '14px',
  padding: '14px 16px',
  marginBottom: '16px',
  fontWeight: 700,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
};

const statCardStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '18px',
  padding: '18px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '13px',
  fontWeight: 700,
};

const valueStyle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '24px',
};

const questionCardStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: '18px',
  padding: '18px',
  background: '#fff',
};

const buttonStyle: React.CSSProperties = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  padding: '12px 18px',
  fontWeight: 800,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  background: '#0f172a',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  padding: '12px 18px',
  fontWeight: 800,
  cursor: 'pointer',
};
