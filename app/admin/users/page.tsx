'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './users.module.css';

interface UserPermissions {
  viewProvinceStudents: boolean;
  myCourses: boolean;
  questionBank: boolean;
  examManagement: boolean;
  tickets: boolean;
  posts: boolean;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'admin' | 'teacher' | 'student' | 'superadmin';
  status: 'active' | 'inactive';
  grade?: string | string[];
  province?: string | string[];
  permissions?: UserPermissions | null;
  createdAt: string;
}

interface Grade {
  id: string;
  name: string;
}

interface Province {
  id: string;
  name: string;
}

const permissionLabels: Record<keyof UserPermissions, string> = {
  viewProvinceStudents: 'مشاهده دانش آموزان استان',
  myCourses: 'دوره های من',
  questionBank: 'بانک سوالات',
  examManagement: 'مدیریت آزمون',
  tickets: 'تیکت',
  posts: 'اخبار و مقالات',
};

const defaultPermissions: UserPermissions = {
  viewProvinceStudents: false,
  myCourses: false,
  questionBank: false,
  examManagement: false,
  tickets: false,
  posts: false,
};

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const [editForm, setEditForm] = useState<{
    name: string;
    username: string;
    password: string;
    phone: string;
    role: 'admin' | 'teacher' | 'student' | 'superadmin';
    status: 'active' | 'inactive';
    grades: string[];
    provinces: string[];
    permissions: UserPermissions;
  }>({
    name: '',
    username: '',
    password: '',
    phone: '',
    role: 'student',
    status: 'active',
    grades: [],
    provinces: [],
    permissions: defaultPermissions,
  });

  useEffect(() => {
    const loadData = () => {
      const storedUsers = localStorage.getItem('users');
      if (storedUsers) {
        try {
          setUsers(JSON.parse(storedUsers));
        } catch {
          setUsers([]);
          localStorage.setItem('users', JSON.stringify([]));
        }
      } else {
        setUsers([]);
        localStorage.setItem('users', JSON.stringify([]));
      }

      const storedGrades = localStorage.getItem('grades');
      if (storedGrades) {
        setGrades(JSON.parse(storedGrades));
      }

      const storedProvinces = localStorage.getItem('provinces');
      if (storedProvinces) {
        setProvinces(JSON.parse(storedProvinces));
      }
    };

    loadData();
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('storage', loadData);
    };
  }, []);

  const saveUsersToStorage = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    window.dispatchEvent(new Event('storage'));
  };

  const toggleUserStatus = (id: string) => {
    const updated = users.map((u) => {
      if (u.id === id) {
        return {
          ...u,
          status: u.status === 'active' ? ('inactive' as const) : ('active' as const),
        };
      }
      return u;
    });

    saveUsersToStorage(updated);
  };

  const normalizePermissions = (
    permissions?: Partial<UserPermissions> | null
  ): UserPermissions => {
    return {
      ...defaultPermissions,
      ...(permissions || {}),
    };
  };

  const handleOpenEdit = (user: User) => {
    setUserToEdit(user);

    let userGrades: string[] = [];
    if (Array.isArray(user.grade)) {
      userGrades = user.grade;
    } else if (user.grade) {
      userGrades = [user.grade];
    }

    let userProvinces: string[] = [];
    if (Array.isArray(user.province)) {
      userProvinces = user.province;
    } else if (user.province) {
      userProvinces = [user.province];
    }

    setEditForm({
      name: user.name || '',
      username: user.username || '',
      password: user.password || '',
      phone: user.phone || user.email?.replace('@phone.com', '') || '',
      role: user.role || 'student',
      status: user.status || 'active',
      grades: userGrades,
      provinces: userProvinces,
      permissions: normalizePermissions(user.permissions),
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    const isScopedRole = editForm.role === 'teacher' || editForm.role === 'admin';
    const isStudent = editForm.role === 'student';
    const isSuperadmin = editForm.role === 'superadmin';

    const finalGrades = isSuperadmin
      ? ['همه پایه‌ها']
      : isScopedRole
        ? editForm.grades
        : isStudent
          ? [editForm.grades[0] || '']
          : [];

    const finalProvinces = isSuperadmin
      ? ['کشوری - تمام استان‌ها']
      : isScopedRole
        ? editForm.provinces
        : [editForm.provinces[0] || ''];

    const updatedUsers = users.map((u) => {
      if (u.id === userToEdit.id) {
        return {
          ...u,
          name: editForm.name,
          username: editForm.username.trim(),
          password: editForm.password || u.password,
          phone: editForm.phone,
          email: editForm.phone ? `${editForm.phone}@phone.com` : u.email,
          role: editForm.role,
          status: editForm.status,
          grade: isStudent ? finalGrades[0] || '' : finalGrades,
          province: isStudent ? finalProvinces[0] || '' : finalProvinces,
          permissions: isScopedRole ? editForm.permissions : null,
        };
      }
      return u;
    });

    saveUsersToStorage(updatedUsers);
    setUserToEdit(null);
  };

  const handleDeleteConfirm = () => {
    if (!userToDelete) return;
    const updated = users.filter((u) => u.id !== userToDelete.id);
    saveUsersToStorage(updated);
    setUserToDelete(null);
  };

  const toggleArrayItem = (list: string[], item: string): string[] => {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    const matchesGrade =
      gradeFilter === 'all' ||
      (Array.isArray(user.grade)
        ? user.grade.includes(gradeFilter)
        : user.grade === gradeFilter);

    const matchesProvince =
      provinceFilter === 'all' ||
      (Array.isArray(user.province)
        ? user.province.includes(provinceFilter)
        : user.province === provinceFilter);

    return matchesSearch && matchesRole && matchesStatus && matchesGrade && matchesProvince;
  });

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const teachersCount = users.filter((u) => u.role === 'teacher').length;
  const studentsCount = users.filter((u) => u.role === 'student').length;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'مدیر محدود', class: styles.roleAdmin };
      case 'teacher':
        return { label: 'همکار آموزشی', class: styles.roleTeacher };
      case 'student':
        return { label: 'دانش‌آموز', class: styles.roleStudent };
      case 'superadmin':
        return { label: 'مدیر کل', class: styles.roleAdmin };
      default:
        return { label: role, class: '' };
    }
  };

  const renderChips = (value?: string | string[], color: string = '#00e5ff') => {
    if (!value) return <span style={{ color: '#64748b' }}>-</span>;
    const items = Array.isArray(value) ? value : [value];
    if (items.length === 0) return <span style={{ color: '#64748b' }}>-</span>;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {items.map((item, idx) => (
          <span
            key={idx}
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${color}`,
              color: color,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    );
  };

  const isScopedRole = editForm.role === 'teacher' || editForm.role === 'admin';
  const showPermissionsPanel = editForm.role === 'teacher' || editForm.role === 'admin';

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>مدیریت کاربران</h1>
          <p>لیست کامل کاربران سیستم، تغییر سطح دسترسی و مدیریت وضعیت حساب‌ها</p>
        </div>
        <Link href="/admin/users/add" className={styles.addBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          افزودن کاربر جدید
        </Link>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{totalUsers}</span>
            <span className={styles.statLabel}>کل کاربران</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{activeCount}</span>
            <span className={styles.statLabel}>کاربران فعال</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{teachersCount}</span>
            <span className={styles.statLabel}>همکاران آموزشی</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{studentsCount}</span>
            <span className={styles.statLabel}>دانش‌آموزان</span>
          </div>
        </div>
      </div>

      <div className={styles.filterBar} style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className={styles.searchInputWrapper} style={{ flex: '1 1 200px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="جستجو بر اساس نام، نام کاربری یا ایمیل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={styles.selectFilter}
        >
          <option value="all">همه نقش‌ها</option>
          <option value="admin">مدیر محدود</option>
          <option value="teacher">همکار آموزشی</option>
          <option value="student">دانش‌آموز</option>
          <option value="superadmin">مدیر کل</option>
        </select>

        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className={styles.selectFilter}
        >
          <option value="all">همه پایه‌ها</option>
          {grades.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          className={styles.selectFilter}
        >
          <option value="all">همه استان‌ها</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.selectFilter}
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
        </select>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableContainer}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>کاربر</th>
                <th>نام کاربری</th>
                <th>نقش</th>
                <th>استان</th>
                <th>پایه تحصیلی</th>
                <th>وضعیت</th>
                <th>تاریخ ثبت‌نام</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const roleObj = getRoleLabel(user.role);
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}>
                            {user.name ? user.name.slice(0, 1) : '?'}
                          </div>
                          <div className={styles.userInfo}>
                            <span className={styles.userName}>{user.name}</span>
                            <span className={styles.userEmail}>{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                          @{user.username}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.roleBadge} ${roleObj.class}`}>
                          {roleObj.label}
                        </span>
                      </td>
                      <td>{renderChips(user.province, '#10b981')}</td>
                      <td>{renderChips(user.grade, '#00e5ff')}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            user.status === 'active' ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          <span className={styles.dot} />
                          {user.status === 'active' ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '12.5px' }}>{user.createdAt}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className={styles.actionBtn}
                            style={{ color: '#00e5ff', borderColor: 'rgba(0, 229, 255, 0.3)' }}
                            title="ویرایش کاربر و دسترسی‌ها"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => toggleUserStatus(user.id)}
                            className={styles.actionBtn}
                            title={user.status === 'active' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                          >
                            {user.status === 'active' ? 'غیرفعال' : 'فعال'}
                          </button>

                          <button
                            onClick={() => setUserToDelete(user)}
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            title="حذف کاربر"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    هیچ کاربری ثبت نشده یا با فیلترهای بالا مطابقت ندارد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {userToEdit && (
        <div style={modalOverlayStyle} onClick={() => setUserToEdit(null)}>
          <div style={editModalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '12px',
              }}
            >
              <h3 style={{ fontSize: '18px', color: '#00e5ff', margin: 0 }}>
                ✏️ ویرایش کاربر: {userToEdit.name}
              </h3>
              <button
                onClick={() => setUserToEdit(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={modalLabelStyle}>نام کامل *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={modalInputStyle}
                    required
                  />
                </div>

                <div>
                  <label style={modalLabelStyle}>نام کاربری *</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    style={modalInputStyle}
                    required
                  />
                </div>

                <div>
                  <label style={modalLabelStyle}>رمز عبور جدید (در صورت نیاز به تغییر)</label>
                  <input
                    type="password"
                    placeholder="رمز جدید..."
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    style={modalInputStyle}
                  />
                </div>

                <div>
                  <label style={modalLabelStyle}>شماره تماس</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={modalInputStyle}
                  />
                </div>

                <div>
                  <label style={modalLabelStyle}>نقش کاربر</label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        role: e.target.value as 'admin' | 'teacher' | 'student' | 'superadmin',
                      })
                    }
                    style={{ ...modalInputStyle, backgroundColor: '#0f172a' }}
                  >
                    <option value="student">🎓 دانش‌آموز</option>
                    <option value="teacher">👨‍🏫 همکار آموزشی</option>
                    <option value="admin">👮 مدیر محدود</option>
                    <option value="superadmin">👑 مدیر کل</option>
                  </select>
                </div>

                <div>
                  <label style={modalLabelStyle}>وضعیت حساب</label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as 'active' | 'inactive',
                      })
                    }
                    style={{ ...modalInputStyle, backgroundColor: '#0f172a' }}
                  >
                    <option value="active">🟢 فعال</option>
                    <option value="inactive">🔴 غیرفعال</option>
                  </select>
                </div>
              </div>

              {editForm.role !== 'superadmin' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <label style={modalLabelStyle}>
                      📚 {isScopedRole ? 'پایه‌های مجاز' : 'پایه تحصیلی'}
                    </label>

                    {isScopedRole ? (
                      <div style={chipContainerStyle}>
                        {grades.map((g) => (
                          <div
                            key={g.id}
                            onClick={() =>
                              setEditForm({
                                ...editForm,
                                grades: toggleArrayItem(editForm.grades, g.name),
                              })
                            }
                            style={{
                              ...chipStyle,
                              border: editForm.grades.includes(g.name)
                                ? '1px solid #00e5ff'
                                : '1px solid rgba(255,255,255,0.1)',
                              background: editForm.grades.includes(g.name)
                                ? 'rgba(0,229,255,0.15)'
                                : 'transparent',
                              color: editForm.grades.includes(g.name) ? '#00e5ff' : '#94a3b8',
                            }}
                          >
                            {g.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <select
                        value={editForm.grades[0] || ''}
                        onChange={(e) => setEditForm({ ...editForm, grades: [e.target.value] })}
                        style={{ ...modalInputStyle, backgroundColor: '#0f172a' }}
                      >
                        <option value="">انتخاب پایه...</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.name}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label style={modalLabelStyle}>
                      📍 {isScopedRole ? 'استان‌های مجاز' : 'استان'}
                    </label>

                    {isScopedRole ? (
                      <div style={chipContainerStyle}>
                        {provinces.map((p) => (
                          <div
                            key={p.id}
                            onClick={() =>
                              setEditForm({
                                ...editForm,
                                provinces: toggleArrayItem(editForm.provinces, p.name),
                              })
                            }
                            style={{
                              ...chipStyle,
                              border: editForm.provinces.includes(p.name)
                                ? '1px solid #10b981'
                                : '1px solid rgba(255,255,255,0.1)',
                              background: editForm.provinces.includes(p.name)
                                ? 'rgba(16,185,129,0.15)'
                                : 'transparent',
                              color: editForm.provinces.includes(p.name) ? '#10b981' : '#94a3b8',
                            }}
                          >
                            {p.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <select
                        value={editForm.provinces[0] || ''}
                        onChange={(e) => setEditForm({ ...editForm, provinces: [e.target.value] })}
                        style={{ ...modalInputStyle, backgroundColor: '#0f172a' }}
                      >
                        <option value="">انتخاب استان...</option>
                        {provinces.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {editForm.role === 'superadmin' && (
                <div
                  style={{
                    marginTop: '8px',
                    marginBottom: '20px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(99,102,241,0.25)',
                    background: 'rgba(99,102,241,0.08)',
                    color: '#c7d2fe',
                    fontSize: '13px',
                    textAlign: 'center',
                  }}
                >
                  مدیر کل به تمام پایه‌ها و تمام استان‌ها دسترسی کامل دارد.
                </div>
              )}

              {showPermissionsPanel && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,229,255,0.2)',
                    background: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <h4 style={{ fontSize: '14px', color: '#00e5ff', textAlign: 'center', marginBottom: '16px' }}>
                    ⚙️ تنظیم سطوح دسترسی
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {(Object.keys(permissionLabels) as Array<keyof UserPermissions>).map((key) => (
                      <div key={key} style={toggleRowStyle}>
                        <span style={{ fontSize: '12.5px', color: '#e2e8f0' }}>
                          {permissionLabels[key]}
                        </span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={!!editForm.permissions[key]}
                            onChange={() =>
                              setEditForm({
                                ...editForm,
                                permissions: {
                                  ...editForm.permissions,
                                  [key]: !editForm.permissions[key],
                                },
                              })
                            }
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setUserToEdit(null)} style={btnCancelModal}>
                  انصراف
                </button>
                <button type="submit" style={btnSaveModal}>
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className={styles.modalOverlay} onClick={() => setUserToDelete(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>حذف کاربر</h3>
            <p>
              آیا از حذف کاربر <strong>«{userToDelete.name}»</strong> اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.confirmBtn} onClick={handleDeleteConfirm}>
                بله، حذف شود
              </button>
              <button className={styles.cancelBtn} onClick={() => setUserToDelete(null)}>
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 38px;
          height: 20px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #334155;
          transition: 0.3s;
          border-radius: 20px;
        }

        .slider:before {
          position: absolute;
          content: '';
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #00e5ff;
        }

        input:checked + .slider:before {
          transform: translateX(18px);
        }
      `}</style>
    </div>
  );
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '16px',
};

const editModalContentStyle: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px',
  padding: '24px',
  width: '100%',
  maxWidth: '750px',
  maxHeight: '90vh',
  overflowY: 'auto',
  color: '#fff',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
};

const modalLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: '#94a3b8',
  marginBottom: '4px',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  background: 'rgba(0, 0, 0, 0.3)',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
};

const chipContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  padding: '8px',
  background: 'rgba(0,0,0,0.2)',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)',
  minHeight: '40px',
};

const chipStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: '15px',
  fontSize: '11px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '8px',
};

const btnSaveModal: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: '8px',
  border: 'none',
  background: 'linear-gradient(135deg, #00e5ff 0%, #3b82f6 100%)',
  color: '#fff',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '13px',
};

const btnCancelModal: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '13px',
};
