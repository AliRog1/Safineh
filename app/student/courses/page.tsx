'use client';

import React, { useEffect, useState } from 'react';
import styles from './courses.module.css';

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
}

interface OptionItem {
  id: string;
  name: string;
}

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
    normalized.includes('همه پایه‌ها')
  );
}

function hasOverlap(studentValues: string[], itemValues: string[]): boolean {
  if (hasAllAccess(studentValues)) return true;
  if (hasAllAccess(itemValues)) return true;
  if (studentValues.length === 0 || itemValues.length === 0) return true;

  return itemValues.some((item) => studentValues.includes(item));
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

function filterCoursesForStudent(
  allCourses: Course[],
  studentData: any,
  grades: OptionItem[],
  provinces: OptionItem[]
): Course[] {
  const studentProvinces = mapIdsOrNamesToNormalizedValues(
    studentData?.province,
    provinces,
    false
  );
  const studentGrades = mapIdsOrNamesToNormalizedValues(
    studentData?.grade,
    grades,
    true
  );
  const now = new Date();

  return allCourses.filter((course) => {
    const courseProvinces = mapIdsOrNamesToNormalizedValues(
      course.provinceIds,
      provinces,
      false
    );
    const courseGrades = mapIdsOrNamesToNormalizedValues(
      course.gradeIds,
      grades,
      true
    );

    const isProvinceMatch = hasOverlap(studentProvinces, courseProvinces);
    const isGradeMatch = hasOverlap(studentGrades, courseGrades);

    const start = new Date(course.startAccess);
    const end = new Date(course.endAccess);
    const isTimeMatch =
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      now >= start &&
      now <= end;

    return isProvinceMatch && isGradeMatch && isTimeMatch;
  });
}

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
  return 'لینک کمکی';
};

