'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styles from './students.module.css';

interface User {
  id: string;
  name: string;
  phone: string;
  nationalId?: string;
  email?: string;
  province?: string[];
  grade?: string[];
  role?: string;
  username?: string;
  password?: string;
  isActive?: boolean;
  status?: 'active' | 'inactive';
  createdAt?: string;
  createdBy?: string;
}

type EditFormState = {
  name: string;
  phone: string;
  nationalId: string;
  username: string;
  password: string;
  province: string[];
  grade: string;
};

function normalizeText(value?: any): string {
  if (!value) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');
}

// تبدیل مقادیر ذخیره شده (رشته یا آرایه) به آرایه‌ای از رشته‌های تمیز شده
function parseAndNormalizeValues(value: any): string[] {
  if (!value) return [];
  let rawList: string[] = [];

  if (Array.isArray(value)) {
    rawList = value.map((v) => String(v));
  } else {
    // جدا کردن بر اساس کاما یا خط تیره در صورت وجود
    rawList = String(value).split(/[،,\-]/);
  }

  return rawList
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toDisplayString(value: any): string {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export default function IndependentStudentsPage() {
  const [currentTeacherId, setCurrentTeacherId] = useState<string>('');
  const [teacherProvinces, setTeacherProvinces] = useState<string[]>([]);
  const [teacherGrades, setTeacherGrades] = useState<string[]>([]);
  const [rawTeacherData, setRawTeacherData] = useState<{ province: string; grade: string }>({
    province: '',
    grade: '',
  });

  const [students, setStudents] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    phone: '',
    nationalId: '',
    username: '',
    password: '',
    province: [],
    grade: '',
  });

  // فیلتر کردن استان‌ها فقط و فقط بر اساس دسترسی مستقیم معلم
  const selectableProvinces = useMemo(() => {
    return teacherProvinces;
  }, [teacherProvinces]);

  // فقط و فقط همان پایه‌هایی که برای این معلم ثبت شده است
  const selectableGrades = useMemo(() => {
    return teacherGrades;
  }, [teacherGrades]);

  const loadStudentsData = useCallback(() => {
    try {
      const currentUserRaw = localStorage.getItem('currentUser');
      const usersRaw = localStorage.getItem('users');

      const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
      const allUsers: User[] = usersRaw ? JSON.parse(usersRaw) : [];

      if (!currentUser) {
        setStudents([]);
        return;
      }

      setCurrentTeacherId(currentUser.id || '');

      // خواندن آخرین اطلاعات معلم از بین کاربران سیستم
      const activeTeacher = allUsers.find((u) => u.id === currentUser.id) || currentUser;

      const teacherProvince = toDisplayString(activeTeacher.province || '');
      const teacherGrade = toDisplayString(activeTeacher.grade || '');

      setRawTeacherData({
        province: teacherProvince,
        grade: teacherGrade,
      });

      const parsedTeacherProvinces = parseAndNormalizeValues(activeTeacher.province);
      const parsedTeacherGrades = parseAndNormalizeValues(activeTeacher.grade);

      setTeacherProvinces(parsedTeacherProvinces);
      setTeacherGrades(parsedTeacherGrades);

      const normTeacherProvinces = parsedTeacherProvinces.map((p) => normalizeText(p));
      const normTeacherGrades = parsedTeacherGrades.map((g) => normalizeText(g));

      // فیلتر دانش‌آموزان بر اساس اشتراک استان و پایه معلم
      const matchedStudents = allUsers.filter((user) => {
        const isStudent =
          ['student', 'user', 'learner', 'pupil'].includes(normalizeText(user.role)) || !user.role;

        if (!isStudent) return false;

        // دانش‌آموزانی که خود معلم ساخته باشد همیشه نمایش داده می‌شوند
        if (user.createdBy === activeTeacher.id) return true;

        const studentProvinces = parseAndNormalizeValues(user.province).map((p) => normalizeText(p));
        const studentGrades = parseAndNormalizeValues(user.grade).map((g) => normalizeText(g));

        const hasProvinceOverlap =
          normTeacherProvinces.length === 0 ||
          normTeacherProvinces.includes('سراسری') ||
          normTeacherProvinces.includes('all') ||
          studentProvinces.some((p) => normTeacherProvinces.includes(p));

        const hasGradeOverlap =
          normTeacherGrades.length === 0 ||
          normTeacherGrades.includes('همه') ||
          normTeacherGrades.includes('all') ||
          studentGrades.some((g) => normTeacherGrades.includes(g));

        return hasProvinceOverlap && hasGradeOverlap;
      });

      setStudents(matchedStudents);
    } catch (error) {
      console.error('خطا در بارگذاری اطلاعات:', error);
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // لود اولیه و تنظیم Event Listener برای هماهنگی تغییرات در تب‌های دیگر یا بخش‌های دیگر سیستم
  useEffect(() => {
    loadStudentsData();

    const handleStorageChange = () => {
      loadStudentsData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadStudentsData]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = normalizeText(searchQuery);
      if (!q) return true;

      return (
        normalizeText(s.name).includes(q) ||
        (s.phone || '').includes(searchQuery.trim()) ||
        normalizeText(s.username).includes(q)
      );
    });
  }, [students, searchQuery]);

  const resetForm = useCallback((overrides?: Partial<EditFormState>) => {
    const defaultProvinces = selectableProvinces.length > 0 ? [selectableProvinces[0]] : [];
    const defaultGrade = selectableGrades.length > 0 ? selectableGrades[0] : '';

    setEditForm({
      name: '',
      phone: '',
      nationalId: '',
      username: '',
      password: '',
      province: defaultProvinces,
      grade: defaultGrade,
      ...overrides,
    });
  }, [selectableProvinces, selectableGrades]);

  const handleOpenDetails = (student: User) => {
    setSelectedStudent(student);
    setIsCreateMode(false);
    setIsEditMode(false);

    const sProvinces = parseAndNormalizeValues(student.province);
    const sGrades = parseAndNormalizeValues(student.grade);

    resetForm({
      name: student.name || '',
      phone: student.phone || '',
      nationalId: student.nationalId || '',
      username: student.username || '',
      password: student.password || '',
      province: sProvinces.length > 0 ? sProvinces : (selectableProvinces[0] ? [selectableProvinces[0]] : []),
      grade: sGrades[0] || (selectableGrades[0] || ''),
    });
  };

  const handleOpenCreate = () => {
    const defaultProvinces = selectableProvinces;
    const defaultGrade = selectableGrades[0] || '';

    const newStudent: User = {
      id: '',
      name: '',
      phone: '',
      nationalId: '',
      username: '',
      password: '',
      province: defaultProvinces,
      grade: defaultGrade ? [defaultGrade] : [],
      role: 'student',
      isActive: true,
      status: 'active',
    };

    setSelectedStudent(newStudent);
    setIsCreateMode(true);
    setIsEditMode(true);

    resetForm({
      province: defaultProvinces,
      grade: defaultGrade,
    });
  };

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const usersRaw = localStorage.getItem('users');
      const allUsers: User[] = usersRaw ? JSON.parse(usersRaw) : [];

      const sanitizedUsername = editForm.username.trim().toLowerCase();

      // اعتبارسنجی‌های مربوط به فیلدهای الزامی و فرمت نام کاربری
      if (!editForm.name.trim()) {
        alert('نام و نام خانوادگی الزامی است.');
        return;
      }

      if (!sanitizedUsername) {
        alert('نام کاربری الزامی است.');
        return;
      }

      if (/\s/.test(sanitizedUsername)) {
        alert('نام کاربری نباید شامل فاصله (Space) باشد.');
        return;
      }

      const isDuplicate = allUsers.some(
        (u) =>
          u.username?.toLowerCase() === sanitizedUsername &&
          (!selectedStudent || u.id !== selectedStudent.id)
      );

      if (isDuplicate) {
        alert('این نام کاربری قبلاً ثبت شده است.');
        return;
      }

      const finalProvinces = editForm.province;
      const finalGrades = editForm.grade ? [editForm.grade] : [];

      if (isCreateMode) {
        const newUser: User = {
          id: Date.now().toString(),
          name: editForm.name.trim(),
          username: sanitizedUsername,
          password: editForm.password.trim(),
          phone: editForm.phone.trim(),
          nationalId: editForm.nationalId.trim(),
          email: editForm.phone.trim()
            ? `${editForm.phone.trim()}@phone.com`
            : `${sanitizedUsername}@system.com`,
          role: 'student',
          isActive: true,
          status: 'active',
          province: finalProvinces,
          grade: finalGrades,
          createdAt: new Date().toLocaleDateString('fa-IR'),
          createdBy: currentTeacherId,
        };

        allUsers.unshift(newUser);
        localStorage.setItem('users', JSON.stringify(allUsers));
        window.dispatchEvent(new Event('storage'));
        alert('دانش‌آموز با موفقیت ایجاد شد.');
      } else if (selectedStudent) {
        const updatedUsers = allUsers.map((user) => {
          if (user.id === selectedStudent.id) {
            return {
              ...user,
              name: editForm.name.trim(),
              username: sanitizedUsername,
              password: editForm.password.trim(),
              phone: editForm.phone.trim(),
              nationalId: editForm.nationalId.trim(),
              province: finalProvinces,
              grade: finalGrades,
            };
          }
          return user;
        });

        localStorage.setItem('users', JSON.stringify(updatedUsers));
        window.dispatchEvent(new Event('storage'));
        alert('تغییرات با موفقیت ثبت شد.');
      }

      setSelectedStudent(null);
      setIsEditMode(false);
      setIsCreateMode(false);
      loadStudentsData();
    } catch (err) {
      console.error('خطا در ذخیره:', err);
    }
  };

  const handleToggleStatus = (student: User) => {
    const isCurrentlyActive = student.status !== 'inactive' && student.isActive !== false;
    const nextStatus = !isCurrentlyActive;

    if (!confirm(`آیا از تغییر وضعیت این دانش‌آموز مطمئن هستید؟`)) return;

    try {
      const usersRaw = localStorage.getItem('users');
      if (!usersRaw) return;

      const allUsers: User[] = JSON.parse(usersRaw);
      const updatedUsers = allUsers.map((user) => {
        if (user.id === student.id) {
          return {
            ...user,
            isActive: nextStatus,
            status: nextStatus ? ('active' as const) : ('inactive' as const),
          };
        }
        return user;
      });

      localStorage.setItem('users', JSON.stringify(updatedUsers));
      window.dispatchEvent(new Event('storage'));
      loadStudentsData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleProvinceSelection = (prov: string) => {
    setEditForm((prev) => {
      const isAlreadySelected = prev.province.includes(prov);
      const updatedProvinces = isAlreadySelected
        ? prev.province.filter((p) => p !== prov)
        : [...prev.province, prov];
      return { ...prev, province: updatedProvinces };
    });
  };

  if (isLoading) {
    return <div className={styles.loadingText}>در حال بارگذاری...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <span className={styles.icon}>🎓</span>
            <div>
              <h1 className={styles.title}>مدیریت دانش‌آموزان همکار</h1>
              <p className={styles.subtitle}>
                نمایش دانش‌آموزان تحت پوشش استان‌های{' '}
                <strong style={{ color: '#10b981' }}>{rawTeacherData.province || 'سراسری'}</strong>{' '}
                و پایه‌های{' '}
                <strong style={{ color: '#3b82f6' }}>{rawTeacherData.grade || 'همه پایه‌ها'}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className={styles.addBtn} onClick={handleOpenCreate}>
              ➕ افزودن دانش‌آموز جدید
            </button>
            <span className={styles.countBadge}>تعداد: {filteredStudents.length} دانش‌آموز</span>
          </div>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="🔍 جستجو بر اساس نام، نام کاربری یا شماره تماس..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredStudents.length > 0 ? (
          <div className={styles.grid}>
            {filteredStudents.map((student) => {
              const studentInitial = student.name ? student.name.trim().charAt(0) : 'S';
              const sProvinces = parseAndNormalizeValues(student.province);
              const sGrades = parseAndNormalizeValues(student.grade);
              const isDeactivated = student.status === 'inactive' || student.isActive === false;

              return (
                <div
                  key={student.id || student.phone}
                  className={`${styles.studentCard} ${isDeactivated ? styles.deactivatedCard : ''}`}
                >
                  {/* بخش هدر کارت شامل آواتار و نام (در یک ردیف طبق تغییرات CSS) */}
                  <div className={styles.cardHeader}>
                    <div className={styles.avatar}>{studentInitial}</div>
                    <div className={styles.info}>
                      <div className={styles.name}>
                        {student.name || 'دانش‌آموز بدون نام'}
                        {isDeactivated && <span className={styles.deactivatedLabel}> (غیرفعال)</span>}
                      </div>
                      <div className={styles.meta}>
                        <span>📱 {student.phone || 'بدون شماره'}</span>
                      </div>
                    </div>
                  </div>

                  {/* بخش تگ‌های پایه و استان */}
                  <div className={styles.tags}>
                    {sGrades.map((g, idx) => (
                      <span key={`g-${idx}`} className={`${styles.tag} ${styles.gradeTag}`}>
                        {g}
                      </span>
                    ))}
                    {sProvinces.map((p, idx) => (
                      <span key={`p-${idx}`} className={styles.tag}>
                        📍 {p}
                      </span>
                    ))}
                  </div>

                  {/* بخش دکمه‌های عملیاتی */}
                  <div className={styles.actionButtons}>
                    <button onClick={() => handleOpenDetails(student)} className={styles.viewBtn}>
                      👁️ جزئیات و ویرایش
                    </button>
                    <button
                      onClick={() => handleToggleStatus(student)}
                      className={isDeactivated ? styles.activateBtn : styles.deactivateBtn}
                    >
                      {isDeactivated ? '✅ فعال‌سازی' : '❌ غیرفعال‌سازی'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📂</span>
            <div className={styles.emptyText}>هیچ موردی یافت نشد!</div>
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>
                {isCreateMode
                  ? '➕ ایجاد دانش‌آموز جدید'
                  : isEditMode
                  ? '✏️ ویرایش مشخصات دانش‌آموز'
                  : '👁️ مشخصات کامل دانش‌آموز'}
              </h2>
              <button onClick={() => setSelectedStudent(null)} className={styles.closeModalBtn}>
                ×
              </button>
            </div>

            {!isEditMode && !isCreateMode ? (
              <div className={styles.modalBody}>
                <div className={styles.detailRow}>
                  <strong>نام و نام خانوادگی:</strong> <span>{selectedStudent.name || 'ثبت نشده'}</span>
                </div>
                <div className={styles.detailRow}>
                  <strong>نام کاربری:</strong> <span>{selectedStudent.username || 'ثبت نشده'}</span>
                </div>
                <div className={styles.detailRow}>
                  <strong>رمز عبور:</strong> <span>{selectedStudent.password || 'ثبت نشده'}</span>
                </div>
                <div className={styles.detailRow}>
                  <strong>کد ملی:</strong> <span>{selectedStudent.nationalId || 'ثبت نشده'}</span>
                </div>
                <div className={styles.detailRow}>
                  <strong>شماره موبایل:</strong> <span>{selectedStudent.phone || 'ثبت نشده'}</span>
                </div>
                <div className={styles.detailRow}>
                  <strong>استان‌ها:</strong>{' '}
                  <span>
                    {Array.isArray(selectedStudent.province)
                      ? selectedStudent.province.join(' - ')
                      : selectedStudent.province || 'سراسری'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <strong>پایه‌ها:</strong>{' '}
                  <span>
                    {Array.isArray(selectedStudent.grade)
                      ? selectedStudent.grade.join(' - ')
                      : selectedStudent.grade || 'نامشخص'}
                  </span>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    onClick={() => {
                      setIsEditMode(true);
                      setIsCreateMode(false);
                    }}
                    className={styles.editBtn}
                  >
                    ✏️ ویرایش اطلاعات
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveChanges} className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label>نام و نام خانوادگی *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>نام کاربری *</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>رمز عبور *</label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    required={isCreateMode}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>کد ملی:</label>
                  <input
                    type="text"
                    value={editForm.nationalId}
                    onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>شماره تماس:</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label style={{ marginBottom: '8px', display: 'block' }}>استان‌ها:</label>
                  <div className={styles.chipsContainer}>
                    {selectableProvinces.map((prov) => {
                      const isSelected = editForm.province.includes(prov);
                      return (
                        <button
                          key={prov}
                          type="button"
                          className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
                          onClick={() => toggleProvinceSelection(prov)}
                        >
                          {prov} {isSelected && '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>پایه تحصیلی:</label>
                  <select
                    className={styles.selectDropdown}
                    value={editForm.grade}
                    onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                  >
                    <option value="">-- انتخاب پایه تحصیلی --</option>
                    {selectableGrades.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.modalFooter}>
                  <button type="submit" className={styles.saveBtn}>
                    💾 {isCreateMode ? 'ایجاد دانش‌آموز' : 'ذخیره تغییرات'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMode(false);
                      setIsCreateMode(false);
                    }}
                    className={styles.cancelBtn}
                  >
                    انصراف
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
