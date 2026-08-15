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
}

interface OptionItem {
  id: string;
  name: string;
}

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
      parsed.pathname.match(/\/video\/video\/embed\/videohash\/([a-zA-Z0-9]+)/);

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

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<OptionItem[]>([]);
  const [provinces, setProvinces] = useState<OptionItem[]>([]);

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
    const loadedCourses = localStorage.getItem('courses');
    const loadedGrades = localStorage.getItem('grades');
    const loadedProvinces = localStorage.getItem('provinces');

    if (loadedCourses) setCourses(JSON.parse(loadedCourses));
    if (loadedGrades) setGrades(JSON.parse(loadedGrades));
    if (loadedProvinces) setProvinces(JSON.parse(loadedProvinces));
  }, []);

  const saveToLocalStorage = (updatedCourses: Course[]) => {
    setCourses(updatedCourses);
    localStorage.setItem('courses', JSON.stringify(updatedCourses));
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

  const handleToggleGrade = (gradeId: string) => {
    setSelectedGrades((prev) =>
      prev.includes(gradeId)
        ? prev.filter((id) => id !== gradeId)
        : [...prev, gradeId]
    );
  };

  const handleToggleProvince = (provinceId: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(provinceId)
        ? prev.filter((id) => id !== provinceId)
        : [...prev, provinceId]
    );
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();

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
    };

    saveToLocalStorage([newCourse, ...courses]);
    resetCourseForm();
  };

  const handleDeleteCourse = (courseId: string) => {
    if (!confirm('آیا از حذف این دوره اطمینان دارید؟')) return;

    const updated = courses.filter((course) => course.id !== courseId);
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

    const updated = courses.map((course) => {
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

    const updated = courses.map((course) => {
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

    const updated = courses.map((course) => {
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

    const updated = courses.map((course) => {
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

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>مدیریت دوره‌های آموزشی پیشرفته</h1>
          <p>تعریف دوره چندپایه‌ای و چنداستانی، بارگذاری محتواها با قابلیت پیش‌نمایش آنلاین</p>
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
                placeholder="مثال: فیزیک جامع"
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
                placeholder="مثال: فیزیک کنکور"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>پایه‌های تحصیلی مجاز:</label>
              <div className={styles.selectionBox}>
                {grades.map((grade) => (
                  <label key={grade.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={selectedGrades.includes(grade.id)}
                      onChange={() => handleToggleGrade(grade.id)}
                    />
                    <span>{grade.name}</span>
                  </label>
                ))}

                {grades.length === 0 && (
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    پایه‌ای تعریف نشده است.
                  </span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>استان‌های مجاز (خالی یعنی همه استان‌ها):</label>
              <div className={styles.selectionBox}>
                {provinces.map((province) => (
                  <label key={province.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={selectedProvinces.includes(province.id)}
                      onChange={() => handleToggleProvince(province.id)}
                    />
                    <span>{province.name}</span>
                  </label>
                ))}

                {provinces.length === 0 && (
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    استانی تعریف نشده است.
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
            <button type="submit" className={styles.saveBtn}>
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

      <div className={styles.coursesGrid}>
        {courses.map((course) => {
          const matchedGrades = grades
            .filter((grade) => course.gradeIds.includes(grade.id))
            .map((grade) => grade.name);

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
                    🎓 پایه‌ها: {matchedGrades.length ? matchedGrades.join('، ') : 'همه'}
                  </span>
                  <span className={styles.badge}>
                    📍 استان‌ها: {course.provinceIds.length === 0 ? 'سراسری' : `${course.provinceIds.length} استان`}
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
                    }}
                  >
                    بستن بخش جلسات
                  </button>
                </div>
              ) : (
                <div className={styles.actionRow}>
                  <button
                    className={`${styles.actionBtn} ${styles.btnManage}`}
                    onClick={() => setActiveCourseId(course.id)}
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
        })}
      </div>
    </div>
  );
}
