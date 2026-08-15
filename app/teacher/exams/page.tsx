'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './exams.module.css';

type QuestionType = 'mcq' | 'file';
type QuestionStatus = 'pending' | 'approved' | 'rejected';
type ExamMode = 'file' | 'builder';
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

interface BankQuestion {
  id: string;
  title: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctOption?: number;
  gradeId: string;
  provinceId: string;
  subjectId: string;
  status: QuestionStatus;
  attachmentUrl?: string;
  attachmentName?: string;
  answerSheetUrl?: string;
  answerSheetName?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExamQuestion {
  id: string;
  text: string;
  options: string[];
  correctOption: number;
  points: number;
  imageUrl?: string;
  answerSheetUrl?: string;
  answerSheetName?: string;
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
  // فیلدهای نویسنده که ممکن است در ساختار ادمین (createdBy) یا مدرس (authorId/authorRole) باشند:
  createdBy?: string; 
  authorId?: string;
  authorRole?: 'admin' | 'teacher';
}

const EXAMS_KEY = 'exams';
const GRADES_KEY = 'grades';
const PROVINCES_KEY = 'provinces';
const SUBJECTS_KEY = 'subjects';
const QUESTIONS_KEY = 'questions';
const EXAM_RESULTS_KEY = 'exam_results';
const ALL_PROVINCES_VALUE = 'all-provinces';
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // 2MB

function parseMultipleValues(value?: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
  }
  return String(value)
    .split(/[,,،\-]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getStoredCurrentUser() {
  try {
    const currentUserRaw = localStorage.getItem('currentUser');
    const userRaw = localStorage.getItem('user');

    if (currentUserRaw) {
      const parsed = JSON.parse(currentUserRaw);
      if (parsed) return parsed;
    }

    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (parsed) return parsed;
    }

    return null;
  } catch (error) {
    console.error('Error parsing current user:', error);
    return null;
  }
}

function getExamStatus(exam: Exam): ExamStatus {
  const now = new Date();
  const start = exam.startTime ? new Date(exam.startTime) : null;
  const end = exam.endTime ? new Date(exam.endTime) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'unknown';
  }

  if (now < start) return 'pending';
  if (now >= start && now <= end) return 'active';
  if (now > end) return 'finished';

  return 'unknown';
}

function getExamStatusLabel(status: ExamStatus) {
  switch (status) {
    case 'pending':
      return 'در انتظار شروع';
    case 'active':
      return 'فعال';
    case 'finished':
      return 'پایان یافته';
    default:
      return 'نامشخص';
  }
}