const formatDateTime = (value: string) => value.replace('T', ' ');

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVisibleCourses = () => {
      const loadedCourses = localStorage.getItem('courses');
      const loadedGrades = localStorage.getItem('grades');
      const loadedProvinces = localStorage.getItem('provinces');
      const currentUserRaw = localStorage.getItem('currentUser');

      if (!currentUserRaw) {
        setCurrentStudent(null);
        setCourses([]);
        return;
      }

      const studentData = JSON.parse(currentUserRaw);
      setCurrentStudent(studentData);

      if (!loadedCourses || !loadedGrades || !loadedProvinces) {
        setCourses([]);
        return;
      }

      const allCourses: Course[] = JSON.parse(loadedCourses);
      const gradesData: OptionItem[] = JSON.parse(loadedGrades);
      const provincesData: OptionItem[] = JSON.parse(loadedProvinces);

      const filtered = filterCoursesForStudent(
        allCourses,
        studentData,
        gradesData,
        provincesData
      );

      setCourses(filtered);
    };

    loadVisibleCourses();
    setLoading(false);

    const handleStorageChange = () => {
      loadVisibleCourses();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
          textAlign: 'center',
          borderRadius: '8px',
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
              این لینک ویدیویی قابل پیش‌نمایش مستقیم نیست. آن را در پنجره جدید باز کنید.
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
                maxHeight: '300px',
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
                  maxHeight: '300px',
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
              لینک مستقیم تصویر نیست. برای مشاهده، آن را در پنجره جدید باز کنید.
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
                borderRadius: '8px',
              }}
            >
              📥 دریافت فایل جزوه PDF
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
                  minHeight: '350px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  background: '#fff',
                }}
              />
              <div style={{ marginTop: '10px' }}>
                {renderOpenLinkButton(source, 'مشاهده در صفحه تمام صفحه')}
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
              لینک مستقیم PDF نیست. برای باز کردن جزوه دکمه زیر را بزنید.
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
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 'bold',
                width: 'auto',
                borderRadius: '8px',
                boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)',
              }}
            >
              🌐 ورود به کلاس آنلاین
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div
        className={styles.container}
        style={{ textAlign: 'center', padding: '50px 0' }}
      >
        <p style={{ color: 'var(--text-muted)' }}>
          در حال بارگذاری دوره‌های آموزشی مجاز شما...
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>📚 دوره‌های آموزشی من</h1>
          <p>
            مشاهده دوره‌های در حال برگزاری، جلسات درسی، فیلم‌های آموزشی و
            جزوات مرتبط با پایه و استان شما
          </p>
          {currentStudent && (
            <div
              style={{ marginTop: '8px', fontSize: '13px', color: '#00e5ff' }}
            >
              📍 استان: {currentStudent.province || 'سراسری'} | 🎓 پایه:{' '}
              {currentStudent.grade || 'تعریف نشده'}
            </div>
          )}
        </div>
      </div>

      <div className={styles.coursesGrid}>
        {courses.map((course) => (
          <div key={course.id} className={styles.courseCard}>
            <div className={styles.courseHeader}>
              <div>
                <h3 className={styles.courseTitle}>{course.name}</h3>
                <div className={styles.courseSubject}>{course.subject}</div>
              </div>

              <div className={styles.timeInfo}>
                <span>شروع دسترسی: {formatDateTime(course.startAccess)}</span>
                <span>پایان دسترسی: {formatDateTime(course.endAccess)}</span>
              </div>
            </div>

            {activeCourseId === course.id ? (
              <div className={styles.sessionSection}>
                <h4
                  style={{ color: '#fff', fontSize: '15px', marginBottom: '14px' }}
                >
                  📖 جلسات و محتوای درس
                </h4>

                {course.sessions.length > 0 ? (
                  course.sessions.map((session) => (
                    <div key={session.id} className={styles.sessionItem}>
                      <div
                        className={styles.sessionTitle}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <span
                          style={{ fontWeight: 'bold', color: '#00e5ff' }}
                        >
                          {session.title}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          marginTop: '10px',
                        }}
                      >
                        {session.contents.length > 0 ? (
                          session.contents.map((content) => (
                            <div key={content.id} className={styles.contentItem}>
                              <div className={styles.contentHeader}>
                                <div className={styles.contentHeaderInfo}>
                                  <span className={styles.contentTitle}>
                                    {content.title}
                                  </span>
                                  <span className={styles.contentTypeBadge}>
                                    {getContentTypeLabel(content.type)}
                                  </span>
                                </div>
                              </div>

                              {renderPreview(content)}
                            </div>
                          ))
                        ) : (
                          <span
                            style={{
                              color: '#94a3b8',
                              fontSize: '12px',
                              padding: '10px 0',
                            }}
                          >
                            محتوایی برای این جلسه هنوز بارگذاری نشده است.
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p
                    style={{
                      color: '#94a3b8',
                      fontSize: '13px',
                      textAlign: 'center',
                      padding: '20px 0',
                    }}
                  >
                    هنوز جلسه‌ای برای این دوره تعریف نشده است.
                  </p>
                )}

                <button
                  type="button"
                  className={styles.actionBtn}
                  style={{
                    background: '#374151',
                    color: '#fff',
                    marginTop: '14px',
                    width: '100%',
                    borderRadius: '8px',
                  }}
                  onClick={() => setActiveCourseId(null)}
                >
                  بستن جلسات دوره
                </button>
              </div>
            ) : (
              <div className={styles.actionRow}>
                <button
                  className={`${styles.actionBtn} ${styles.btnManage}`}
                  style={{ width: '100%', background: '#10b981', color: '#fff' }}
                  onClick={() => setActiveCourseId(course.id)}
                >
                  مشاهده جلسات و فایل‌های دوره ({course.sessions.length})
                </button>
              </div>
            )}
          </div>
        ))}

        {courses.length === 0 && (
          <div
            style={{
              color: '#94a3b8',
              textAlign: 'center',
              gridColumn: '1 / -1',
              padding: '60px 0',
            }}
          >
            📭 هیچ دوره آموزشی متناسب با پایه، استان یا زمان دسترسی شما در حال
            برگزاری نیست.
          </div>
        )}
      </div>
    </div>
  );
}
