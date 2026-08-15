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
  answerAttachmentUrl?: string;
  answerAttachmentName?: string;
  answerSheetUrl?: string;
  answerSheetName?: string;
  createdAt: string;
  updatedAt: string;
  createdByTeacherId?: string;
}

const STORAGE_KEY = 'questions';
const GRADES_KEY = 'grades';
const PROVINCES_KEY = 'provinces';
const SUBJECTS_KEY = 'subjects';
const ALL_PROVINCES_VALUE = 'all-provinces';
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // محدودیت حجم ۲ مگابایت

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

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [allowedGradeNames, setAllowedGradeNames] = useState<string[]>([]);
  const [allowedProvinceNames, setAllowedProvinceNames] = useState<string[]>([]);

  const [filterGrade, setFilterGrade] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<QuestionType | 'all'>('all');

  const [newSubjectName, setNewSubjectName] = useState('');

  const [form, setForm] = useState({
    title: '',
    text: '',
    type: 'mcq' as QuestionType,
    options: ['', '', '', ''],
    correctOption: 0,
    gradeId: '',
    provinceId: '',
    subjectId: '',
    attachmentUrl: '',
    attachmentName: '',
    answerExplanation: '',
    answerAttachmentUrl: '',
    answerAttachmentName: '',
  });

  useEffect(() => {
    const storedQuestions = localStorage.getItem(STORAGE_KEY);
    const storedGrades = localStorage.getItem(GRADES_KEY);
    const storedProvinces = localStorage.getItem(PROVINCES_KEY);
    const storedSubjects = localStorage.getItem(SUBJECTS_KEY);
    const currentUserRaw = localStorage.getItem('currentUser');

    const parsedGrades: Grade[] = storedGrades ? JSON.parse(storedGrades) : [];
    const parsedProvinces: Province[] = storedProvinces ? JSON.parse(storedProvinces) : [];
    const parsedSubjects: Subject[] = storedSubjects ? JSON.parse(storedSubjects) : [];
    
    // لود و نرمال‌سازی فیلدهای پاسخنامه آزمون به بانک سوالات
    const parsedQuestions: Question[] = storedQuestions
      ? JSON.parse(storedQuestions).map((q: any) => ({
          ...q,
          answerAttachmentUrl: q.answerAttachmentUrl || q.answerSheetUrl,
          answerAttachmentName: q.answerAttachmentName || q.answerSheetName,
          answerSheetUrl: q.answerSheetUrl || q.answerAttachmentUrl,
          answerSheetName: q.answerSheetName || q.answerAttachmentName,
        }))
      : [];

    setGrades(parsedGrades);
    setProvinces(parsedProvinces);
    setSubjects(parsedSubjects);
    setQuestions(parsedQuestions);

    if (currentUserRaw) {
      const user = JSON.parse(currentUserRaw);
      setCurrentTeacher(user);

      const parsedGradesFromUser = parseMultipleValues(user.grade);
      const parsedProvincesFromUser = parseMultipleValues(user.province);

      setAllowedGradeNames(parsedGradesFromUser);
      setAllowedProvinceNames(parsedProvincesFromUser);

      const matchedGrades = parsedGrades.filter((g) =>
        parsedGradesFromUser.length === 0 ? true : parsedGradesFromUser.includes(g.name)
      );

      const matchedProvinces = parsedProvinces.filter((p) =>
        parsedProvincesFromUser.length === 0 ? true : parsedProvincesFromUser.includes(p.name)
      );

      setForm((prev) => ({
        ...prev,
        gradeId: matchedGrades[0]?.id || '',
        provinceId: matchedProvinces[0]?.id || ALL_PROVINCES_VALUE,
        subjectId: parsedSubjects[0]?.id || '',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        subjectId: parsedSubjects[0]?.id || '',
      }));
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  }, [questions, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
  }, [subjects, isLoaded]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const updatedQuestions: Question[] = e.newValue
          ? JSON.parse(e.newValue).map((q: any) => ({
              ...q,
              answerAttachmentUrl: q.answerAttachmentUrl || q.answerSheetUrl,
              answerAttachmentName: q.answerAttachmentName || q.answerSheetName,
              answerSheetUrl: q.answerSheetUrl || q.answerAttachmentUrl,
              answerSheetName: q.answerSheetName || q.answerAttachmentName,
            }))
          : [];
        setQuestions(updatedQuestions);
      }

      if (e.key === SUBJECTS_KEY) {
        const updatedSubjects: Subject[] = e.newValue ? JSON.parse(e.newValue) : [];
        setSubjects(updatedSubjects);

        setForm((prev) => ({
          ...prev,
          subjectId:
            prev.subjectId && updatedSubjects.some((s) => s.id === prev.subjectId)
              ? prev.subjectId
              : updatedSubjects[0]?.id || '',
        }));
      }

      if (e.key === GRADES_KEY) {
        const updatedGrades: Grade[] = e.newValue ? JSON.parse(e.newValue) : [];
        setGrades(updatedGrades);
      }

      if (e.key === PROVINCES_KEY) {
        const updatedProvinces: Province[] = e.newValue ? JSON.parse(e.newValue) : [];
        setProvinces(updatedProvinces);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const filteredGradesForForm = useMemo(() => {
    return grades.filter((g) =>
      allowedGradeNames.length === 0 ? true : allowedGradeNames.includes(g.name)
    );
  }, [grades, allowedGradeNames]);

  const filteredProvincesForForm = useMemo(() => {
    return provinces.filter((p) =>
      allowedProvinceNames.length === 0 ? true : allowedProvinceNames.includes(p.name)
    );
  }, [provinces, allowedProvinceNames]);

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

  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      const isCreator = q.createdByTeacherId === currentTeacher?.id;

      const gradeName = gradeMap[q.gradeId];
      const provinceName = provinceMap[q.provinceId];

      const isGradeAllowed =
        allowedGradeNames.length === 0 || allowedGradeNames.includes(gradeName);

      const isProvinceAllowed =
        q.provinceId === ALL_PROVINCES_VALUE ||
        allowedProvinceNames.length === 0 ||
        allowedProvinceNames.includes(provinceName);

      return isCreator || (isGradeAllowed && isProvinceAllowed);
    });
  }, [questions, currentTeacher, allowedGradeNames, allowedProvinceNames, gradeMap, provinceMap]);

  const filteredQuestions = useMemo(() => {
    return visibleQuestions.filter((q) => {
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
  }, [
    visibleQuestions,
    filterGrade,
    filterProvince,
    filterSubject,
    filterStatus,
    filterType,
  ]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      text: '',
      type: 'mcq',
      options: ['', '', '', ''],
      correctOption: 0,
      gradeId: filteredGradesForForm[0]?.id || '',
      provinceId: filteredProvincesForForm[0]?.id || ALL_PROVINCES_VALUE,
      subjectId: subjects[0]?.id || '',
      attachmentUrl: '',
      attachmentName: '',
      answerExplanation: '',
      answerAttachmentUrl: '',
      answerAttachmentName: '',
    });
  };

  const handleAddSubject = () => {
    const subjectName = newSubjectName.trim();

    if (!subjectName) {
      alert('لطفاً نام درس را وارد کنید.');
      return;
    }

    const isDuplicate = subjects.some(
      (subject) => subject.name.trim().toLowerCase() === subjectName.toLowerCase()
    );

    if (isDuplicate) {
      alert('این درس قبلاً ثبت شده است.');
      return;
    }

    const newSubject: Subject = {
      id: `SUB-${Date.now()}`,
      name: subjectName,
    };

    const updatedSubjects = [...subjects, newSubject];
    setSubjects(updatedSubjects);

    setForm((prev) => ({
      ...prev,
      subjectId: newSubject.id,
    }));

    setNewSubjectName('');
  };

  const fileToBase64 = (file: File, onLoad: (result: string) => void) => {
    if (file.size > MAX_UPLOAD_SIZE) {
      alert('حجم فایل انتخاب شده نباید بیشتر از ۲ مگابایت باشد.');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTeacher) {
      alert('خطا هویتی: ابتدا وارد حساب کاربری خود شوید.');
      return;
    }

    if (!form.title.trim() || !form.text.trim() || !form.subjectId) {
      alert('لطفاً تمامی فیلدهای الزامی را پر کنید.');
      return;
    }

    const selectedGradeName = gradeMap[form.gradeId];
    const selectedProvinceName = provinceMap[form.provinceId];

    const isGradeForbidden =
      allowedGradeNames.length > 0 && !allowedGradeNames.includes(selectedGradeName);

    const isProvinceForbidden =
      form.provinceId !== ALL_PROVINCES_VALUE &&
      allowedProvinceNames.length > 0 &&
      !allowedProvinceNames.includes(selectedProvinceName);

    if (isGradeForbidden || isProvinceForbidden) {
      alert('خطای امنیتی: شما مجاز به طرح سوال در این پایه یا استان نیستید.');
      return;
    }

    const payload: Question = {
      id: editingId || `Q-${Date.now()}`,
      title: form.title.trim(),
      text: form.text.trim(),
      type: form.type,
      options: form.type === 'mcq' ? form.options : undefined,
      correctOption: form.type === 'mcq' ? form.correctOption : undefined,
      gradeId: form.gradeId,
      provinceId: form.provinceId,
      subjectId: form.subjectId,
      status: 'pending',
      attachmentUrl: form.attachmentUrl || undefined,
      attachmentName: form.attachmentName || undefined,
      answerExplanation: form.answerExplanation.trim() || undefined,
      // همگام‌سازی کامل هر دو فیلد پاسخنامه جهت جلوگیری از ناسازگاری ساختار داده
      answerAttachmentUrl: form.answerAttachmentUrl || undefined,
      answerAttachmentName: form.answerAttachmentName || undefined,
      answerSheetUrl: form.answerAttachmentUrl || undefined,
      answerSheetName: form.answerAttachmentName || undefined,
      createdAt: editingId
        ? questions.find((q) => q.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByTeacherId: currentTeacher.id,
    };

    if (editingId) {
      setQuestions((prev) => prev.map((q) => (q.id === editingId ? payload : q)));
    } else {
      setQuestions((prev) => [payload, ...prev]);
    }

    resetForm();
  };

  const handleEdit = (q: Question) => {
    const isCreator = q.createdByTeacherId === currentTeacher?.id;

    if (!isCreator) {
      alert('شما فقط می‌توانید سوالات طرح شده توسط خودتان را ویرایش کنید.');
      return;
    }

    setEditingId(q.id);
    setForm({
      title: q.title,
      text: q.text,
      type: q.type,
      options: q.options || ['', '', '', ''],
      correctOption: q.correctOption ?? 0,
      gradeId: q.gradeId,
      provinceId: q.provinceId,
      subjectId: q.subjectId || subjects[0]?.id || '',
      attachmentUrl: q.attachmentUrl || '',
      attachmentName: q.attachmentName || '',
      answerExplanation: q.answerExplanation || '',
      answerAttachmentUrl: q.answerAttachmentUrl || q.answerSheetUrl || '',
      answerAttachmentName: q.answerAttachmentName || q.answerSheetName || '',
    });
  };

  const handleDelete = (id: string) => {
    const target = questions.find((q) => q.id === id);
    if (!target) return;

    if (target.createdByTeacherId !== currentTeacher?.id) {
      alert('شما مجاز به حذف سوالات سایر مدرسین نیستید.');
      return;
    }

    if (!confirm('آیا از حذف این سوال اطمینان دارید؟')) return;

    setQuestions((prev) => prev.filter((q) => q.id !== id));

    if (editingId === id) {
      resetForm();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>بانک سوالات (پنل مدرس)</h1>
          <p>طرح و مدیریت سوالات تستی و فایل‌محور در محدوده‌ی دسترسی پایه و استان شما</p>
          {currentTeacher && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#a78bfa' }}>
              👤 مدرس: {currentTeacher.name} | پایه‌های مجاز: {allowedGradeNames.join('، ') || 'همه'} |
              استان‌های مجاز: {allowedProvinceNames.join('، ') || 'همه'}
            </div>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>{editingId ? 'ویرایش سوال' : 'طرح سوال جدید'}</h2>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.rowThree}>
              <div className={styles.field}>
                <label>پایه تحصیلی مجاز</label>
                <select
                  value={form.gradeId}
                  onChange={(e) => setForm((prev) => ({ ...prev, gradeId: e.target.value }))}
                  required
                >
                  {filteredGradesForForm.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                  {filteredGradesForForm.length === 0 && (
                    <option value="">دسترسی به پایه‌ای تعریف نشده</option>
                  )}
                </select>
              </div>

              <div className={styles.field}>
                <label>استان مجاز</label>
                <select
                  value={form.provinceId}
                  onChange={(e) => setForm((prev) => ({ ...prev, provinceId: e.target.value }))}
                  required
                >
                  {allowedProvinceNames.length === 0 && (
                    <option value={ALL_PROVINCES_VALUE}>همه استان‌ها</option>
                  )}
                  {filteredProvincesForForm.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>درس</label>
                <select
                  value={form.subjectId}
                  onChange={(e) => setForm((prev) => ({ ...prev, subjectId: e.target.value }))}
                  required
                >
                  {subjects.length === 0 ? (
                    <option value="">هیچ درسی تعریف نشده است</option>
                  ) : (
                    subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label>ایجاد درس جدید</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="مثلاً: ریاضی"
                />
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleAddSubject}
                >
                  افزودن درس
                </button>
              </div>
            </div>

            <div className={styles.rowThree}>
              <div className={styles.field} style={{ gridColumn: 'span 3' }}>
                <label>نوع سوال</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
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
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="مثلاً: حل معادله درجه اول"
                required
              />
            </div>

            <div className={styles.field}>
              <label>متن سوال</label>
              <textarea
                value={form.text}
                onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
                placeholder="متن کامل سوال را وارد کنید"
                rows={3}
                required
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
                        onChange={() =>
                          setForm((prev) => ({
                            ...prev,
                            correctOption: index,
                          }))
                        }
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...form.options];
                          newOptions[index] = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            options: newOptions,
                          }));
                        }}
                        placeholder={`گزینه ${index + 1}`}
                        required={form.type === 'mcq'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label>پاسخنامه تشریحی</label>
              <textarea
                value={form.answerExplanation}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, answerExplanation: e.target.value }))
                }
                placeholder="روش حل، توضیح تشریحی یا پاسخ کامل سوال را وارد کنید"
                rows={5}
              />
            </div>

            <div className={styles.field}>
              <label>فایل پاسخنامه تشریحی</label>
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

            <div className={styles.field}>
              <label>آپلود فایل یا تصویر ضمیمه</label>
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
                    {form.attachmentName ? form.attachmentName : 'انتخاب فایل ضمیمه (عکس/PDF)'}
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={filteredGradesForForm.length === 0 || subjects.length === 0}
              >
                {editingId ? 'ثبت جهت تایید مجدد' : 'طرح و ارسال برای تایید'}
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={resetForm}>
                انصراف / پاک کردن
              </button>
            </div>
          </form>
        </section>

        <section className={styles.card}>
          <h2>لیست سوالات شما</h2>

          <div className={styles.filterBar}>
            <div className={styles.field}>
              <label>پایه</label>
              <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                <option value="">همه</option>
                {filteredGradesForForm.map((g) => (
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
                {filteredProvincesForForm.map((p) => (
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
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>وضعیت تایید</label>
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
              filteredQuestions.map((q) => {
                const isCreator = q.createdByTeacherId === currentTeacher?.id;
                // دریافت لینک و نام پاسخنامه بر اساس هر دو فرمت کلید
                const activeAnswerUrl = q.answerAttachmentUrl || q.answerSheetUrl;
                const activeAnswerName = q.answerAttachmentName || q.answerSheetName;

                return (
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
                      {q.createdByTeacherId && (
                        <span style={{ color: '#818cf8' }}>
                          ✍️ طراح: {q.createdByTeacherId === currentTeacher?.id ? 'شما' : 'سایر مدرسین'}
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

                    {activeAnswerUrl && (
                      <div className={styles.attachment}>
                        <a href={activeAnswerUrl} target="_blank" rel="noreferrer">
                          📘 مشاهده فایل پاسخنامه تشریحی
                          {activeAnswerName ? ` (${activeAnswerName})` : ''}
                        </a>
                      </div>
                    )}

                    {q.attachmentUrl && (
                      <div className={styles.attachment}>
                        <a href={q.attachmentUrl} target="_blank" rel="noreferrer">
                          📎 مشاهده فایل ضمیمه
                        </a>
                      </div>
                    )}

                    <div className={styles.questionActions}>
                      {isCreator ? (
                        <>
                          <button onClick={() => handleEdit(q)} className={styles.secondaryBtn}>
                            ویرایش
                          </button>
                          <button onClick={() => handleDelete(q.id)} className={styles.dangerBtn}>
                            حذف
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          شما فقط مجاز به ویرایش یا حذف سوالات خود هستید.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