export default function TeacherExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [examMode, setExamMode] = useState<ExamMode>('builder');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState<number>(60);
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [bankSearch, setBankSearch] = useState('');

  const loadData = () => {
    try {
      const user = getStoredCurrentUser();
      setCurrentUser(user);

      const storedExams = localStorage.getItem(EXAMS_KEY);
      const storedGrades = localStorage.getItem(GRADES_KEY);
      const storedProvinces = localStorage.getItem(PROVINCES_KEY);
      const storedSubjects = localStorage.getItem(SUBJECTS_KEY);
      const storedBankQuestions = localStorage.getItem(QUESTIONS_KEY);

      const parsedExams: Exam[] = storedExams ? JSON.parse(storedExams) : [];
      const parsedGrades: Grade[] = storedGrades ? JSON.parse(storedGrades) : [];
      const parsedProvinces: Province[] = storedProvinces ? JSON.parse(storedProvinces) : [];
      const parsedSubjects: Subject[] = storedSubjects ? JSON.parse(storedSubjects) : [];
      const parsedBankQuestions: BankQuestion[] = storedBankQuestions
        ? JSON.parse(storedBankQuestions)
        : [];

      const teacherGradeNames = parseMultipleValues(user?.grade);
      const teacherProvinceNames = parseMultipleValues(user?.province);

      const filteredGrades = parsedGrades.filter((g) => {
        if (teacherGradeNames.length === 0) return true;
        return teacherGradeNames.some(
          (name) => name.toLowerCase() === g.name.toLowerCase() || name === g.id
        );
      });

      const filteredProvinces = parsedProvinces.filter((p) => {
        if (teacherProvinceNames.length === 0) return true;
        return teacherProvinceNames.some(
          (name) => name.toLowerCase() === p.name.toLowerCase() || name === p.id
        );
      });

      const finalGrades = filteredGrades.length > 0 ? filteredGrades : parsedGrades;
      const finalProvinces = filteredProvinces.length > 0 ? filteredProvinces : parsedProvinces;

      setGrades(finalGrades);
      setProvinces(finalProvinces);
      setSubjects(parsedSubjects);
      setExams(parsedExams);
      setBankQuestions(parsedBankQuestions);

      if (finalGrades.length > 0) {
        setSelectedGradeId((prev) =>
          finalGrades.some((item) => item.id === prev) ? prev : finalGrades[0].id
        );
      }

      if (finalProvinces.length > 0) {
        setSelectedProvinceId((prev) =>
          finalProvinces.some((item) => item.id === prev) ? prev : finalProvinces[0].id
        );
      }

      if (parsedSubjects.length > 0) {
        setSelectedSubjectId((prev) =>
          parsedSubjects.some((item) => item.id === prev) ? prev : parsedSubjects[0].id
        );
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const onStorage = () => loadData();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onStorage);
    };
  }, []);

  const gradeNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    grades.forEach((g) => {
      map[g.id] = g.name;
    });
    return map;
  }, [grades]);

  const provinceNameMap = useMemo(() => {
    const map: Record<string, string> = {
      [ALL_PROVINCES_VALUE]: 'همه استان‌ها',
    };
    provinces.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [provinces]);

  const subjectNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    subjects.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [subjects]);

  const getGradeName = (id: string) => gradeNameMap[id] || 'نامشخص';
  const getProvinceName = (id: string) => provinceNameMap[id] || 'نامشخص';
  const getSubjectName = (id: string) => subjectNameMap[id] || 'نامشخص';

  // فیلتر هوشمند بازنویسی‌شده برای نمایش آزمون‌های مدرس جاری و آزمون‌های ادمین/سیستم
  const filteredExams = useMemo(() => {
    if (!currentUser) return [];

    return exams.filter((ex) => {
      // ۱. بررسی مالکیت آزمون (اگر متعلق به مدرس فعلی باشد)
      const isAuthor = ex.authorId === currentUser.id || ex.createdBy === currentUser.id;
      if (isAuthor) return true;

      // ۲. بررسی آزمون‌های رسمی ادمین (آزمون‌هایی که توسط مدرس جاری ساخته نشده‌اند)
      // ادمین فیلد authorRole ثبت نمی‌کند، پس آزمون‌های با creator غیر از مدرس جاری، ادمین/سیستمی فرض می‌شوند.
      const isSystemOrAdmin = !ex.authorId || ex.authorRole === 'admin' || (ex.createdBy && ex.createdBy !== currentUser.id);

      if (isSystemOrAdmin) {
        const hasGradeAccess = grades.some((g) => g.id === ex.gradeId);
        const hasProvinceAccess =
          ex.provinceId === ALL_PROVINCES_VALUE || provinces.some((p) => p.id === ex.provinceId);

        return hasGradeAccess && hasProvinceAccess;
      }

      return false;
    });
  }, [exams, currentUser, grades, provinces]);

  const resetForm = () => {
    setTitle('');
    setExamMode('builder');
    setStartTime('');
    setEndTime('');
    setDuration(60);
    setQuestions([]);
    setFileUrl('');
    setBankSearch('');

    if (grades.length > 0) setSelectedGradeId(grades[0].id);
    if (provinces.length > 0) setSelectedProvinceId(provinces[0].id);
    if (subjects.length > 0) setSelectedSubjectId(subjects[0].id);
  };

  const openForm = () => {
    if (grades.length === 0 || provinces.length === 0 || subjects.length === 0) {
      alert('پایه، استان یا درس برای حساب کاربری شما یا در سیستم تعریف نشده است.');
      return;
    }
    setIsFormOpen(true);
  };

  const handleAddQuestion = () => {
    const newQuestion: ExamQuestion = {
      id: `Q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: '',
      options: ['', '', '', ''],
      correctOption: 0,
      points: 1,
      imageUrl: undefined,
      answerSheetUrl: undefined,
      answerSheetName: undefined,
      source: 'new',
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  const handleAddQuestionFromBank = (question: BankQuestion) => {
    if (question.type !== 'mcq') {
      alert('فعلا فقط سوالات چهارگزینه‌ای از بانک سوال قابل استفاده هستند.');
      return;
    }

    const isDuplicate = questions.some((q) => q.bankQuestionId === question.id);
    if (isDuplicate) {
      alert('این سوال قبلا به آزمون اضافه شده است.');
      return;
    }

    const examQuestion: ExamQuestion = {
      id: `Q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: question.text,
      options: question.options?.length === 4 ? [...question.options] : ['', '', '', ''],
      correctOption: question.correctOption ?? 0,
      points: 1,
      imageUrl: question.attachmentUrl,
      answerSheetUrl: question.answerSheetUrl,
      answerSheetName: question.answerSheetName,
      source: 'bank',
      bankQuestionId: question.id,
    };

    setQuestions((prev) => [...prev, examQuestion]);
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (
    index: number,
    field: keyof Omit<ExamQuestion, 'id' | 'source' | 'bankQuestionId'>,
    value: string | number | undefined
  ) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options.map((opt, j) => (j === optionIndex ? value : opt)),
            }
          : q
      )
    );
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE) {
      alert('حجم تصویر سوال نباید بیشتر از 2 مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, imageUrl: base64 } : q)));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index: number) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, imageUrl: undefined } : q)));
  };

  const handleAnswerSheetUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE) {
      alert('حجم پاسخنامه نباید بیشتر از 2 مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setQuestions((prev) =>
        prev.map((q, i) =>
          i === index
            ? {
                ...q,
                answerSheetUrl: base64,
                answerSheetName: file.name,
              }
            : q
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAnswerSheet = (index: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? {
              ...q,
              answerSheetUrl: undefined,
              answerSheetName: undefined,
            }
          : q
      )
    );
  };

  const filteredBankQuestions = useMemo(() => {
    const search = bankSearch.trim().toLowerCase();

    return bankQuestions.filter((q) => {
      if (q.type !== 'mcq') return false;
      if (q.status !== 'approved') return false;
      if (selectedGradeId && q.gradeId !== selectedGradeId) return false;

      const provinceMatch =
        !selectedProvinceId ||
        q.provinceId === selectedProvinceId ||
        q.provinceId === ALL_PROVINCES_VALUE;

      if (!provinceMatch) return false;

      const subjectMatch = !selectedSubjectId || q.subjectId === selectedSubjectId;
      if (!subjectMatch) return false;

      if (!search) return true;

      return q.title.toLowerCase().includes(search) || q.text.toLowerCase().includes(search);
    });
  }, [bankQuestions, selectedGradeId, selectedProvinceId, selectedSubjectId, bankSearch]);

  const saveNewQuestionsToBank = (
    sourceQuestions: ExamQuestion[],
    gradeId: string,
    provinceId: string,
    subjectId: string
  ) => {
    const newQuestions = sourceQuestions.filter((q) => q.source === 'new');
    if (newQuestions.length === 0) return;

    const now = new Date().toISOString();

    const latestStoredQuestions = (() => {
      try {
        const raw = localStorage.getItem(QUESTIONS_KEY);
        return raw ? (JSON.parse(raw) as BankQuestion[]) : [];
      } catch {
        return bankQuestions;
      }
    })();

    const mappedQuestions: BankQuestion[] = newQuestions.map((q, index) => ({
      id: `BANK-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      title: q.text.trim().slice(0, 60) || `سوال مدرس ${index + 1}`,
      text: q.text.trim(),
      type: 'mcq',
      options: q.options,
      correctOption: q.correctOption,
      gradeId,
      provinceId,
      subjectId,
      status: 'approved',
      attachmentUrl: q.imageUrl,
      attachmentName: q.imageUrl ? 'exam-question-image' : undefined,
      answerSheetUrl: q.answerSheetUrl,
      answerSheetName: q.answerSheetName,
      createdAt: now,
      updatedAt: now,
    }));

    const updatedBankQuestions = [...mappedQuestions, ...latestStoredQuestions];
    setBankQuestions(updatedBankQuestions);
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(updatedBankQuestions));
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('عنوان آزمون را وارد کنید.');
      return;
    }
    if (!selectedGradeId) {
      alert('پایه تحصیلی را انتخاب کنید.');
      return;
    }
    if (!selectedProvinceId) {
      alert('استان را انتخاب کنید.');
      return;
    }
    if (!selectedSubjectId) {
      alert('درس را انتخاب کنید.');
      return;
    }

    if (!startTime) {
      alert('زمان شروع آزمون را وارد کنید.');
      return;
    }

    if (!endTime) {
      alert('زمان پایان آزمون را وارد کنید.');
      return;
    }

    if (duration < 1 || Number.isNaN(duration)) {
      alert('مدت آزمون باید حداقل 1 دقیقه باشد.');
      return;
    }

    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      alert('فرمت تاریخ/زمان آزمون معتبر نیست.');
      return;
    }

    if (endMs <= startMs) {
      alert('زمان پایان باید بعد از زمان شروع باشد.');
      return;
    }

    const windowMinutes = Math.floor((endMs - startMs) / 60000);
    if (duration > windowMinutes) {
      alert('مدت آزمون نباید بیشتر از بازه زمانی آزمون باشد.');
      return;
    }

    if (examMode === 'file' && !fileUrl.trim()) {
      alert('آدرس فایل یا لینک پی‌دی‌اف آزمون را وارد کنید.');
      return;
    }

    if (examMode === 'builder') {
      if (questions.length === 0) {
        alert('حداقل یک سوال اضافه کنید.');
        return;
      }

      for (const q of questions) {
        if (!q.text.trim()) {
          alert('صورت همه سوال‌ها باید تکمیل شود.');
          return;
        }

        if (q.options.length !== 4 || q.options.some((opt) => !opt.trim())) {
          alert('همه گزینه‌های سوال‌ها باید تکمیل شوند.');
          return;
        }

        if (q.points < 1 || Number.isNaN(q.points)) {
          alert('بارم هر سوال باید حداقل 1 باشد.');
          return;
        }

        if (
          typeof q.correctOption !== 'number' ||
          q.correctOption < 0 ||
          q.correctOption > 3
        ) {
          alert('گزینه صحیح هر سوال باید معتبر باشد.');
          return;
        }
      }
    }

    const finalQuestions = examMode === 'builder' ? questions : [];

    const newExam: Exam = {
      id: `EXM-${Date.now()}`,
      title: title.trim(),
      targetType: 'specific',
      gradeId: selectedGradeId,
      provinceId: selectedProvinceId,
      subjectId: selectedSubjectId,
      userIds: [],
      startTime,
      endTime,
      duration,
      examMode,
      fileUrl: examMode === 'file' ? fileUrl.trim() : undefined,
      questions: finalQuestions,
      createdAt: new Date().toISOString(),
      authorId: currentUser?.id || 'unknown',
      authorRole: 'teacher',
      createdBy: currentUser?.id || 'unknown'
    };

    const updatedExams = [newExam, ...exams];
    setExams(updatedExams);
    localStorage.setItem(EXAMS_KEY, JSON.stringify(updatedExams));

    if (examMode === 'builder') {
      saveNewQuestionsToBank(finalQuestions, selectedGradeId, selectedProvinceId, selectedSubjectId);
    }

    setIsFormOpen(false);
    resetForm();
  };

  const handleDeleteExam = (id: string) => {
    const target = exams.find((ex) => ex.id === id);
    if (!target) return;

    // مدرس فقط مجاز به حذف آزمون‌های متعلق به خودش است (بر اساس هر دو فیلد)
    const isOwner = target.authorId === currentUser?.id || target.createdBy === currentUser?.id;
    if (!isOwner) {
      alert('شما فقط مجاز به حذف آزمون‌های طراحی‌شده توسط خودتان هستید.');
      return;
    }

    if (!confirm('آیا از حذف این آزمون اطمینان دارید؟')) return;

    const updated = exams.filter((exam) => exam.id !== id);
    setExams(updated);
    localStorage.setItem(EXAMS_KEY, JSON.stringify(updated));

    try {
      localStorage.removeItem(`latest_exam_result_${id}`);
      localStorage.removeItem(`exam_attempt_${id}`);

      const rawResults = localStorage.getItem(EXAM_RESULTS_KEY);
      const parsedResults = rawResults ? JSON.parse(rawResults) : [];

      if (Array.isArray(parsedResults)) {
        const cleanedResults = parsedResults.filter((item: any) => item?.examId !== id);
        localStorage.setItem(EXAM_RESULTS_KEY, JSON.stringify(cleanedResults));
      }
    } catch (error) {
      console.error('Error cleaning exam related data:', error);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>پنل آزمون مدرس</h1>
        <button className={styles.newBtn} onClick={openForm}>
          + طراحی آزمون جدید
        </button>
      </header>

      {loading ? (
        <div className={styles.listContainer}>
          <p style={{ textAlign: 'center', opacity: 0.7 }}>در حال بارگذاری...</p>
        </div>
      ) : (
        <>
          {isFormOpen && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h2>طراحی و تنظیمات آزمون (ویژه مدرسین)</h2>

                <form onSubmit={handleSaveExam}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>عنوان آزمون:</label>
                      <input
                        type="text"
                        placeholder="مثال: آزمون فصل اول زیست شناسی"
                        className={styles.input}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>نوع برگزاری:</label>
                      <select
                        className={styles.input}
                        value={examMode}
                        onChange={(e) => setExamMode(e.target.value as ExamMode)}
                      >
                        <option value="builder">طراحی سوالات در سایت</option>
                        <option value="file">آپلود لینک/فایل سوالات (PDF)</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>پایه تحصیلی هدف:</label>
                      <select
                        className={styles.input}
                        value={selectedGradeId}
                        onChange={(e) => setSelectedGradeId(e.target.value)}
                        required
                      >
                        {grades.map((grade) => (
                          <option key={grade.id} value={grade.id}>
                            {grade.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>استان هدف:</label>
                      <select
                        className={styles.input}
                        value={selectedProvinceId}
                        onChange={(e) => setSelectedProvinceId(e.target.value)}
                        required
                      >
                        {provinces.map((province) => (
                          <option key={province.id} value={province.id}>
                            {province.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>درس:</label>
                      <select
                        className={styles.input}
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        required
                      >
                        {subjects.length === 0 ? (
                          <option value="">هیچ درسی تعریف نشده است</option>
                        ) : (
                          subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>تاریخ و زمان شروع:</label>
                      <input
                        type="datetime-local"
                        className={styles.input}
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>تاریخ و زمان پایان:</label>
                      <input
                        type="datetime-local"
                        className={styles.input}
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>مدت زمان (دقیقه):</label>
                      <input
                        type="number"
                        min={1}
                        className={styles.input}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        required
                      />
                    </div>

                    {examMode === 'file' && (
                      <div className={styles.formGroup}>
                        <label>لینک/آدرس فایل آزمون (PDF):</label>
                        <input
                          type="text"
                          placeholder="مثال: /files/exam.pdf"
                          className={styles.input}
                          value={fileUrl}
                          onChange={(e) => setFileUrl(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>

                  {examMode === 'builder' && (
                    <div className={styles.questionBuilder}>
                      <h3>افزودن سوال از بانک سوالات تاییدشده</h3>

                      <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                        <label>جستجو در بانک سوال:</label>
                        <input
                          type="text"
                          placeholder="عنوان یا متن سوال"
                          className={styles.input}
                          value={bankSearch}
                          onChange={(e) => setBankSearch(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'grid', gap: '12px', marginBottom: '1.5rem' }}>
                        {filteredBankQuestions.length === 0 ? (
                          <p style={{ opacity: 0.7 }}>
                            سوال تاییدشده‌ای برای این پایه، استان و درس پیدا نشد.
                          </p>
                        ) : (
                          filteredBankQuestions.map((q) => {
                            const alreadyAdded = questions.some(
                              (item) => item.bankQuestionId === q.id
                            );

                            return (
                              <div key={q.id} className={styles.qCard}>
                                <div className={styles.qHeader}>
                                  <div>
                                    <strong>{q.title}</strong>
                                    <p style={{ marginTop: '0.5rem' }}>{q.text}</p>
                                    <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
                                      پایه: {getGradeName(q.gradeId)} | استان:{' '}
                                      {getProvinceName(q.provinceId)} | درس:{' '}
                                      {getSubjectName(q.subjectId)}
                                    </p>

                                    {q.answerSheetName && (
                                      <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>
                                        پاسخنامه موجود: {q.answerSheetName}
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    className={styles.addQBtn}
                                    onClick={() => handleAddQuestionFromBank(q)}
                                    disabled={alreadyAdded}
                                    style={{ width: 'auto', padding: '8px 16px' }}
                                  >
                                    {alreadyAdded ? 'افزوده شده' : 'افزودن به آزمون'}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <h3>سوالات آزمون ({questions.length} سوال)</h3>

                      {questions.map((q, idx) => (
                        <div key={q.id} className={styles.qCard}>
                          <div className={styles.qHeader}>
                            <input
                              type="text"
                              placeholder={`صورت سوال ${idx + 1}`}
                              className={`${styles.input} ${styles.qTitleInput}`}
                              value={q.text}
                              onChange={(e) => handleQuestionChange(idx, 'text', e.target.value)}
                              required
                            />

                            <input
                              type="number"
                              min={1}
                              placeholder="بارم"
                              title="بارم سوال"
                              className={`${styles.input} ${styles.pointsInput}`}
                              value={q.points}
                              onChange={(e) =>
                                handleQuestionChange(idx, 'points', Number(e.target.value))
                              }
                            />

                            <button
                              type="button"
                              className={styles.deleteQBtn}
                              onClick={() => handleDeleteQuestion(idx)}
                            >
                              حذف سوال
                            </button>
                          </div>

                          <p style={{ opacity: 0.75, marginBottom: '1rem' }}>
                            منبع سوال:{' '}
                            {q.source === 'bank'
                              ? 'بانک سوال تایید شده'
                              : 'سوال جدید آزمون (ثبت مستقیم و تایید شده در بانک سوالات)'}
                          </p>

                          <div className={styles.imageUploadBox}>
                            {q.imageUrl ? (
                              <div className={styles.imagePreviewContainer}>
                                <img
                                  src={q.imageUrl}
                                  alt={`سوال ${idx + 1}`}
                                  className={styles.questionImagePreview}
                                />
                                <button
                                  type="button"
                                  className={styles.removeImgBtn}
                                  onClick={() => handleRemoveImage(idx)}
                                >
                                  ✕ حذف تصویر
                                </button>
                              </div>
                            ) : (
                              <label className={styles.fileUploadLabel}>
                                🖼️ افزودن تصویر یا فرمول به سوال
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(idx, e)}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            )}
                          </div>

                          {q.source === 'new' && (
                            <div className={styles.imageUploadBox}>
                              {q.answerSheetUrl ? (
                                <div className={styles.imagePreviewContainer}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 8,
                                      width: '100%',
                                    }}
                                  >
                                    <strong>پاسخنامه / حل‌نامه سوال</strong>
                                    <span style={{ opacity: 0.8 }}>
                                      {q.answerSheetName || 'فایل پاسخنامه'}
                                    </span>

                                    {q.answerSheetUrl.startsWith('data:image') && (
                                      <img
                                        src={q.answerSheetUrl}
                                        alt={`پاسخنامه سوال ${idx + 1}`}
                                        className={styles.questionImagePreview}
                                      />
                                    )}

                                    <a
                                      href={q.answerSheetUrl}
                                      download={q.answerSheetName || `answer-sheet-${idx + 1}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        color: '#2563eb',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                      }}
                                    >
                                      مشاهده / دانلود پاسخنامه
                                    </a>

                                    <button
                                      type="button"
                                      className={styles.removeImgBtn}
                                      onClick={() => handleRemoveAnswerSheet(idx)}
                                    >
                                      ✕ حذف پاسخنامه
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className={styles.fileUploadLabel}>
                                  📄 آپلود پاسخنامه / حل‌نامه سوال
                                  <input
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={(e) => handleAnswerSheetUpload(idx, e)}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                              )}
                            </div>
                          )}

                          <div className={styles.optionsGrid}>
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className={styles.optionInput}>
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  className={styles.radioInput}
                                  checked={q.correctOption === oIdx}
                                  onChange={() => handleQuestionChange(idx, 'correctOption', oIdx)}
                                />
                                <input
                                  type="text"
                                  placeholder={`گزینه ${oIdx + 1}`}
                                  className={styles.input}
                                  value={opt}
                                  onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                                  required
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className={styles.addQBtn}
                      >
                        + افزودن سوال جدید
                      </button>
                    </div>
                  )}

                  <div className={styles.footerBtns}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormOpen(false);
                        resetForm();
                      }}
                      className={styles.cancelBtn}
                    >
                      انصراف
                    </button>

                    <button type="submit" className={styles.saveBtn}>
                      ذخیره آزمون
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className={styles.listContainer}>
            {filteredExams.length === 0 ? (
              <p style={{ opacity: 0.6, textAlign: 'center', marginTop: '2rem' }}>
                هیچ آزمونی یافت نشد. برای شروع دکمه «طراحی آزمون جدید» را بزنید.
              </p>
            ) : (
              filteredExams.map((exam) => {
                const status = getExamStatus(exam);
                // بررسی کنیم که آیا آزمون توسط ادمین/سیستم ثبت شده است یا خیر
                const isAdminExam = exam.authorRole === 'admin' || (exam.createdBy && exam.createdBy !== currentUser?.id && !exam.authorId);

                return (
                  <div key={exam.id} className={styles.examCard}>
                    <div className={styles.examInfo}>
                      <h3>
                        {exam.title}
                        {isAdminExam && (
                          <span className={styles.adminBadge} style={{ marginRight: '8px', fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' }}>
                            رسمی ادمین
                          </span>
                        )}
                      </h3>

                      <div className={styles.badgeContainer}>
                        <span className={styles.badge}>{getGradeName(exam.gradeId)}</span>
                        <span className={styles.badge}>{getProvinceName(exam.provinceId)}</span>
                        <span className={styles.badge}>{getSubjectName(exam.subjectId)}</span>
                        <span className={styles.badge}>{getExamStatusLabel(status)}</span>
                      </div>

                      <p>
                        زمان شروع: {exam.startTime ? exam.startTime.replace('T', ' ') : 'تعریف نشده'}
                      </p>
                      <p>
                        زمان پایان: {exam.endTime ? exam.endTime.replace('T', ' ') : 'تعریف نشده'}
                      </p>
                      <p>مدت آزمون: {exam.duration} دقیقه</p>
                      <p>
                        تعداد سوالات:{' '}
                        {exam.examMode === 'builder' ? exam.questions?.length || 0 : '-'}
                      </p>
                      <p>نوع آزمون: {exam.examMode === 'builder' ? 'طراحی داخلی' : 'فایل PDF'}</p>
                    </div>

                    <div className={styles.examActions}>
                      <Link href={`/exams/${exam.id}`}>
                        <button className={styles.startBtn}>▶ شروع آزمون</button>
                      </Link>

                      <Link href={`/teacher/exams/reports/${exam.id}`}>
                        <button className={styles.reportBtn}>📊 مشاهده گزارشات</button>
                      </Link>

                      {!isAdminExam && (
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteExam(exam.id)}
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
