'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './questions.module.css';

type QuestionType = 'mcq' | 'file';
type QuestionStatus = 'pending' | 'approved' | 'rejected';

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

interface Question {
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
  answerExplanation?: string;
  answerAttachmentUrl?: string; // فایل پاسخنامه آپلود شده از داخل بانک سوال
  answerAttachmentName?: string;
  answerSheetUrl?: string;       // فیلد هماهنگ برای فایل پاسخنامه منتقل شده از آزمون جدید
  answerSheetName?: string;
  createdAt: string;
  updatedAt: string;
  sourceExamId?: string;
  sourceExamQuestionId?: string;
}

const STORAGE_KEY = 'questions';
const GRADES_KEY = 'grades';
const PROVINCES_KEY = 'provinces';
const SUBJECTS_KEY = 'subjects';
const ALL_PROVINCES_VALUE = 'all-provinces';
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // 2MB

const defaultGrades: Grade[] = [
  { id: 'g1', name: 'پایه اول' },
  { id: 'g2', name: 'پایه دوم' },
  { id: 'g3', name: 'پایه سوم' },
  { id: 'g4', name: 'پایه چهارم' },
  { id: 'g5', name: 'پایه پنجم' },
  { id: 'g6', name: 'پایه ششم' },
  { id: 'g7', name: 'پایه هفتم' },
  { id: 'g8', name: 'پایه هشتم' },
  { id: 'g9', name: 'پایه نهم' },
  { id: 'g10', name: 'پایه دهم' },
  { id: 'g11', name: 'پایه یازدهم' },
  { id: 'g12', name: 'پایه دوازدهم' },
];

const defaultProvinces: Province[] = [
  { id: 'p1', name: 'تهران' },
  { id: 'p2', name: 'اصفهان' },
  { id: 'p3', name: 'فارس' },
  { id: 'p4', name: 'خراسان رضوی' },
  { id: 'p5', name: 'خوزستان' },
];

