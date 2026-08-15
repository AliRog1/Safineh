'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import styles from './questions.module.css';

type QuestionType = 'mcq' | 'file';
type QuestionStatus = 'pending' | 'approved' | 'rejected';

interface Question {
  id: string;
  title: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctOption?: number; // 0, 1, 2, 3
  gradeId: string;
  provinceId: string;
  subjectId: string;
  status: QuestionStatus;
  attachmentUrl?: string;
  attachmentName?: string;
  answerExplanation?: string;
  answerAttachmentUrl?: string;
  answerAttachmentName?: string;
  answerSheetUrl?: string;
  answerSheetName?: string;
  answerSheet?: string;
  answerAttachment?: string;
  createdAt: string;
}

interface BaseItem {
  id: string;
  name: string;
}

type SessionMode = 'practice' | 'exam';

interface AnswerModalData {
  title: string;
  textExplanation?: string;
  fileUrl?: string;
  fileName?: string;
}

const STORAGE_KEY = 'questions';
const GRADES_KEY = 'grades';
const PROVINCES_KEY = 'provinces';
const SUBJECTS_KEY = 'subjects';
const CURRENT_USER_KEY = 'currentUser';
const ALL_PROVINCES_VALUE = 'all-provinces';
const SECONDS_PER_QUESTION = 3 * 60; // ۳ دقیقه برای هر سوال

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isImageUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  return /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url);
}

function isPdfUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:application/pdf')) return true;
  return /\.pdf(\?.*)?$/i.test(url);
}

function getAnswerFileUrl(q: Question): string | null {
  return q.answerAttachmentUrl || q.answerSheetUrl || q.answerAttachment || q.answerSheet || null;
}

function getAnswerFileName(q: Question): string {
  return q.answerAttachmentName || q.answerSheetName || 'فایل_پاسخنامه';
}

