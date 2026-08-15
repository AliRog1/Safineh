'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './courses.module.css';

// -------------------------
// Helpers
// -------------------------

function parseMultipleValues(value?: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
  }

  return String(value)
    .split(/[,\u060C-]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

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

function normalizeGrade(value?: any): string {
  const v = normalizeText(value);
  if (!v) return '';

  if (v === '10' || v === '۱۰' || v.includes('دهم')) return '10';
  if (v === '11' || v === '۱۱' || v.includes('یازدهم')) return '11';
  if (v === '12' || v === '۱۲' || v.includes('دوازدهم')) return '12';

  return v;
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
    normalized.includes('همه استان ها') ||
    normalized.includes('همه استان‌ها')
  );
}

function hasOverlap(userValues: string[], itemValues: string[]): boolean {
  if (hasAllAccess(userValues)) return true;
  if (hasAllAccess(itemValues)) return true;
  if (userValues.length === 0 || itemValues.length === 0) return true;

  return itemValues.some((item) => userValues.includes(item));
}

function mapIdsOrNamesToNormalizedValues(
  values: any,
  options: OptionItem[],
  isGrade = false
): string[] {
  const parsed = parseMultipleValues(values);

  return parsed
    .map((item) => {
      const raw = String(item).trim();

      const matchedOption = options.find(
        (opt) =>
          String(opt.id) === raw ||
          normalizeText(opt.name) === normalizeText(raw)
      );

      const finalValue = matchedOption ? matchedOption.name : raw;

      return isGrade ? normalizeGrade(finalValue) : normalizeText(finalValue);
    })
    .filter(Boolean);
}

function isCourseVisibleToTeacher(
  course: Course,
  teacherData: any,
  grades: OptionItem[],
  provinces: OptionItem[]
): boolean {
  const teacherGrades = mapIdsOrNamesToNormalizedValues(
    teacherData?.grade,
    grades,
    true
  );

  const teacherProvinces = mapIdsOrNamesToNormalizedValues(
    teacherData?.province,
    provinces,
    false
  );

  const courseGrades = mapIdsOrNamesToNormalizedValues(
    course.gradeIds,
    grades,
    true
  );

  const courseProvinces = mapIdsOrNamesToNormalizedValues(
    course.provinceIds,
    provinces,
    false
  );

  const gradeMatch = hasOverlap(teacherGrades, courseGrades);
  const provinceMatch = hasOverlap(teacherProvinces, courseProvinces);

  return gradeMatch && provinceMatch;
}

// برای نمایش بهتر روی UI
function mapIdsOrNamesToDisplayValues(values: any, options: OptionItem[]): string[] {
  const parsed = parseMultipleValues(values);

  return parsed
    .map((item) => {
      const raw = String(item).trim();

      const matchedOption = options.find(
        (opt) =>
          String(opt.id) === raw ||
          normalizeText(opt.name) === normalizeText(raw)
      );

      return matchedOption ? matchedOption.name : raw;
    })
    .filter(Boolean);
}

// -------------------------
// Types
// -------------------------

type ContentType =
  | 'video_link'
  | 'video_file'
  | 'image_link'
  | 'image_file'
  | 'pdf_link'
  | 'pdf_file'
  | 'online_class';

interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  url?: string;
  fileData?: string;
}

interface Session {
  id: string;
  title: string;
  contents: ContentItem[];
}

interface Course {
  id: string;
  name: string;
  subject: string;
  gradeIds: string[];
  provinceIds: string[];
  startAccess: string;
  endAccess: string;
  sessions: Session[];
  teacherId?: string;
  createdBy?: 'admin' | 'teacher';
}

interface OptionItem {
  id: string;
  name: string;
}

// -------------------------
// Constants
// -------------------------

const LINK_CONTENT_TYPES: ContentType[] = [
  'video_link',
  'image_link',
  'pdf_link',
  'online_class',
];

const FILE_CONTENT_TYPES: ContentType[] = [
  'video_file',
  'image_file',
  'pdf_file',
];