const defaultSubjects: Subject[] = [
  { id: 's1', name: 'ریاضی' },
  { id: 's2', name: 'علوم تجربی' },
  { id: 's3', name: 'ادبیات فارسی' },
  { id: 's4', name: 'عربی' },
  { id: 's5', name: 'دینی (پیام‌های آسمان)' },
];

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [newSubjectName, setNewSubjectName] = useState('');

  const [filterGrade, setFilterGrade] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<QuestionType | 'all'>('all');

  const [form, setForm] = useState({
    title: '',
    text: '',
    type: 'mcq' as QuestionType,
    options: ['', '', '', ''],
    correctOption: 0,
    gradeId: '',
    provinceId: ALL_PROVINCES_VALUE,
    subjectId: '',
    attachmentUrl: '',
    attachmentName: '',
    answerExplanation: '',
    answerAttachmentUrl: '',
    answerAttachmentName: '',
    answerSheetUrl: '',
    answerSheetName: '',
  });

  useEffect(() => {
    const storedQuestions = localStorage.getItem(STORAGE_KEY);
    const storedGrades = localStorage.getItem(GRADES_KEY);
    const storedProvinces = localStorage.getItem(PROVINCES_KEY);
    const storedSubjects = localStorage.getItem(SUBJECTS_KEY);

    const parsedGrades = storedGrades ? JSON.parse(storedGrades) : defaultGrades;
    const parsedProvinces = storedProvinces ? JSON.parse(storedProvinces) : defaultProvinces;
    const parsedSubjects = storedSubjects ? JSON.parse(storedSubjects) : defaultSubjects;
    const parsedQuestions = storedQuestions ? JSON.parse(storedQuestions) : [];

    setGrades(parsedGrades);
    setProvinces(parsedProvinces);
    setSubjects(parsedSubjects);
    setQuestions(parsedQuestions);

    const initialGradeId = parsedGrades.length > 0 ? parsedGrades[0].id : '';
    const initialSubjectId = parsedSubjects.length > 0 ? parsedSubjects[0].id : '';

    setForm((prev) => ({
      ...prev,
      gradeId: initialGradeId,
      provinceId: ALL_PROVINCES_VALUE,
      subjectId: initialSubjectId,
    }));

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    }
  }, [questions, isLoaded]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setQuestions(e.newValue ? JSON.parse(e.newValue) : []);
      }
      if (e.key === SUBJECTS_KEY) {
        setSubjects(e.newValue ? JSON.parse(e.newValue) : []);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();

    const subjectName = newSubjectName.trim();
    if (!subjectName) {
      alert('لطفاً نام درس را وارد کنید.');
      return;
    }

    const isDuplicate = subjects.some(
      (sub) => sub.name.trim().toLowerCase() === subjectName.toLowerCase()
    );
    if (isDuplicate) {
      alert('این درس قبلاً تعریف شده است.');
      return;
    }

    const newSub: Subject = {
      id: `SUB-${Date.now()}`,
      name: subjectName,
    };

    const updatedSubjects = [...subjects, newSub];
    setSubjects(updatedSubjects);
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(updatedSubjects));

    if (!form.subjectId) {
      setForm((prev) => ({ ...prev, subjectId: newSub.id }));
    }

    setNewSubjectName('');
  };

  const handleDeleteSubject = (subjectId: string) => {
    const subject = subjects.find((item) => item.id === subjectId);
    if (!subject) return;

    const isUsedInQuestions = questions.some((q) => q.subjectId === subjectId);
    if (isUsedInQuestions) {
      alert('برای این درس سوال ثبت شده است. ابتدا سوالات مرتبط را ویرایش یا حذف کنید.');
      return;
    }

    if (!confirm(`آیا از حذف درس «${subject.name}» مطمئن هستید؟`)) return;

    const updatedSubjects = subjects.filter((item) => item.id !== subjectId);
    setSubjects(updatedSubjects);
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(updatedSubjects));

    if (form.subjectId === subjectId) {
      setForm((prev) => ({
        ...prev,
        subjectId: updatedSubjects[0]?.id || '',
      }));
    }

    if (filterSubject === subjectId) {
      setFilterSubject('');
    }
  };

  const gradeMap = useMemo(() => {
    const map: Record<string, string> = {};
    grades.forEach((g) => {
      map[g.id] = g.name;
    });
    return map;
  }, [grades]);

  const provinceMap = useMemo(() => {
    const map: Record<string, string> = {
      [ALL_PROVINCES_VALUE]: 'همه استان‌ها',
    };
    provinces.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [provinces]);

  const subjectMap = useMemo(() => {
    const map: Record<string, string> = {};
    subjects.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [subjects]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchGrade = !filterGrade || q.gradeId === filterGrade;
      const matchProvince =
        !filterProvince ||
        q.provinceId === filterProvince ||
        q.provinceId === ALL_PROVINCES_VALUE;
      const matchSubject = !filterSubject || q.subjectId === filterSubject;
      const matchStatus = filterStatus === 'all' || q.status === filterStatus;
      const matchType = filterType === 'all' || q.type === filterType;

      return matchGrade && matchProvince && matchSubject && matchStatus && matchType;
    });
  }, [questions, filterGrade, filterProvince, filterSubject, filterStatus, filterType]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      text: '',
      type: 'mcq',
      options: ['', '', '', ''],
      correctOption: 0,
      gradeId: grades[0]?.id || '',
      provinceId: ALL_PROVINCES_VALUE,
      subjectId: subjects[0]?.id || '',
      attachmentUrl: '',
      attachmentName: '',
      answerExplanation: '',
      answerAttachmentUrl: '',
      answerAttachmentName: '',
      answerSheetUrl: '',
      answerSheetName: '',
    });
  };

  const fileToBase64 = (file: File, onLoad: (result: string) => void) => {
    if (file.size > MAX_UPLOAD_SIZE) {
      alert('حجم فایل انتخابی نباید بیشتر از 2 مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onLoad(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    fileToBase64(file, (result) => {
      setForm((prev) => ({
        ...prev,
        attachmentUrl: result,
        attachmentName: file.name,
      }));
    });
  };

  const handleAnswerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    fileToBase64(file, (result) => {
      setForm((prev) => ({
        ...prev,
        answerAttachmentUrl: result,
        answerAttachmentName: file.name,
      }));
    });
  };

  // آپلود مستقیم پاسخنامه ویژه فیلد هماهنگ با آزمون‌ها
  const handleAnswerSheetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    fileToBase64(file, (result) => {
      setForm((prev) => ({
        ...prev,
        answerSheetUrl: result,
        answerSheetName: file.name,
      }));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.text.trim()) {
      alert('لطفاً عنوان و متن سوال را وارد کنید.');
      return;
    }

    if (!form.subjectId) {
      alert('لطفاً ابتدا یک درس تعریف کنید یا از لیست درس انتخاب کنید.');
      return;
    }

    const newQuestionId = editingId || `Q-${Date.now()}`;
    const targetQuestion = questions.find((q) => q.id === editingId);

    const payload: Question = {
      id: newQuestionId,
      title: form.title.trim(),
      text: form.text.trim(),
      type: form.type,
      options: form.type === 'mcq' ? form.options : undefined,
      correctOption: form.type === 'mcq' ? form.correctOption : undefined,
      gradeId: form.gradeId || grades[0]?.id || '',
      provinceId: form.provinceId || ALL_PROVINCES_VALUE,
      subjectId: form.subjectId,
      status: editingId ? targetQuestion?.status || 'pending' : 'pending',
      attachmentUrl: form.attachmentUrl || undefined,
      attachmentName: form.attachmentName || undefined,
      answerExplanation: form.answerExplanation.trim() || undefined,
      answerAttachmentUrl: form.answerAttachmentUrl || undefined,
      answerAttachmentName: form.answerAttachmentName || undefined,
      answerSheetUrl: form.answerSheetUrl || undefined,
      answerSheetName: form.answerSheetName || undefined,
      sourceExamId: targetQuestion?.sourceExamId,
      sourceExamQuestionId: targetQuestion?.sourceExamQuestionId,
      createdAt: targetQuestion?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      setQuestions((prev) => prev.map((q) => (q.id === editingId ? payload : q)));
    } else {
      setQuestions((prev) => [payload, ...prev]);
    }

    resetForm();
  };

  const handleEdit = (q: Question) => {
    setEditingId(q.id);
    setForm({
      title: q.title,
      text: q.text,
      type: q.type,
      options: q.options || ['', '', '', ''],
      correctOption: q.correctOption ?? 0,
      gradeId: q.gradeId,
      provinceId: q.provinceId || ALL_PROVINCES_VALUE,
      subjectId: q.subjectId || subjects[0]?.id || '',
      attachmentUrl: q.attachmentUrl || '',
      attachmentName: q.attachmentName || '',
      answerExplanation: q.answerExplanation || '',
      answerAttachmentUrl: q.answerAttachmentUrl || '',
      answerAttachmentName: q.answerAttachmentName || '',
      answerSheetUrl: q.answerSheetUrl || '',
      answerSheetName: q.answerSheetName || '',
    });
  };

  const handleStatusChange = (id: string, status: QuestionStatus) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q
      )
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm('آیا از حذف این سوال اطمینان دارید؟')) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>بانک سوالات</h1>
          <p>مدیریت سوالات چهارگزینه‌ای و فایل‌محور بر اساس پایه، استان و درس</p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.leftColumn}>
          <section className={`${styles.card} ${styles.subjectCardCompact}`}>
            <div className={styles.subjectCardHeader}>
              <h2>مدیریت درس‌ها</h2>
              <span className={styles.subjectCountBadge}>{subjects.length}</span>
            </div>

            <form onSubmit={handleAddSubject} className={styles.subjectCompactForm}>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="مثلاً: ریاضی"
                className={styles.subjectCompactInput}
              />
              <button
                type="submit"
                className={`${styles.primaryBtn} ${styles.subjectCompactAddBtn}`}
              >
                ثبت
              </button>
            </form>

            <div className={styles.subjectCompactList}>
              {subjects.length === 0 ? (
                <div className={styles.subjectCompactEmpty}>هیچ درسی ثبت نشده است.</div>
              ) : (
                subjects.map((subject) => (
                  <div key={subject.id} className={styles.subjectChip}>
                    <span className={styles.subjectChipText}>{subject.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(subject.id)}
                      className={styles.subjectChipDelete}
                      aria-label={`حذف ${subject.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={styles.card}>
            <h2>{editingId ? 'ویرایش سوال' : 'افزودن سوال جدید'}</h2>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.rowThree}>
                <div className={styles.field}>
                  <label>پایه تحصیلی</label>
                  <select
                    value={form.gradeId}
                    onChange={(e) => setForm((p) => ({ ...p, gradeId: e.target.value }))}
                  >
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label>استان</label>
                  <select
                    value={form.provinceId}
                    onChange={(e) => setForm((p) => ({ ...p, provinceId: e.target.value }))}
                  >
                    <option value={ALL_PROVINCES_VALUE}>همه استان‌ها</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label>درس مرتبط</label>
                  <select
                    value={form.subjectId}
                    onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
                    required
                  >
                    {subjects.length === 0 ? (
                      <option value="">هیچ درسی تعریف نشده است</option>
                    ) : (
                      subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className={styles.rowThree}>
                <div className={styles.field} style={{ gridColumn: 'span 3' }}>
                  <label>نوع سوال</label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        type: e.target.value as QuestionType,
                      }))
                    }
                  >
                    <option value="mcq">چهارگزینه‌ای</option>
                    <option value="file">آپلود فایل</option>
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label>عنوان سوال</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="مثلاً: حل معادله درجه اول"
                />
              </div>

              <div className={styles.field}>
                <label>متن سوال</label>
                <textarea
                  value={form.text}
                  onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                  placeholder="متن کامل سوال را وارد کنید"
                  rows={3}
                />
              </div>

              {form.type === 'mcq' && (
                <div className={styles.optionsBox}>
                  <label className={styles.optionsTitle}>گزینه‌ها و انتخاب پاسخ صحیح</label>
                  <div className={styles.optionsGrid}>
                    {form.options.map((opt, index) => (
                      <div key={index} className={styles.optionRow}>
                        <input
                          type="radio"
                          name="correctOption"
                          id={`opt-${index}`}
                          checked={form.correctOption === index}
                          onChange={() => setForm((p) => ({ ...p, correctOption: index }))}
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...form.options];
                            newOptions[index] = e.target.value;
                            setForm((p) => ({ ...p, options: newOptions }));
                          }}
                          placeholder={`گزینه ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.field}>
                <label>پاسخنامه تشریحی (متن)</label>
                <textarea
                  value={form.answerExplanation}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, answerExplanation: e.target.value }))
                  }
                  placeholder="پاسخ کامل، روش حل یا توضیح تشریحی سوال را وارد کنید"
                  rows={5}
                />
              </div>

              <div className={styles.field}>
                <label>فایل پاسخنامه تشریحی (از بانک سوالات)</label>
                <div className={styles.fileWrapper}>
                  <input
                    type="file"
                    onChange={handleAnswerFileChange}
                    id="answerFileInput"
                    className={styles.fileInputHidden}
                  />
                  <label htmlFor="answerFileInput" className={styles.fileLabel}>
                    <span className={styles.fileIcon}>📘</span>
                    <span>
                      {form.answerAttachmentName
                        ? form.answerAttachmentName
                        : 'انتخاب فایل پاسخنامه تشریحی'}
                    </span>
                  </label>
                </div>
              </div>

              {/* فیلد اختصاصی فایل پاسخنامه دریافتی یا ارسالی هماهنگ با آزمون */}
              <div className={styles.field}>
                <label>پاسخنامه / حل‌نامه ضمیمه (هماهنگ با آزمون)</label>
                <div className={styles.fileWrapper}>
                  <input
                    type="file"
                    onChange={handleAnswerSheetFileChange}
                    id="answerSheetFileInput"
                    className={styles.fileInputHidden}
                  />
                  <label htmlFor="answerSheetFileInput" className={styles.fileLabel}>
                    <span className={styles.fileIcon}>📄</span>
                    <span>
                      {form.answerSheetName
                        ? form.answerSheetName
                        : 'انتخاب فایل پاسخنامه آزمون (تصویر/PDF)'}
                    </span>
                  </label>
                </div>
              </div>

              <div className={styles.field}>
                <label>آپلود فایل یا تصویر ضمیمه سوال</label>
                <div className={styles.fileWrapper}>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    id="fileInput"
                    className={styles.fileInputHidden}
                  />
                  <label htmlFor="fileInput" className={styles.fileLabel}>
                    <span className={styles.fileIcon}>📁</span>
                    <span>
                      {form.attachmentName
                        ? form.attachmentName
                        : 'انتخاب فایل ضمیمه (عکس/PDF)'}
                    </span>
                  </label>
                </div>
              </div>

              <div className={styles.actions}>
                <button type="submit" className={styles.primaryBtn}>
                  {editingId ? 'ذخیره تغییرات' : 'ثبت سوال'}
                </button>
                <button type="button" className={styles.secondaryBtn} onClick={resetForm}>
                  پاک کردن فرم
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className={styles.card}>
          <h2>لیست و فیلتر سوالات</h2>

          <div className={styles.filterBar}>
            <div className={styles.field}>
              <label>پایه</label>
              <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                <option value="">همه</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>استان</label>
              <select value={filterProvince} onChange={(e) => setFilterProvince(e.target.value)}>
                <option value="">همه</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>درس</label>
              <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                <option value="">همه</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>وضعیت</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as QuestionStatus | 'all')}
              >
                <option value="all">همه</option>
                <option value="pending">در انتظار تایید</option>
                <option value="approved">تایید شده</option>
                <option value="rejected">رد شده</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>نوع</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as QuestionType | 'all')}
              >
                <option value="all">همه</option>
                <option value="mcq">چهارگزینه‌ای</option>
                <option value="file">فایل‌محور</option>
              </select>
            </div>
          </div>

          <div className={styles.list}>
            {filteredQuestions.length === 0 ? (
              <div className={styles.emptyState}>سوالی یافت نشد.</div>
            ) : (
              filteredQuestions.map((q) => (
                <div key={q.id} className={styles.questionItem}>
                  <div className={styles.questionTop}>
                    <div>
                      <h3>{q.title}</h3>
                      <p>{q.text}</p>
                    </div>
                    <span className={`${styles.badge} ${styles[q.status]}`}>
                      {q.status === 'pending'
                        ? 'در انتظار تایید'
                        : q.status === 'approved'
                          ? 'تایید شده'
                          : 'رد شده'}
                    </span>
                  </div>

                  <div className={styles.meta}>
                    <span>📌 پایه: {gradeMap[q.gradeId]}</span>
                    <span>📍 استان: {provinceMap[q.provinceId] || 'همه استان‌ها'}</span>
                    <span>📚 درس: {subjectMap[q.subjectId] || 'نامشخص'}</span>
                    <span>🏷️ نوع: {q.type === 'mcq' ? 'چهارگزینه‌ای' : 'فایل‌محور'}</span>
                    {q.sourceExamId && (
                      <span style={{ color: '#059669', fontWeight: 'bold' }}>
                        📥 دریافتی از آزمون
                      </span>
                    )}
                  </div>

                  {q.type === 'mcq' && q.options && (
                    <div className={styles.optionsPreviewGrid}>
                      {q.options.map((opt, idx) => (
                        <div
                          key={idx}
                          className={`${styles.optionPreviewItem} ${
                            q.correctOption === idx ? styles.correctOption : ''
                          }`}
                        >
                          <span className={styles.optIndex}>{idx + 1}.</span> {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.answerExplanation && (
                    <div className={styles.attachment}>
                      <strong>پاسخنامه تشریحی:</strong>
                      <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                        {q.answerExplanation}
                      </p>
                    </div>
                  )}

                  {q.answerAttachmentUrl && (
                    <div className={styles.attachment}>
                      <a href={q.answerAttachmentUrl} target="_blank" rel="noreferrer">
                        📘 مشاهده فایل پاسخنامه تشریحی
                        {q.answerAttachmentName ? ` (${q.answerAttachmentName})` : ''}
                      </a>
                    </div>
                  )}

                  {/* رندر و نمایش فایل پاسخنامه دریافتی یا ذخیره‌شده از آزمون */}
                  {q.answerSheetUrl && (
                    <div className={styles.attachment} style={{ borderRight: '3px solid #2563eb', paddingRight: '8px' }}>
                      <a href={q.answerSheetUrl} download={q.answerSheetName || 'answer-sheet'} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 'bold' }}>
                        📄 دانلود / مشاهده پاسخنامه آزمون
                        {q.answerSheetName ? ` (${q.answerSheetName})` : ''}
                      </a>
                    </div>
                  )}

                  {q.attachmentUrl && (
                    <div className={styles.attachment}>
                      <a href={q.attachmentUrl} target="_blank" rel="noreferrer">
                        📎 مشاهده فایل ضمیمه سوال
                      </a>
                    </div>
                  )}

                  <div className={styles.questionActions}>
                    {q.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(q.id, 'approved')}
                          className={styles.approveBtn}
                        >
                          ✓ تایید
                        </button>
                        <button
                          onClick={() => handleStatusChange(q.id, 'rejected')}
                          className={styles.rejectBtn}
                        >
                          ✕ رد
                        </button>
                      </>
                    )}
                    <button onClick={() => handleEdit(q)} className={styles.secondaryBtn}>
                      ویرایش
                    </button>
                    <button onClick={() => handleDelete(q.id)} className={styles.dangerBtn}>
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
