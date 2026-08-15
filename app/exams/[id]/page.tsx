'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './ExamPage.module.css';

type ExamMode = 'file' | 'builder';
type ExamStatus = 'not-started' | 'active' | 'finished' | 'unknown';

interface ExamQuestion {
  id: string;
  text: string;
  options: string[];
  correctOption: number;
  points: number;
  imageUrl?: string;
  source: 'new' | 'bank';
  bankQuestionId?: string;
}

interface Exam {
  id: string;
  title: string;
  targetType: 'all' | 'specific';
  gradeId: string;
  provinceId: string;
  subjectId: string;
  userIds: string[];
  startTime: string;
  endTime: string;
  duration: number;
  examMode: ExamMode;
  fileUrl?: string;
  questions: ExamQuestion[];
  createdAt: string;
  createdBy?: string;
  questionsSyncedToBank?: boolean;
}

interface StoredAttempt {
  attemptId: string;
  examId: string;
  startedAt: string;
  answers: Record<string, number>;
}

interface ExamResult {
  attemptId: string;
  examId: string;
  examTitle: string;
  studentId?: string;
  studentName?: string;
  gradeName?: string;
  provinceName?: string;
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

// گسترش اینترفیس کاربر جاری برای پشتیبانی از تمامی فرمت‌های ذخیره‌سازی داده
interface CurrentUser {
  id?: string;
  name?: string;
  fullName?: string;
  studentName?: string;
  firstName?: string;
  lastName?: string;
  gradeName?: string;
  studentGrade?: string;
  grade?: string | number;
  provinceName?: string;
  studentProvince?: string;
  province?: string | string[];
  city?: string | string[];
}

const EXAMS_KEY = 'exams';
const EXAM_RESULTS_KEY = 'exam_results';
const CURRENT_USER_KEY = 'currentUser';

const getAttemptKey = (examId: string) => `exam_attempt_${examId}`;
const getLatestResultKey = (examId: string) => `latest_exam_result_${examId}`;

// توابع کمکی برای نرمال‌سازی متون فارسی و استخراج صحیح فیلدها
const normalizeText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractDisplayName = (user: CurrentUser | null): string => {
  if (!user) return 'دانش‌آموز نامشخص';
  const directName =
    normalizeText(user.studentName) ||
    normalizeText(user.fullName) ||
    normalizeText(user.name);

  if (directName) return directName;

  const firstName = normalizeText(user.firstName);
  const lastName = normalizeText(user.lastName);
  const combined = `${firstName} ${lastName}`.trim();

  return combined || 'دانش‌آموز نامشخص';
};

const extractGradeName = (user: CurrentUser | null): string => {
  if (!user) return 'نامشخص';
  return (
    normalizeText(user.gradeName) ||
    normalizeText(user.studentGrade) ||
    normalizeText(user.grade) ||
    'نامشخص'
  );
};

const extractProvinceName = (user: CurrentUser | null): string => {
  if (!user) return 'نامشخص';

  const provinceValue = Array.isArray(user.province)
    ? user.province[0]
    : user.province;

  const cityValue = Array.isArray(user.city)
    ? user.city[0]
    : user.city;

  return (
    normalizeText(user.provinceName) ||
    normalizeText(user.studentProvince) ||
    normalizeText(provinceValue) ||
    normalizeText(cityValue) ||
    'نامشخص'
  );
};

export default function ExamStartPage() {
  const params = useParams();
  const router = useRouter();
  const examId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attemptId, setAttemptId] = useState<string>('');
  const [startedAt, setStartedAt] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXAMS_KEY);
      const exams: Exam[] = raw ? JSON.parse(raw) : [];
      const foundExam = exams.find((item) => item.id === examId) || null;
      setExam(foundExam);

      const latestResult = localStorage.getItem(getLatestResultKey(examId));
      setHasSubmittedBefore(!!latestResult);
    } catch (error) {
      console.error('Error loading exam:', error);
      setExam(null);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const examStatus = useMemo<ExamStatus>(() => {
    if (!exam) return 'unknown';

    const now = new Date();
    const start = exam.startTime ? new Date(exam.startTime) : null;
    const end = exam.endTime ? new Date(exam.endTime) : null;

    if (start && now < start) return 'not-started';
    if (start && end && now >= start && now <= end) return 'active';
    if (end && now > end) return 'finished';
    return 'unknown';
  }, [exam]);

  useEffect(() => {
    if (!exam || exam.examMode !== 'builder') return;
    if (hasSubmittedBefore) return;

    try {
      const rawAttempt = localStorage.getItem(getAttemptKey(exam.id));
      if (!rawAttempt) return;

      const parsedAttempt: StoredAttempt = JSON.parse(rawAttempt);
      const startMs = new Date(parsedAttempt.startedAt).getTime();
      const endMs = startMs + exam.duration * 60 * 1000;
      const nowMs = Date.now();

      if (nowMs >= endMs) {
        handleSubmit(parsedAttempt.answers, parsedAttempt.attemptId, parsedAttempt.startedAt, true);
        return;
      }

      setStarted(true);
      setSubmitted(false);
      setAnswers(parsedAttempt.answers || {});
      setAttemptId(parsedAttempt.attemptId);
      setStartedAt(parsedAttempt.startedAt);
      setRemainingSeconds(Math.max(0, Math.floor((endMs - nowMs) / 1000)));
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error restoring attempt:', error);
    }
  }, [exam, hasSubmittedBefore]);

  useEffect(() => {
    if (!exam || !started || submitted || !startedAt) return;

    const interval = setInterval(() => {
      const startMs = new Date(startedAt).getTime();
      const endMs = startMs + exam.duration * 60 * 1000;
      const nowMs = Date.now();
      const seconds = Math.max(0, Math.floor((endMs - nowMs) / 1000));

      setRemainingSeconds(seconds);

      if (seconds <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        clearInterval(interval);
        handleSubmit(answers, attemptId, startedAt, true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [exam, started, submitted, startedAt, answers, attemptId]);

  const statusLabel: Record<ExamStatus, string> = {
    'not-started': 'در انتظار شروع',
    active: 'فعال',
    finished: 'پایان یافته',
    unknown: 'نامشخص',
  };

  const statusClassMap: Record<ExamStatus, string> = {
    'not-started': styles.statusPending,
    active: styles.statusActive,
    finished: styles.statusFinished,
    unknown: styles.statusUnknown,
  };

  const formatDateTime = (date: string) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleString('fa-IR');
    } catch {
      return date;
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalScore = useMemo(() => {
    return exam?.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0;
  }, [exam]);

  const answeredCount = useMemo(() => {
    if (!exam) return 0;
    return exam.questions.filter((q) => answers[q.id] !== undefined).length;
  }, [exam, answers]);

  const currentQuestion = useMemo(() => {
    if (!exam || !exam.questions.length) return null;
    return exam.questions[currentQuestionIndex] || null;
  }, [exam, currentQuestionIndex]);

  const saveAttempt = (payload: StoredAttempt) => {
    localStorage.setItem(getAttemptKey(payload.examId), JSON.stringify(payload));
  };

  const removeAttempt = (examIdToRemove: string) => {
    localStorage.removeItem(getAttemptKey(examIdToRemove));
  };

  const handleStartExam = () => {
    if (!exam || exam.examMode !== 'builder') return;
    if (examStatus !== 'active') return;
    if (hasSubmittedBefore) return;

    const newAttemptId = `ATT-${Date.now()}`;
    const now = new Date().toISOString();

    const newAttempt: StoredAttempt = {
      attemptId: newAttemptId,
      examId: exam.id,
      startedAt: now,
      answers: {},
    };

    saveAttempt(newAttempt);
    setAttemptId(newAttemptId);
    setStartedAt(now);
    setAnswers({});
    setStarted(true);
    setSubmitted(false);
    setRemainingSeconds(exam.duration * 60);
    setCurrentQuestionIndex(0);
    autoSubmittedRef.current = false;
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (!exam || !started || submitted || remainingSeconds <= 0) return;

    const updatedAnswers = {
      ...answers,
      [questionId]: optionIndex,
    };

    setAnswers(updatedAnswers);

    if (attemptId && startedAt) {
      saveAttempt({
        attemptId,
        examId: exam.id,
        startedAt,
        answers: updatedAnswers,
      });
    }
  };

  const handleSubmit = (
    providedAnswers?: Record<string, number>,
    providedAttemptId?: string,
    providedStartedAt?: string,
    isAutoSubmit = false
  ) => {
    if (!exam || exam.examMode !== 'builder') return;
    if (submitted || hasSubmittedBefore) return;

    const finalAnswers = providedAnswers ?? answers;
    const finalAttemptId = providedAttemptId ?? attemptId ?? `ATT-${Date.now()}`;
    const finalStartedAt = providedStartedAt ?? startedAt ?? new Date().toISOString();

    const questionResults = exam.questions.map((q) => {
      const selectedOption = finalAnswers[q.id];
      const isCorrect = selectedOption === q.correctOption;
      const earnedPoints = isCorrect ? q.points : 0;

      return {
        questionId: q.id,
        isCorrect,
        selectedOption: selectedOption ?? null,
        correctOption: q.correctOption,
        points: q.points,
        earnedPoints,
      };
    });

    const score = questionResults.reduce((sum, item) => sum + item.earnedPoints, 0);
    const answered = exam.questions.filter((q) => finalAnswers[q.id] !== undefined).length;

    // استخراج اطلاعات کاربری با مکانیزم جامع نرمال‌سازی فیلدهای هویتی
    let currentUser: CurrentUser | null = null;
    try {
      const rawUser = localStorage.getItem(CURRENT_USER_KEY);
      currentUser = rawUser ? JSON.parse(rawUser) : null;
    } catch (error) {
      console.error('Error parsing currentUser:', error);
    }

    const studentName = extractDisplayName(currentUser);
    const gradeName = extractGradeName(currentUser);
    const provinceName = extractProvinceName(currentUser);
    const studentId = normalizeText(currentUser?.id) || `anonymous-${Date.now()}`;

    const result: ExamResult = {
      attemptId: finalAttemptId,
      examId: exam.id,
      examTitle: exam.title,
      studentId,
      studentName,
      gradeName,
      provinceName,
      submittedAt: new Date().toISOString(),
      startedAt: finalStartedAt,
      duration: exam.duration,
      score,
      totalScore: exam.questions.reduce((sum, q) => sum + q.points, 0),
      answeredCount: answered,
      totalQuestions: exam.questions.length,
      answers: finalAnswers,
      questionResults,
    };

    try {
      const rawResults = localStorage.getItem(EXAM_RESULTS_KEY);
      const results: ExamResult[] = rawResults ? JSON.parse(rawResults) : [];
      
      const existingIndex = results.findIndex(
        (r) => r.examId === exam.id && r.studentId === studentId
      );

      if (existingIndex !== -1) {
        results[existingIndex] = result;
      } else {
        results.push(result);
      }

      localStorage.setItem(EXAM_RESULTS_KEY, JSON.stringify(results));
      localStorage.setItem(getLatestResultKey(exam.id), JSON.stringify(result));
      removeAttempt(exam.id);
      setHasSubmittedBefore(true);
    } catch (error) {
      console.error('Error saving exam result:', error);
    }

    setSubmitted(true);
    setStarted(false);
    setRemainingSeconds(0);

    router.push(`/exams/${exam.id}/result${isAutoSubmit ? '?autoSubmitted=1' : ''}`);
  };

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNextQuestion = () => {
    if (!exam) return;
    setCurrentQuestionIndex((prev) => Math.min(exam.questions.length - 1, prev + 1));
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>در حال بارگذاری آزمون...</div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className={styles.page}>
        <div className={styles.notFoundCard}>
          <h2>آزمون پیدا نشد</h2>
          <p>ممکن است شناسه آزمون اشتباه باشد یا آزمون حذف شده باشد.</p>
          <button className={styles.secondaryBtn} onClick={() => router.back()}>
            بازگشت
          </button>
        </div>
      </div>
    );
  }

  const canStartBuilderExam =
    exam.examMode === 'builder' &&
    examStatus === 'active' &&
    !started &&
    !hasSubmittedBefore;

  const disableOptions = !started || submitted || remainingSeconds <= 0;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = !!exam.questions.length && currentQuestionIndex === exam.questions.length - 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            ← بازگشت
          </button>
        </div>

        <section className={styles.heroCard}>
          <div className={styles.heroContent}>
            <div>
              <div className={styles.heroBadge}>صفحه آزمون</div>
              <h1 className={styles.title}>{exam.title}</h1>
              <p className={styles.subtitle}>
                اطلاعات کامل آزمون، زمان‌بندی و محتوای سوالات در این صفحه نمایش داده می‌شود.
              </p>
            </div>

            <div className={`${styles.statusBadge} ${statusClassMap[examStatus]}`}>
              {statusLabel[examStatus]}
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>کد آزمون</span>
              <span className={styles.infoValue}>{exam.id}</span>
            </div>

            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>نوع آزمون</span>
              <span className={styles.infoValue}>
                {exam.examMode === 'builder' ? 'طراحی داخلی' : 'فایل PDF'}
              </span>
            </div>

            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>مدت زمان</span>
              <span className={styles.infoValue}>{exam.duration} دقیقه</span>
            </div>

            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>تعداد سوالات</span>
              <span className={styles.infoValue}>{exam.questions?.length || 0}</span>
            </div>

            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>مجموع نمره</span>
              <span className={styles.infoValue}>{totalScore}</span>
            </div>

            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>زمان شروع</span>
              <span className={styles.infoValue}>{formatDateTime(exam.startTime)}</span>
            </div>

            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>زمان پایان</span>
              <span className={styles.infoValue}>{formatDateTime(exam.endTime)}</span>
            </div>
          </div>
        </section>

        {hasSubmittedBefore && (
          <div className={`${styles.alertBox} ${styles.alertInfo}`}>
            شما قبلاً یک‌بار در این آزمون شرکت کرده‌اید و امکان شروع مجدد وجود ندارد.
          </div>
        )}

        {examStatus === 'not-started' && (
          <div className={`${styles.alertBox} ${styles.alertWarning}`}>
            این آزمون هنوز شروع نشده است.
          </div>
        )}

        {examStatus === 'finished' && !hasSubmittedBefore && (
          <div className={`${styles.alertBox} ${styles.alertDanger}`}>
            زمان این آزمون به پایان رسیده است.
          </div>
        )}

        {exam.examMode === 'file' ? (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>فایل آزمون</h2>
              <p>در این بخش می‌توانید فایل آزمون را مشاهده یا دانلود کنید.</p>
            </div>

            {exam.fileUrl ? (
              <div className={styles.fileBox}>
                <div>
                  <h3 className={styles.fileTitle}>فایل بارگذاری شده</h3>
                  <p className={styles.fileDesc}>برای مشاهده فایل، روی دکمه زیر کلیک کنید.</p>
                </div>

                <a
                  href={exam.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.primaryBtn}
                >
                  مشاهده / دانلود فایل
                </a>
              </div>
            ) : (
              <div className={styles.emptyState}>فایلی برای این آزمون ثبت نشده است.</div>
            )}
          </section>
        ) : (
          <>
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2>کنترل آزمون</h2>
                <p>ابتدا آزمون را شروع کنید، سپس به سوالات پاسخ دهید و در پایان ثبت نهایی را بزنید.</p>
              </div>

              <div className={styles.examControlBar}>
                <div className={styles.timerCard}>
                  <span className={styles.timerLabel}>زمان باقی‌مانده</span>
                  <span className={styles.timerValue}>
                    {started ? formatTime(remainingSeconds) : `${exam.duration}:00`}
                  </span>
                </div>

                <div className={styles.progressCard}>
                  <span className={styles.timerLabel}>پاسخ داده شده</span>
                  <span className={styles.timerValue}>
                    {answeredCount} / {exam.questions.length}
                  </span>
                </div>

                <div className={styles.actionButtons}>
                  {hasSubmittedBefore ? (
                    <button
                      className={styles.primaryBtn}
                      onClick={() => router.push(`/exams/${exam.id}/result`)}
                    >
                      مشاهده نتیجه
                    </button>
                  ) : !started ? (
                    <button
                      className={styles.startBtn}
                      onClick={handleStartExam}
                      disabled={!canStartBuilderExam}
                    >
                      شروع آزمون
                    </button>
                  ) : (
                    <button
                      className={styles.submitBtn}
                      onClick={() => handleSubmit()}
                      disabled={submitted || remainingSeconds <= 0}
                    >
                      ثبت نهایی
                    </button>
                  )}
                </div>
              </div>

              {started && !submitted && (
                <div className={`${styles.alertBox} ${styles.alertInfo}`}>
                  آزمون شروع شده است. پس از اتمام زمان یا ثبت نهایی، امکان تغییر پاسخ‌ها وجود ندارد.
                </div>
              )}
            </section>

            {!started && !hasSubmittedBefore && (
              <section className={styles.sectionCard}>
                <div className={styles.emptyState}>
                  برای مشاهده سوالات، ابتدا روی دکمه «شروع آزمون» کلیک کنید.
                </div>
              </section>
            )}

            {started && currentQuestion && (
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2>سوالات آزمون</h2>
                  <p>
                    سوال {currentQuestionIndex + 1} از {exam.questions.length}
                  </p>
                </div>

                <article className={styles.questionCard}>
                  <div className={styles.questionHeader}>
                    <div className={styles.questionNumber}>
                      سوال {currentQuestionIndex + 1}
                    </div>

                    <div className={styles.questionMeta}>
                      <span className={styles.metaBadge}>{currentQuestion.points} نمره</span>
                      <span className={styles.metaBadge}>
                        {currentQuestion.source === 'bank' ? 'از بانک سوال' : 'سوال جدید'}
                      </span>
                    </div>
                  </div>

                  <p className={styles.questionText}>{currentQuestion.text}</p>

                  {currentQuestion.imageUrl && (
                    <div className={styles.questionImageWrapper}>
                      <img
                        src={currentQuestion.imageUrl}
                        alt={`question-${currentQuestionIndex + 1}`}
                        className={styles.questionImage}
                      />
                    </div>
                  )}

                  <div className={styles.optionRadioList}>
                    {currentQuestion.options.map((opt, i) => {
                      const checked = answers[currentQuestion.id] === i;

                      return (
                        <label
                          key={i}
                          className={`${styles.optionRadioItem} ${
                            checked ? styles.optionRadioItemSelected : ''
                          } ${disableOptions ? styles.optionDisabled : ''}`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            checked={checked}
                            disabled={disableOptions}
                            onChange={() => handleSelectOption(currentQuestion.id, i)}
                            className={styles.radioInput}
                          />
                          <span className={styles.optionIndex}>{i + 1}</span>
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginTop: '20px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      className={styles.secondaryBtn}
                      onClick={goToPreviousQuestion}
                      disabled={isFirstQuestion}
                      style={{
                        opacity: isFirstQuestion ? 0.5 : 1,
                        cursor: isFirstQuestion ? 'not-allowed' : 'pointer',
                      }}
                    >
                      سوال قبلی
                    </button>

                    <button
                      className={styles.primaryBtn}
                      onClick={goToNextQuestion}
                      style={{
                        opacity: isLastQuestion ? 0.5 : 1,
                        pointerEvents: isLastQuestion ? 'none' : 'auto',
                      }}
                    >
                      سوال بعدی
                    </button>
                  </div>
                </article>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