// -------------------------
// Media helpers
// -------------------------

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const isDirectImageUrl = (url: string) => {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(url);
};

const isDirectVideoUrl = (url: string) => {
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
};

const isDirectPdfUrl = (url: string) => {
  return /\.pdf(\?.*)?$/i.test(url);
};

const getYouTubeEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    return null;
  } catch {
    return null;
  }
};

const getAparatEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(url);

    if (!parsed.hostname.includes('aparat.com')) return null;

    const match =
      parsed.pathname.match(/\/v\/([a-zA-Z0-9]+)/) ||
      parsed.pathname.match(
        /\/video\/video\/embed\/videohash\/([a-zA-Z0-9]+)/
      );

    if (!match?.[1]) return null;

    return `https://www.aparat.com/video/video/embed/videohash/${match[1]}/vt/frame`;
  } catch {
    return null;
  }
};

const getEmbeddableVideoUrl = (url: string) => {
  return getYouTubeEmbedUrl(url) || getAparatEmbedUrl(url);
};

const getContentTypeLabel = (type: ContentType) => {
  if (type === 'online_class') return 'کلاس آنلاین';
  if (type.includes('file')) return 'فایل ضمیمه';
  return 'لینک';
};

const formatDateTime = (value: string) => value.replace('T', ' ');

// -------------------------
// Component
// -------------------------