export default function StudentQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [grades, setGrades] = useState<BaseItem[]>([]);
  const [provinces, setProvinces] = useState<BaseItem[]>([]);
  const [subjects, setSubjects] = useState<BaseItem[]>([]);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // وضعیت‌های جریان کاربری
  const [flowStep, setFlowStep] = useState<'select-mode' | 'configure' | 'active-session' | 'report'>('select-mode');
  const [selectedMode, setSelectedMode] = useState<SessionMode | null>(null);

  // پیکربندی چند درسی: شناسه درس -> تعداد سوالات
  const [selectedSubjectsConfig, setSelectedSubjectsConfig] = useState<Record<string, number>>({});

  // جلسه فعال
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});

  // مدیریت زمان آزمون
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const hasFinishedRef = useRef(false);
  const totalDurationRef = useRef(0); // ذخیره زمان اولیه کل آزمون

  // ثبت پاسخ داده شده در تمرین
  const [revealedPracticeAnswers, setRevealedPracticeAnswers] = useState<Record<string, boolean>>({});

  // مدال نمایش پاسخ تشریحی / فایل
  const [activeModal, setActiveModal] = useState<AnswerModalData | null>(null);

  // کارنامه
  const [reportData, setReportData] = useState<{
    total: number;
    correct: number;
    wrong: number;
    empty: number;
    percentage: number;
    timeSpentFormatted?: string; // فرمت دقیقه:ثانیه زمان سپری شده
  } | null>(null);

  useEffect(() => {
    const storedQuestions = safeParse<Question[]>(localStorage.getItem(STORAGE_KEY), []);
    const storedGrades = safeParse<BaseItem[]>(localStorage.getItem(GRADES_KEY), []);
    const storedProvinces = safeParse<BaseItem[]>(localStorage.getItem(PROVINCES_KEY), []);
    const storedSubjects = safeParse<BaseItem[]>(localStorage.getItem(SUBJECTS_KEY), []);
    const storedCurrentUser = safeParse<any>(localStorage.getItem(CURRENT_USER_KEY), null);

    setQuestions(Array.isArray(storedQuestions) ? storedQuestions : []);
    setGrades(Array.isArray(storedGrades) ? storedGrades : []);
    setProvinces(Array.isArray(storedProvinces) ? storedProvinces : []);
    setSubjects(Array.isArray(storedSubjects) ? storedSubjects : []);
    setCurrentStudent(storedCurrentUser);
    setIsLoaded(true);
  }, []);

  // افکت مدیریت تایمر آزمون
  useEffect(() => {
    if (flowStep !== 'active-session' || selectedMode !== 'exam' || !timerStarted) {
      return;
    }

    if (remainingSeconds <= 0) {
      if (!hasFinishedRef.current) {
        hasFinishedRef.current = true;
        handleFinishSession();
      }
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasFinishedRef.current) {
            hasFinishedRef.current = true;
            // تاخیر کوچک برای اعمال استیت نهایی پاسخ‌ها
            setTimeout(() => {
              handleFinishSession();
            }, 50);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [flowStep, selectedMode, timerStarted, remainingSeconds]);

  const gradeMap = useMemo(() => {
    const map: Record<string, string> = {};
    grades.forEach((g) => { map[g.id] = g.name; });
    return map;
  }, [grades]);

  const provinceMap = useMemo(() => {
    const map: Record<string, string> = { [ALL_PROVINCES_VALUE]: 'سراسری' };
    provinces.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [provinces]);

  const subjectMap = useMemo(() => {
    const map: Record<string, string> = {};
    subjects.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [subjects]);

  const availableQuestionsForStudent = useMemo(() => {
    if (!currentStudent) return [];
    const studentGradeId = normalize(currentStudent?.gradeId);
    const studentProvinceId = normalize(currentStudent?.provinceId);
    const studentGradeName = normalize(currentStudent?.grade);
    const studentProvinceName = normalize(currentStudent?.province);

    return questions.filter((q) => {
      if (!q || q.status !== 'approved') return false;
      if (q.type !== 'mcq') return false;

      const qGradeId = normalize(q.gradeId);
      const qProvinceId = normalize(q.provinceId);
      const qGradeName = normalize(gradeMap[q.gradeId]);
      const qProvinceName = normalize(provinceMap[q.provinceId]);

      const matchGrade =
        !q.gradeId ||
        (!studentGradeId && !studentGradeName) ||
        studentGradeId === qGradeId ||
        studentGradeId === qGradeName ||
        studentGradeName === qGradeId ||
        studentGradeName === qGradeName;

      const matchProvince =
        q.provinceId === ALL_PROVINCES_VALUE ||
        !q.provinceId ||
        (!studentProvinceId && !studentProvinceName) ||
        studentProvinceId === qProvinceId ||
        studentProvinceId === qProvinceName ||
        studentProvinceName === qProvinceId ||
        studentProvinceName === qProvinceName;

      return matchGrade && matchProvince;
    });
  }, [questions, currentStudent, gradeMap, provinceMap]);

  const availableSubjectsForStudent = useMemo(() => {
    const subjectIds = new Set(availableQuestionsForStudent.map(q => q.subjectId));
    return subjects.filter(s => subjectIds.has(s.id));
  }, [subjects, availableQuestionsForStudent]);

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjectsConfig(prev => {
      const next = { ...prev };
      if (subjectId in next) {
        delete next[subjectId];
      } else {
        next[subjectId] = 5;
      }
      return next;
    });
  };

  const handleSubjectCountChange = (subjectId: string, count: number) => {
    setSelectedSubjectsConfig(prev => ({
      ...prev,
      [subjectId]: Math.max(1, count)
    }));
  };

  const handleStartSession = () => {
    const activeSubjectConfigs = Object.entries(selectedSubjectsConfig);
    
    if (activeSubjectConfigs.length === 0) {
      alert('لطفاً حداقل یک درس را برای آزمون انتخاب کنید.');
      return;
    }

    let finalSelectedQuestions: Question[] = [];

    for (const [subId, count] of activeSubjectConfigs) {
      const pool = availableQuestionsForStudent.filter(q => q.subjectId === subId);
      if (pool.length === 0) continue;

      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));
      finalSelectedQuestions = [...finalSelectedQuestions, ...selected];
    }

    if (finalSelectedQuestions.length === 0) {
      alert('متاسفانه در درس‌های انتخاب شده، سوالی برای پایه و استان شما یافت نشد.');
      return;
    }

    finalSelectedQuestions.sort(() => 0.5 - Math.random());

    setSessionQuestions(finalSelectedQuestions);
    setUserAnswers({});
    setRevealedPracticeAnswers({});
    hasFinishedRef.current = false;

    if (selectedMode === 'exam') {
      const totalSec = finalSelectedQuestions.length * SECONDS_PER_QUESTION;
      setRemainingSeconds(totalSec);
      totalDurationRef.current = totalSec;
      setTimerStarted(true);
    } else {
      setRemainingSeconds(0);
      totalDurationRef.current = 0;
      setTimerStarted(false);
    }

    setFlowStep('active-session');
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (selectedMode === 'practice') {
      if (revealedPracticeAnswers[questionId]) return;
      setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
      setRevealedPracticeAnswers(prev => ({ ...prev, [questionId]: true }));
    } else {
      setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    }
  };

  const handleFinishSession = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    setTimerStarted(false);

    let correct = 0;
    let wrong = 0;
    let empty = 0;

    sessionQuestions.forEach(q => {
      const chosen = userAnswers[q.id];
      if (chosen === undefined) {
        empty++;
      } else if (chosen === q.correctOption) {
        correct++;
      } else {
        wrong++;
      }
    });

    const total = sessionQuestions.length;
    const percentage = total > 0 
      ? selectedMode === 'exam'
        ? Math.max(0, Math.round((((correct * 3) - wrong) / (total * 3)) * 100))
        : Math.round((correct / total) * 100)
      : 0;

    // محاسبه زمان مصرف‌شده
    let timeSpentFormatted = undefined;
    if (selectedMode === 'exam') {
      const secondsSpent = Math.max(0, totalDurationRef.current - remainingSeconds);
      const min = Math.floor(secondsSpent / 60).toString().padStart(2, '0');
      const sec = (secondsSpent % 60).toString().padStart(2, '0');
      timeSpentFormatted = `${min}:${sec}`;
    }

    setReportData({ total, correct, wrong, empty, percentage, timeSpentFormatted });
    setFlowStep('report');
  };

  const handleReset = () => {
    setSelectedMode(null);
    setSelectedSubjectsConfig({});
    setSessionQuestions([]);
    setUserAnswers({});
    setRevealedPracticeAnswers({});
    setReportData(null);
    setRemainingSeconds(0);
    totalDurationRef.current = 0;
    setTimerStarted(false);
    hasFinishedRef.current = false;
    setFlowStep('select-mode');
  };

  const openAnswerModal = (q: Question) => {
    const fileUrl = getAnswerFileUrl(q) || undefined;
    const fileName = getAnswerFileName(q);
    setActiveModal({
      title: q.title,
      textExplanation: q.answerExplanation,
      fileUrl,
      fileName
    });
  };

  if (!isLoaded) {
    return <div className={styles.container}>در حال بارگذاری...</div>;
  }

  if (!currentStudent) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          اطلاعات دانش‌آموز یافت نشد. لطفاً دوباره وارد حساب کاربری شوید.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      
      {/* ۱. انتخاب حالت کاربری */}
      {flowStep === 'select-mode' && (
        <div className={styles.modeSelectionWrapper} style={{ textAlign: 'center', padding: '40px 0' }}>
          <h1 style={{ marginBottom: '10px' }}>🎯 سیستم خودآزمایی هوشمند</h1>
          <p style={{ color: 'var(--text-label)', marginBottom: '30px' }}>لطفاً نوع شروع کار خود را انتخاب کنید:</p>

          <div className={styles.modeContainer}>
            <div 
              className={styles.modeCard}
              style={{ borderColor: 'var(--success-neon)' }}
              onClick={() => { setSelectedMode('practice'); setFlowStep('configure'); }}
            >
              <div className={styles.modeIcon}>🏋️‍♂️</div>
              <h3 style={{ color: 'var(--success-neon)' }}>حالت تمرین</h3>
              <p>
                پاسخ هر سوال را بلافاصله پس از کلیک ببینید (سبز/قرمز) و پاسخ تشریحی آن را درجا مطالعه کنید.
              </p>
            </div>

            <div 
              className={styles.modeCard}
              style={{ borderColor: 'var(--accent-color)' }}
              onClick={() => { setSelectedMode('exam'); setFlowStep('configure'); }}
            >
              <div className={styles.modeIcon}>⏱️</div>
              <h3 style={{ color: 'var(--accent-color)' }}>آزمون شخصی</h3>
              <p>
                پاسخ‌ها و تحلیل سوالات تا انتهای آزمون مخفی می‌مانند و بعد از ثبت نهایی، تحلیل کامل آزمون باز می‌شود.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ۲. فرم پیکربندی فیلترها و دروس چندگانه */}
      {flowStep === 'configure' && (
        <div style={{ maxWidth: '700px', margin: '30px auto' }} className={styles.card}>
          <button onClick={handleReset} style={{ background: 'transparent', border: 'none', color: 'var(--text-label)', cursor: 'pointer', marginBottom: '15px' }}>
            🔙 بازگشت به منوی قبل
          </button>
          
          <h2 style={{ marginBottom: '20px', color: selectedMode === 'practice' ? 'var(--success-neon)' : 'var(--accent-color)' }}>
            ⚙️ تنظیمات {selectedMode === 'practice' ? 'تمرین تعاملی' : 'آزمون شخصی'} (چند درسی)
          </h2>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
            درس‌های مورد نظر خود را انتخاب کرده و برای هر کدام تعداد سوالات را مشخص نمایید:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
            {availableSubjectsForStudent.map((s) => {
              const isSelected = s.id in selectedSubjectsConfig;
              const count = selectedSubjectsConfig[s.id] || 5;
              const maxAvailable = availableQuestionsForStudent.filter(q => q.subjectId === s.id).length;

              return (
                <div 
                  key={s.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: isSelected ? 'var(--inner-box-bg)' : 'var(--option-row-bg)',
                    border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--card-border)'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSubject(s.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }}
                    />
                    <span>{s.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-label)' }}>({maxAvailable} سوال موجود)</span>
                  </label>

                  {isSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>تعداد سوال:</span>
                      <input
                        type="number"
                        min="1"
                        max={maxAvailable}
                        value={count}
                        onChange={(e) => handleSubjectCountChange(s.id, parseInt(e.target.value) || 1)}
                        style={{
                          width: '60px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--input-border)',
                          background: 'var(--input-bg)',
                          color: 'var(--text-primary)',
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {availableSubjectsForStudent.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-label)', padding: '20px' }}>
                هیچ درسی با سوال فعال تستی برای پایه و استان شما یافت نشد.
              </div>
            )}
          </div>

          <button
            onClick={handleStartSession}
            disabled={Object.keys(selectedSubjectsConfig).length === 0}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: selectedMode === 'practice' ? 'var(--success-neon)' : 'var(--accent-color)',
              color: '#fff',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              opacity: Object.keys(selectedSubjectsConfig).length === 0 ? 0.5 : 1
            }}
          >
            🚀 شروع {selectedMode === 'practice' ? 'تمرین' : 'آزمون'} با {Object.values(selectedSubjectsConfig).reduce((a, b) => a + b, 0)} سوال
          </button>
        </div>
      )}

      {/* ۳. در حین آزمون یا تمرین فعال */}
      {flowStep === 'active-session' && (
        <div>
          {/* بخش تایمر اختصاصی در حالت آزمون */}
          {selectedMode === 'exam' && (
            <div style={{
              marginBottom: '20px',
              padding: '14px 18px',
              borderRadius: '14px',
              background: 'var(--inner-box-bg)',
              border: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 'bold',
              boxShadow: 'var(--shadow-main)'
            }}>
              <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>⏳ زمان باقی‌مانده آزمون</span>
              <span style={{
                color: remainingSeconds <= 60 ? 'var(--danger-neon)' : 'var(--text-primary)',
                fontSize: '20px',
                fontFamily: 'monospace',
                textShadow: remainingSeconds <= 60 ? '0 0 8px var(--danger-neon)' : 'none',
                transition: 'color 0.3s ease'
              }}>
                {Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:
                {(remainingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>
              {selectedMode === 'practice' ? '🏋️‍♂️ در حال تمرین تعاملی' : '⏱️ در حال برگزاری آزمون شخصی'}
            </h2>
            <button 
              onClick={() => {
                hasFinishedRef.current = false;
                handleFinishSession();
              }}
              className={styles.dangerBtn}
              style={{ padding: '10px 20px' }}
            >
              🏁 ثبت نهایی و دریافت کارنامه
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sessionQuestions.map((q, qIdx) => {
              const isRevealed = revealedPracticeAnswers[q.id];
              const chosenOption = userAnswers[q.id];
              const answerFile = getAnswerFileUrl(q);

              return (
                <div 
                  key={q.id} 
                  className={styles.questionItem}
                  style={{
                    borderRight: `5px solid ${selectedMode === 'practice' ? 'var(--success-neon)' : 'var(--accent-color)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-label)' }}>سوال {qIdx + 1} از {sessionQuestions.length}</span>
                    <span style={{ fontSize: '13px', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                      📚 {subjectMap[q.subjectId] || 'درس عمومی'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '17px', marginBottom: '10px', lineHeight: '1.6' }}>{q.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '15px' }}>{q.text}</p>

                  {/* گزینه‌ها */}
                  {q.options && Array.isArray(q.options) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {q.options.map((opt, optIdx) => {
                        let optionStyle: React.CSSProperties = {
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1px solid var(--input-border)',
                          background: 'var(--option-row-bg)',
                          cursor: 'pointer',
                          textAlign: 'right',
                          color: 'var(--text-primary)',
                          transition: 'all 0.15s'
                        };

                        if (selectedMode === 'practice') {
                          if (isRevealed) {
                            if (optIdx === q.correctOption) {
                              optionStyle.background = 'var(--success-glow)';
                              optionStyle.borderColor = 'var(--success-neon)';
                              optionStyle.color = 'var(--success-neon)';
                              optionStyle.fontWeight = 'bold';
                            } else if (chosenOption === optIdx) {
                              optionStyle.background = 'var(--danger-glow)';
                              optionStyle.borderColor = 'var(--danger-neon)';
                              optionStyle.color = 'var(--danger-neon)';
                            }
                          }
                        } else {
                          if (chosenOption === optIdx) {
                            optionStyle.background = 'var(--accent-glow)';
                            optionStyle.borderColor = 'var(--accent-color)';
                            optionStyle.fontWeight = 'bold';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            disabled={selectedMode === 'practice' && isRevealed}
                            style={optionStyle}
                          >
                            <span style={{ marginLeft: '10px', color: 'var(--text-label)' }}>{optIdx + 1})</span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* پاسخ تشریحی در تمرین */}
                  {selectedMode === 'practice' && isRevealed && (
                    <div style={{ 
                      marginTop: '20px', 
                      background: 'var(--success-glow)', 
                      padding: '16px', 
                      borderRadius: '12px', 
                      borderRight: '4px solid var(--success-neon)' 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--success-neon)', fontWeight: 'bold', fontSize: '14px' }}>💡 تحلیل و پاسخ تشریحی:</span>
                        
                        <button
                          onClick={() => openAnswerModal(q)}
                          style={{
                            background: 'var(--success-neon)',
                            color: '#000',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          🔍 مشاهده کامل در پاپ‌آپ
                        </button>
                      </div>

                      <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {q.answerExplanation || (answerFile ? 'پاسخ این سوال به صورت فایل/عکس آپلود شده است. روی دکمه مشاهده در پاپ‌آپ کلیک کنید.' : 'توضیح تشریحی متنی ثبت نشده است.')}
                      </p>

                      {answerFile && (
                        <div style={{ marginTop: '10px' }}>
                          <button
                            onClick={() => openAnswerModal(q)}
                            style={{
                              background: 'var(--scrollbar-thumb)',
                              color: 'var(--accent-color)',
                              border: '1px solid var(--accent-color)',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 'bold'
                            }}
                          >
                            📎 سوال دارای فایل پاسخنامه است (کلیک برای مشاهده)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button 
              onClick={() => {
                hasFinishedRef.current = false;
                handleFinishSession();
              }}
              className={styles.primaryBtn}
              style={{ padding: '16px 36px', fontSize: '16px' }}
            >
              🏁 اتمام آزمون و محاسبه کارنامه
            </button>
          </div>
        </div>
      )}

      {/* ۴. نمایش کارنامه نهایی + تحلیل آزمون */}
      {flowStep === 'report' && reportData && (
        <div style={{ maxWidth: '850px', margin: '30px auto' }}>
          
          <div className={styles.card} style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '64px', marginBottom: '15px' }}>📊</div>
            <h2 style={{ marginBottom: '20px' }}>
              کارنامه {selectedMode === 'practice' ? 'تمرین' : 'آزمون شخصی'}
            </h2>

            <div style={{ 
              fontSize: '48px', 
              fontWeight: 'bold', 
              color: reportData.percentage >= 50 ? 'var(--success-neon)' : 'var(--danger-neon)',
              marginBottom: '25px'
            }}>
              {reportData.percentage}%
              <span style={{ fontSize: '14px', color: 'var(--text-label)', display: 'block', marginTop: '5px' }}>
                {selectedMode === 'exam' ? 'درصد نهایی (با احتساب نمره منفی)' : 'درصد پاسخ‌های درست'}
              </span>
            </div>

            {/* نمایش مدت زمان سپری شده در حالت آزمون */}
            {selectedMode === 'exam' && reportData.timeSpentFormatted && (
              <div style={{
                marginBottom: '25px',
                fontSize: '16px',
                color: 'var(--accent-color)',
                fontWeight: 'bold',
                background: 'var(--inner-box-bg)',
                padding: '10px 20px',
                borderRadius: '12px',
                display: 'inline-block',
                border: '1px solid var(--card-border)'
              }}>
                ⏱️ زمان صرف‌شده در آزمون: <span style={{ fontFamily: 'monospace', fontSize: '18px' }}>{reportData.timeSpentFormatted}</span>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '15px',
              marginBottom: '30px'
            }}>
              <div style={{ background: 'var(--inner-box-bg)', padding: '15px', borderRadius: '12px' }}>
                <div style={{ color: 'var(--success-neon)', fontSize: '20px', fontWeight: 'bold' }}>{reportData.correct}</div>
                <div style={{ color: 'var(--text-label)', fontSize: '12px', marginTop: '5px' }}>پاسخ صحیح</div>
              </div>
              
              <div style={{ background: 'var(--inner-box-bg)', padding: '15px', borderRadius: '12px' }}>
                <div style={{ color: 'var(--danger-neon)', fontSize: '20px', fontWeight: 'bold' }}>{reportData.wrong}</div>
                <div style={{ color: 'var(--text-label)', fontSize: '12px', marginTop: '5px' }}>پاسخ غلط</div>
              </div>

              <div style={{ background: 'var(--inner-box-bg)', padding: '15px', borderRadius: '12px' }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 'bold' }}>{reportData.empty}</div>
                <div style={{ color: 'var(--text-label)', fontSize: '12px', marginTop: '5px' }}>بدون پاسخ</div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className={styles.primaryBtn}
              style={{ width: '100%' }}
            >
              🔄 شروع تمرین/آزمون جدید
            </button>
          </div>

          {/* ⚡ بخش تحلیل آزمون */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '15px', color: 'var(--accent-color)' }}>🔍 مرور سوالات و تحلیل علمی</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sessionQuestions.map((q, qIdx) => {
                const chosenOption = userAnswers[q.id];
                const isCorrect = chosenOption === q.correctOption;
                const isAnswered = chosenOption !== undefined;
                const answerFile = getAnswerFileUrl(q);

                return (
                  <div 
                    key={q.id}
                    className={styles.questionItem}
                    style={{
                      borderRight: `5px solid ${isAnswered ? (isCorrect ? 'var(--success-neon)' : 'var(--danger-neon)') : 'var(--text-label)'}`,
                      padding: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-label)' }}>سوال {qIdx + 1}</span>
                      <span style={{ 
                        fontSize: '13px', 
                        color: isAnswered ? (isCorrect ? 'var(--success-neon)' : 'var(--danger-neon)') : 'var(--text-label)',
                        fontWeight: 'bold' 
                      }}>
                        {isAnswered ? (isCorrect ? '✅ صحیح' : '❌ غلط') : '⚪ بدون پاسخ'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>{q.title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '15px' }}>{q.text}</p>

                    {/* گزینه‌ها */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                      {q.options?.map((opt, optIdx) => {
                        let optBg = 'var(--option-row-bg)';
                        let optBorder = 'var(--card-border)';
                        let optColor = 'var(--text-primary)';

                        if (optIdx === q.correctOption) {
                          optBg = 'var(--success-glow)';
                          optBorder = 'var(--success-neon)';
                          optColor = 'var(--success-neon)';
                        } else if (chosenOption === optIdx && !isCorrect) {
                          optBg = 'var(--danger-glow)';
                          optBorder = 'var(--danger-neon)';
                          optColor = 'var(--danger-neon)';
                        }

                        return (
                          <div 
                            key={optIdx} 
                            style={{ 
                              padding: '10px 14px', 
                              borderRadius: '8px', 
                              background: optBg, 
                              border: `1px solid ${optBorder}`,
                              color: optColor,
                              fontSize: '14px' 
                            }}
                          >
                            <span style={{ marginLeft: '8px', opacity: 0.7 }}>{optIdx + 1})</span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>

                    {/* باکس پاسخ تشریحی + دکمه مدال */}
                    <div style={{ 
                      background: 'var(--inner-box-bg)', 
                      padding: '14px', 
                      borderRadius: '12px', 
                      borderRight: '3px solid var(--accent-color)' 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '13px' }}>💡 تحلیل علمی و پاسخ تشریحی:</span>
                        
                        <button
                          onClick={() => openAnswerModal(q)}
                          style={{
                            background: 'var(--accent-color)',
                            color: '#000',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          🔍 باز کردن در پاپ‌آپ
                        </button>
                      </div>

                      <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {q.answerExplanation || (answerFile ? 'پاسخ دارای فایل/عکس پیوست می‌باشد.' : 'توضیح تشریحی ثبت نشده است.')}
                      </p>

                      {answerFile && (
                        <div style={{ marginTop: '10px' }}>
                          <button
                            onClick={() => openAnswerModal(q)}
                            style={{
                              background: 'var(--secondary-btn-bg)',
                              color: 'var(--accent-color)',
                              border: '1px solid var(--accent-color)',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 'bold'
                            }}
                          >
                            📎 مشاهده فایل پاسخنامه پیوست
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ پنجره پاپ‌آپ (Modal) اختصاصی پاسخنامه */}
      {activeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-main)',
            border: '2px solid var(--accent-color)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-main)',
            overflow: 'hidden'
          }}>
            {/* هدر مدال */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--inner-box-bg)'
            }}>
              <h3 style={{ fontSize: '16px', color: 'var(--accent-color)', margin: 0, fontWeight: '800' }}>
                💡 تحلیل و پاسخنامه تشریحی
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-label)',
                  fontSize: '22px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* بدنه مدال */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <h4 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>{activeModal.title}</h4>

              {/* متن توضیحات تشریحی */}
              {activeModal.textExplanation ? (
                <div style={{
                  background: 'var(--option-row-bg)',
                  padding: '16px',
                  borderRadius: '14px',
                  marginBottom: '20px',
                  lineHeight: '1.8',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid var(--card-border)'
                }}>
                  {activeModal.textExplanation}
                </div>
              ) : (
                <p style={{ color: 'var(--text-label)', fontSize: '14px', marginBottom: '20px' }}>
                  توضیح متنی برای این سوال ثبت نشده است.
                </p>
              )}

              {/* فایل یا عکس پاسخنامه */}
              {activeModal.fileUrl ? (
                <div style={{ marginTop: '15px', borderTop: '1px solid var(--card-border)', paddingTop: '15px' }}>
                  <span style={{ display: 'block', color: 'var(--success-neon)', fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>
                    📎 فایل پیوست پاسخنامه:
                  </span>

                  {isImageUrl(activeModal.fileUrl) ? (
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                      <img
                        src={activeModal.fileUrl}
                        alt="پاسخنامه"
                        style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', border: '1px solid var(--card-border)' }}
                      />
                    </div>
                  ) : isPdfUrl(activeModal.fileUrl) ? (
                    <div style={{ height: '350px', marginBottom: '15px' }}>
                      <iframe
                        src={activeModal.fileUrl}
                        style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }}
                      />
                    </div>
                  ) : null}

                  <a
                    href={activeModal.fileUrl}
                    download={activeModal.fileName || 'پاسخنامه'}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-block',
                      background: 'var(--accent-color)',
                      color: '#fff',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    ⬇️ دانلود فایل پاسخنامه ({activeModal.fileName})
                  </a>
                </div>
              ) : (
                !activeModal.textExplanation && (
                  <p style={{ color: 'var(--danger-neon)', fontSize: '14px' }}>هیچ متن یا فایلی برای پاسخ تشریحی این سوال یافت نشد.</p>
                )
              )}
            </div>

            {/* فوتر مدال */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--card-border)', textAlign: 'left', background: 'var(--bg-main)' }}>
              <button
                onClick={() => setActiveModal(null)}
                className={styles.secondaryBtn}
                style={{ padding: '8px 20px', borderRadius: '8px' }}
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