export default function TeacherCoursesPage() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<OptionItem[]>([]);
  const [provinces, setProvinces] = useState<OptionItem[]>([]);

  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [allowedGradeNames, setAllowedGradeNames] = useState<string[]>([]);
  const [allowedProvinceNames, setAllowedProvinceNames] = useState<string[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [startAccess, setStartAccess] = useState('');
  const [endAccess, setEndAccess] = useState('');

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [contentTitle, setContentTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>('video_link');
  const [contentUrl, setContentUrl] = useState('');
  const [contentFile, setContentFile] = useState<File | null>(null);

  useEffect(() => {
    const loadData = () => {
      const loadedCourses = localStorage.getItem('courses');
      const loadedGrades = localStorage.getItem('grades');
      const loadedProvinces = localStorage.getItem('provinces');
      const currentUserRaw = localStorage.getItem('currentUser');

      const parsedGrades: OptionItem[] = loadedGrades ? JSON.parse(loadedGrades) : [];
      const parsedProvinces: OptionItem[] = loadedProvinces
        ? JSON.parse(loadedProvinces)
        : [];

      setAllCourses(loadedCourses ? JSON.parse(loadedCourses) : []);
      setGrades(parsedGrades);
      setProvinces(parsedProvinces);

      if (currentUserRaw) {
        const user = JSON.parse(currentUserRaw);
        setCurrentTeacher(user);
        setAllowedGradeNames(parseMultipleValues(user.grade));
        setAllowedProvinceNames(parseMultipleValues(user.province));
      } else {
        setCurrentTeacher(null);
        setAllowedGradeNames([]);
        setAllowedProvinceNames([]);
      }
    };

    loadData();

    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const allowedGrades = useMemo(() => {
    return grades.filter((grade) =>
      allowedGradeNames.length === 0 ? true : allowedGradeNames.includes(grade.name)
    );
  }, [grades, allowedGradeNames]);

  const allowedProvinces = useMemo(() => {
    return provinces.filter((province) =>
      allowedProvinceNames.length === 0
        ? true
        : allowedProvinceNames.includes(province.name)
    );
  }, [provinces, allowedProvinceNames]);

  const teacherCourses = useMemo(() => {
    return allCourses.filter((course) => course.teacherId === currentTeacher?.id);
  }, [allCourses, currentTeacher]);

  const adminCourses = useMemo(() => {
    return allCourses.filter((course) => {
      if (!currentTeacher) return false;

      const isOwnCourse = course.teacherId === currentTeacher?.id;
      if (isOwnCourse) return false;

      const isAdminCourse =
        course.createdBy === 'admin' ||
        !course.teacherId ||
        course.teacherId === '';

      if (!isAdminCourse) return false;

      return isCourseVisibleToTeacher(course, currentTeacher, grades, provinces);
    });
  }, [allCourses, currentTeacher, grades, provinces]);

  const saveToLocalStorage = (updatedAllCourses: Course[]) => {
    setAllCourses(updatedAllCourses);
    localStorage.setItem('courses', JSON.stringify(updatedAllCourses));
    window.dispatchEvent(new Event('storage'));
  };

  const resetCourseForm = () => {
    setCourseName('');
    setSubjectName('');
    setSelectedGrades([]);
    setSelectedProvinces([]);
    setStartAccess('');
    setEndAccess('');
    setIsFormOpen(false);
  };

  const resetContentForm = () => {
    setContentTitle('');
    setContentUrl('');
    setContentFile(null);
    setContentType('video_link');
    setActiveSessionId(null);
  };

  const handleToggleGrade = (gradeName: string) => {
    setSelectedGrades((prev) =>
      prev.includes(gradeName)
        ? prev.filter((name) => name !== gradeName)
        : [...prev, gradeName]
    );
  };

  const handleToggleProvince = (provinceName: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(provinceName)
        ? prev.filter((name) => name !== provinceName)
        : [...prev, provinceName]
    );
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTeacher) {
      alert('خطا: اطلاعات کاربری شما یافت نشد. لطفا مجددا وارد شوید.');
      return;
    }

    if (
      !courseName.trim() ||
      !subjectName.trim() ||
      selectedGrades.length === 0 ||
      !startAccess ||
      !endAccess
    ) {
      alert('لطفاً همه فیلدهای الزامی را کامل کنید.');
      return;
    }

    const hasInvalidGrade = selectedGrades.some(
      (name) => allowedGradeNames.length > 0 && !allowedGradeNames.includes(name)
    );

    const hasInvalidProvince = selectedProvinces.some(
      (name) =>
        allowedProvinceNames.length > 0 && !allowedProvinceNames.includes(name)
    );

    if (hasInvalidGrade || hasInvalidProvince) {
      alert('خطای امنیتی: شما مجاز به تعریف دوره برای این پایه‌ها یا استان‌ها نیستید.');
      return;
    }

    if (new Date(startAccess) >= new Date(endAccess)) {
      alert('تاریخ پایان باید بعد از تاریخ شروع باشد.');
      return;
    }

    const newCourse: Course = {
      id: `CRS-${Date.now()}`,
      name: courseName.trim(),
      subject: subjectName.trim(),
      gradeIds: selectedGrades,
      provinceIds: selectedProvinces,
      startAccess,
      endAccess,
      sessions: [],
      teacherId: currentTeacher.id,
      createdBy: 'teacher',
    };

    saveToLocalStorage([newCourse, ...allCourses]);
    resetCourseForm();
  };

  const handleDeleteCourse = (courseId: string) => {
    if (!confirm('آیا از حذف این دوره اطمینان دارید؟')) return;

    const updated = allCourses.filter((course) => course.id !== courseId);
    saveToLocalStorage(updated);

    if (activeCourseId === courseId) setActiveCourseId(null);
    if (activeSessionId) setActiveSessionId(null);
  };

  const handleAddSession = (courseId: string) => {
    const trimmedTitle = newSessionTitle.trim();

    if (!trimmedTitle) {
      alert('عنوان جلسه را وارد کنید.');
      return;
    }

    const updated = allCourses.map((course) => {
      if (course.id !== courseId) return course;

      const newSession: Session = {
        id: `SES-${Date.now()}`,
        title: trimmedTitle,
        contents: [],
      };

      return {
        ...course,
        sessions: [...course.sessions, newSession],
      };
    });

    saveToLocalStorage(updated);
    setNewSessionTitle('');
  };

  const handleDeleteSession = (courseId: string, sessionId: string) => {
    if (!confirm('آیا از حذف این جلسه اطمینان دارید؟')) return;

    const updated = allCourses.map((course) => {
      if (course.id !== courseId) return course;

      return {
        ...course,
        sessions: course.sessions.filter((session) => session.id !== sessionId),
      };
    });

    saveToLocalStorage(updated);

    if (activeSessionId === sessionId) {
      resetContentForm();
    }
  };

  const handleDeleteContent = (
    courseId: string,
    sessionId: string,
    contentId: string
  ) => {
    if (!confirm('آیا از حذف این محتوا اطمینان دارید؟')) return;

    const updated = allCourses.map((course) => {
      if (course.id !== courseId) return course;

      return {
        ...course,
        sessions: course.sessions.map((session) => {
          if (session.id !== sessionId) return session;

          return {
            ...session,
            contents: session.contents.filter((content) => content.id !== contentId),
          };
        }),
      };
    });

    saveToLocalStorage(updated);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAddContent = async (courseId: string, sessionId: string) => {
    if (!contentTitle.trim()) {
      alert('عنوان محتوا الزامی است.');
      return;
    }

    let fileData = '';
    let url = normalizeUrl(contentUrl);

    if (LINK_CONTENT_TYPES.includes(contentType) && !url) {
      alert('لطفاً آدرس لینک را وارد کنید.');
      return;
    }

    if (FILE_CONTENT_TYPES.includes(contentType)) {
      if (!contentFile) {
        alert('لطفاً فایل مورد نظر را انتخاب کنید.');
        return;
      }

      try {
        fileData = await fileToBase64(contentFile);
        url = contentFile.name;
      } catch {
        alert('خطا در بارگذاری فایل.');
        return;
      }
    }

    const newContent: ContentItem = {
      id: `CNT-${Date.now()}`,
      type: contentType,
      title: contentTitle.trim(),
      url: url || undefined,
      fileData: fileData || undefined,
    };

    const updated = allCourses.map((course) => {
      if (course.id !== courseId) return course;

      return {
        ...course,
        sessions: course.sessions.map((session) => {
          if (session.id !== sessionId) return session;

          return {
            ...session,
            contents: [...session.contents, newContent],
          };
        }),
      };
    });

    saveToLocalStorage(updated);
    resetContentForm();
  };

  const renderOpenLinkButton = (source: string, label = 'باز کردن لینک') => {
    return (
      <a
        href={source}
        target="_blank"
        rel="noreferrer"
        className={styles.actionBtn}
        style={{
          background: '#3b82f6',
          color: '#fff',
          display: 'inline-block',
          padding: '8px 14px',
          fontSize: '12px',
          width: 'auto',
        }}
      >
        {label}
      </a>
    );
  };

  const renderPreview = (content: ContentItem) => {
    const source = content.fileData || content.url;

    if (!source) {
      return (
        <span style={{ color: '#ef4444', fontSize: '12px' }}>
          محتوا فاقد لینک یا فایل است
        </span>
      );
    }

    const frameStyle: React.CSSProperties = {
      width: '100%',
      aspectRatio: '16 / 9',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      background: '#000',
    };

    switch (content.type) {
      case 'video_file':
        return (
          <div style={{ marginTop: '8px', width: '100%' }}>
            <video controls style={frameStyle}>
              <source src={source} />
              مرورگر شما از پیش‌نمایش ویدیو پشتیبانی نمی‌کند.
            </video>
          </div>
        );

      case 'video_link': {
        const embedUrl = getEmbeddableVideoUrl(source);

        if (embedUrl) {
          return (
            <div style={{ marginTop: '8px', width: '100%' }}>
              <iframe
                src={embedUrl}
                title={content.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={frameStyle}
              />
            </div>
          );
        }

        if (isDirectVideoUrl(source)) {
          return (
            <div style={{ marginTop: '8px', width: '100%' }}>
              <video controls style={frameStyle}>
                <source src={source} />
                مرورگر شما از پیش‌نمایش ویدیو پشتیبانی نمی‌کند.
              </video>
            </div>
          );
        }

        return (
          <div style={{ marginTop: '8px' }}>
            <span
              style={{
                display: 'block',
                color: '#fbbf24',
                fontSize: '12px',
                marginBottom: '8px',
              }}
            >
              این لینک ویدیویی قابل پیش‌نمایش مستقیم نیست. آن را در تب جدید باز کنید.
            </span>
            {renderOpenLinkButton(source)}
          </div>
        );
      }

      case 'image_file':
        return (
          <div style={{ marginTop: '8px' }}>
            <img
              src={source}
              alt={content.title}
              style={{
                width: '100%',
                maxHeight: '260px',
                objectFit: 'contain',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.25)',
              }}
            />
          </div>
        );

      case 'image_link':
        if (isDirectImageUrl(source)) {
          return (
            <div style={{ marginTop: '8px' }}>
              <img
                src={source}
                alt={content.title}
                style={{
                  width: '100%',
                  maxHeight: '260px',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.25)',
                }}
              />
            </div>
          );
        }

        return (
          <div style={{ marginTop: '8px' }}>
            <span
              style={{
                display: 'block',
                color: '#fbbf24',
                fontSize: '12px',
                marginBottom: '8px',
              }}
            >
              این لینک، فایل مستقیم عکس نیست. برای مشاهده، آن را در تب جدید باز کنید.
            </span>
            {renderOpenLinkButton(source)}
          </div>
        );

      case 'pdf_file':
        return (
          <div style={{ marginTop: '8px' }}>
            <a
              href={source}
              download={content.title}
              className={styles.actionBtn}
              style={{
                background: '#10b981',
                color: '#fff',
                display: 'inline-block',
                padding: '8px 14px',
                fontSize: '12px',
                width: 'auto',
              }}
            >
              دانلود و مشاهده فایل PDF
            </a>
          </div>
        );

      case 'pdf_link':
        if (isDirectPdfUrl(source)) {
          return (
            <div style={{ marginTop: '8px', width: '100%' }}>
              <iframe
                src={source}
                title={content.title}
                style={{
                  width: '100%',
                  minHeight: '320px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  background: '#fff',
                }}
              />
              <div style={{ marginTop: '10px' }}>
                {renderOpenLinkButton(source)}
              </div>
            </div>
          );
        }

        return (
          <div style={{ marginTop: '8px' }}>
            <span
              style={{
                display: 'block',
                color: '#fbbf24',
                fontSize: '12px',
                marginBottom: '8px',
              }}
            >
              این لینک، فایل مستقیم PDF نیست. برای مشاهده، آن را در تب جدید باز کنید.
            </span>
            {renderOpenLinkButton(source)}
          </div>
        );

      case 'online_class':
        return (
          <div style={{ marginTop: '8px' }}>
            <a
              href={source}
              target="_blank"
              rel="noreferrer"
              className={styles.actionBtn}
              style={{
                background: '#8b5cf6',
                color: '#fff',
                display: 'inline-block',
                padding: '8px 14px',
                fontSize: '12px',
                width: 'auto',
              }}
            >
              ورود به کلاس آنلاین
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  const getCourseGradeLabels = (course: Course) => {
    const values = mapIdsOrNamesToDisplayValues(course.gradeIds, grades);
    return values.length ? values.join('، ') : 'سراسری';
  };

  const getCourseProvinceLabels = (course: Course) => {
    const values = mapIdsOrNamesToDisplayValues(course.provinceIds, provinces);
    return values.length ? values.join('، ') : 'سراسری';
  };

  const renderTeacherCourseCard = (course: Course) => {
    return (
      <div key={course.id} className={styles.courseCard}>
        <div className={styles.courseHeader}>
          <div>
            <h3 className={styles.courseTitle}>{course.name}</h3>
            <div className={styles.courseSubject}>{course.subject}</div>
          </div>

          <div className={styles.timeInfo}>
            <span>شروع: {formatDateTime(course.startAccess)}</span>
            <span>پایان: {formatDateTime(course.endAccess)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              alignItems: 'flex-end',
            }}
          >
            <span className={styles.badge}>
              🎓 پایه‌ها: {getCourseGradeLabels(course)}
            </span>
            <span className={styles.badge}>
              📍 استان‌ها: {getCourseProvinceLabels(course)}
            </span>
          </div>
        </div>

        {activeCourseId === course.id ? (
          <div className={styles.sessionSection}>
            <h4 style={{ color: '#fff', fontSize: '15px', marginBottom: '14px' }}>
              جلسات دوره
            </h4>

            {course.sessions.map((session) => (
              <div key={session.id} className={styles.sessionItem}>
                <div className={styles.sessionTitle}>
                  <span>{session.title}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(course.id, session.id)}
                    className={styles.deleteMiniBtn}
                  >
                    حذف جلسه
                  </button>
                </div>

                {session.contents.length > 0 ? (
                  session.contents.map((content) => (
                    <div key={content.id} className={styles.contentItem}>
                      <div className={styles.contentHeader}>
                        <div className={styles.contentHeaderInfo}>
                          <span className={styles.contentTitle}>{content.title}</span>
                          <span className={styles.contentTypeBadge}>
                            {getContentTypeLabel(content.type)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteContent(course.id, session.id, content.id)
                          }
                          className={styles.deleteMiniBtn}
                        >
                          حذف محتوا
                        </button>
                      </div>

                      {renderPreview(content)}
                    </div>
                  ))
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    هنوز محتوایی برای این جلسه ثبت نشده است.
                  </span>
                )}

                {activeSessionId === session.id ? (
                  <div
                    style={{
                      marginTop: '12px',
                      borderTop: '1px dashed rgba(255,255,255,0.1)',
                      paddingTop: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="عنوان فایل یا لینک"
                      className={styles.formInput}
                      value={contentTitle}
                      onChange={(e) => setContentTitle(e.target.value)}
                    />

                    <select
                      className={styles.formSelect}
                      value={contentType}
                      onChange={(e) => {
                        setContentType(e.target.value as ContentType);
                        setContentUrl('');
                        setContentFile(null);
                      }}
                    >
                      <option value="video_link">لینک ویدیو (آپارات، یوتیوب و...)</option>
                      <option value="video_file">آپلود فایل ویدیو</option>
                      <option value="image_link">لینک عکس</option>
                      <option value="image_file">آپلود فایل عکس</option>
                      <option value="pdf_link">لینک PDF</option>
                      <option value="pdf_file">آپلود فایل PDF</option>
                      <option value="online_class">لینک کلاس آنلاین</option>
                    </select>

                    {LINK_CONTENT_TYPES.includes(contentType) ? (
                      <input
                        type="url"
                        placeholder="آدرس اینترنتی را وارد کنید"
                        className={styles.formInput}
                        value={contentUrl}
                        onChange={(e) => setContentUrl(e.target.value)}
                      />
                    ) : (
                      <div className={styles.formGroup}>
                        <input
                          type="file"
                          style={{ color: '#fff' }}
                          accept={
                            contentType === 'video_file'
                              ? 'video/*'
                              : contentType === 'image_file'
                              ? 'image/*'
                              : '.pdf'
                          }
                          onChange={(e) => {
                            setContentFile(e.target.files?.[0] || null);
                          }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={styles.saveBtn}
                        style={{ padding: '8px 14px', fontSize: '12px' }}
                        onClick={() => handleAddContent(course.id, session.id)}
                      >
                        افزودن محتوا
                      </button>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        style={{ padding: '8px 14px', fontSize: '12px' }}
                        onClick={resetContentForm}
                      >
                        لغو
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      fontSize: '12px',
                      marginTop: '10px',
                    }}
                    onClick={() => {
                      setActiveCourseId(course.id);
                      setActiveSessionId(session.id);
                      setContentTitle('');
                      setContentType('video_link');
                      setContentUrl('');
                      setContentFile(null);
                    }}
                  >
                    + افزودن فایل/لینک جدید
                  </button>
                )}
              </div>
            ))}

            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                placeholder="عنوان جلسه"
                className={styles.formInput}
                style={{ flex: 1, minWidth: '220px' }}
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
              />
              <button
                type="button"
                className={styles.saveBtn}
                style={{ padding: '10px 16px' }}
                onClick={() => handleAddSession(course.id)}
              >
                افزودن جلسه
              </button>
            </div>

            <button
              type="button"
              className={styles.actionBtn}
              style={{
                background: '#374151',
                color: '#fff',
                marginTop: '14px',
                width: '100%',
              }}
              onClick={() => {
                setActiveCourseId(null);
                setActiveSessionId(null);
                setNewSessionTitle('');
              }}
            >
              بستن بخش جلسات
            </button>
          </div>
        ) : (
          <div className={styles.actionRow}>
            <button
              className={`${styles.actionBtn} ${styles.btnManage}`}
              onClick={() => {
                setActiveCourseId(course.id);
                setActiveSessionId(null);
              }}
            >
              مدیریت جلسات و محتوا ({course.sessions.length})
            </button>
            <button
              className={`${styles.actionBtn} ${styles.btnDelete}`}
              onClick={() => handleDeleteCourse(course.id)}
            >
              حذف دوره
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAdminCourseCard = (course: Course) => {
    return (
      <div key={course.id} className={styles.courseCard}>
        <div className={styles.courseHeader}>
          <div>
            <h3 className={styles.courseTitle}>{course.name}</h3>
            <div className={styles.courseSubject}>{course.subject}</div>
          </div>

          <div className={styles.timeInfo}>
            <span>شروع: {formatDateTime(course.startAccess)}</span>
            <span>پایان: {formatDateTime(course.endAccess)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              alignItems: 'flex-end',
            }}
          >
            <span className={styles.badge}>
              🎓 پایه‌ها: {getCourseGradeLabels(course)}
            </span>
            <span className={styles.badge}>
              📍 استان‌ها: {getCourseProvinceLabels(course)}
            </span>
            <span
              className={styles.badge}
              style={{
                background: 'rgba(59,130,246,0.12)',
                color: '#93c5fd',
              }}
            >
              ساخته‌شده توسط ادمین
            </span>
          </div>
        </div>

        {activeCourseId === course.id ? (
          <div className={styles.sessionSection}>
            <h4 style={{ color: '#fff', fontSize: '15px', marginBottom: '14px' }}>
              جلسات دوره
            </h4>

            {course.sessions.length > 0 ? (
              course.sessions.map((session) => (
                <div key={session.id} className={styles.sessionItem}>
                  <div className={styles.sessionTitle}>
                    <span>{session.title}</span>
                  </div>

                  {session.contents.length > 0 ? (
                    session.contents.map((content) => (
                      <div key={content.id} className={styles.contentItem}>
                        <div className={styles.contentHeader}>
                          <div className={styles.contentHeaderInfo}>
                            <span className={styles.contentTitle}>{content.title}</span>
                            <span className={styles.contentTypeBadge}>
                              {getContentTypeLabel(content.type)}
                            </span>
                          </div>
                        </div>

                        {renderPreview(content)}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                      هنوز محتوایی برای این جلسه ثبت نشده است.
                    </span>
                  )}
                </div>
              ))
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                هنوز جلسه‌ای برای این دوره ثبت نشده است.
              </span>
            )}

            <button
              type="button"
              className={styles.actionBtn}
              style={{
                background: '#374151',
                color: '#fff',
                marginTop: '14px',
                width: '100%',
              }}
              onClick={() => {
                setActiveCourseId(null);
                setActiveSessionId(null);
              }}
            >
              بستن بخش مشاهده
            </button>
          </div>
        ) : (
          <div className={styles.actionRow}>
            <button
              className={`${styles.actionBtn} ${styles.btnManage}`}
              onClick={() => {
                setActiveCourseId(course.id);
                setActiveSessionId(null);
              }}
            >
              مشاهده جلسات و محتوا ({course.sessions.length})
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>پنل مدیریت دوره‌ها (مدرس)</h1>
          <p>
            تعریف و مدیریت محتوای دوره‌های متعلق به شما + مشاهده دوره‌های ساخته‌شده توسط ادمین
          </p>

          {currentTeacher && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#a78bfa' }}>
              👤 مدرس: {currentTeacher.name}
            </div>
          )}
        </div>

        <button
          className={styles.newBtn}
          onClick={() => setIsFormOpen((prev) => !prev)}
        >
          {isFormOpen ? 'بستن فرم' : 'ایجاد دوره جدید'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleCreateCourse} className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>نام دوره:</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="مثال: ریاضی عمومی پایه دهم"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>نام درس:</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="مثال: ریاضی"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>پایه‌های تحصیلی مجاز شما:</label>
              <div className={styles.selectionBox}>
                {allowedGrades.map((grade) => (
                  <label key={grade.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={selectedGrades.includes(grade.name)}
                      onChange={() => handleToggleGrade(grade.name)}
                    />
                    <span>{grade.name}</span>
                  </label>
                ))}

                {allowedGrades.length === 0 && (
                  <span style={{ color: '#ef4444', fontSize: '12px' }}>
                    شما دسترسی به هیچ پایه‌ای ندارید. لطفاً با مدیریت تماس بگیرید.
                  </span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>استان‌های مجاز شما:</label>
              <div className={styles.selectionBox}>
                {allowedProvinces.map((province) => (
                  <label key={province.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={selectedProvinces.includes(province.name)}
                      onChange={() => handleToggleProvince(province.name)}
                    />
                    <span>{province.name}</span>
                  </label>
                ))}

                {allowedProvinces.length === 0 && (
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    اگر استانی برای شما تعریف نشده، دسترسی به‌صورت سراسری در نظر گرفته می‌شود.
                  </span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>تاریخ و ساعت شروع دسترسی:</label>
              <input
                type="datetime-local"
                className={styles.formInput}
                value={startAccess}
                onChange={(e) => setStartAccess(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>تاریخ و ساعت پایان دسترسی:</label>
              <input
                type="datetime-local"
                className={styles.formInput}
                value={endAccess}
                onChange={(e) => setEndAccess(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.btnGroup}>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={allowedGrades.length === 0}
              style={{
                opacity: allowedGrades.length === 0 ? 0.5 : 1,
                cursor: allowedGrades.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ثبت دوره جدید
            </button>

            <button
              type="button"
              className={styles.cancelBtn}
              onClick={resetCourseForm}
            >
              انصراف
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: '22px', marginBottom: '10px' }}>
        <h2 style={{ color: '#fff', fontSize: '18px' }}>دوره‌های من</h2>
      </div>

      <div className={styles.coursesGrid}>
        {teacherCourses.map(renderTeacherCourseCard)}

        {teacherCourses.length === 0 && (
          <div
            style={{
              color: '#94a3b8',
              textAlign: 'center',
              gridColumn: '1 / -1',
              padding: '40px 0',
            }}
          >
            هیچ دوره‌ای توسط شما ثبت نشده است. برای شروع، روی «ایجاد دوره جدید» کلیک کنید.
          </div>
        )}
      </div>

      <div style={{ marginTop: '32px', marginBottom: '10px' }}>
        <h2 style={{ color: '#fff', fontSize: '18px' }}>
          دوره‌های ساخته‌شده توسط ادمین
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
          این دوره‌ها بر اساس پایه و استان مجاز شما نمایش داده می‌شوند و فقط قابل مشاهده هستند.
        </p>
      </div>

      <div className={styles.coursesGrid}>
        {adminCourses.map(renderAdminCourseCard)}

        {adminCourses.length === 0 && (
          <div
            style={{
              color: '#94a3b8',
              textAlign: 'center',
              gridColumn: '1 / -1',
              padding: '40px 0',
            }}
          >
            فعلاً هیچ دوره‌ای از سمت ادمین متناسب با دسترسی شما یافت نشد.
          </div>
        )}
      </div>
    </div>
  );
}
