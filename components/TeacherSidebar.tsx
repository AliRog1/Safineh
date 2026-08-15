'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from '@/app/teacher/teacher-layout.module.css';
import { useTheme } from '@/components/ThemeProvider';

// --- Interfaces ---
interface UserPermissions {
  viewProvinceStudents: boolean;
  myCourses: boolean;
  questionBank: boolean;
  examManagement: boolean;
  tickets: boolean;
  posts: boolean;
}

interface UserData {
  id?: string;
  name?: string;
  role?: 'superadmin' | 'admin' | 'teacher' | 'student';
  permissions?: UserPermissions | null;
}

const Icons = {
  Dashboard: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Users: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Classes: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Grades: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  Exam: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  QuestionBank: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Tickets: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Posts: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="M16 8h2m-2 4h2m-10-4h4m-4 4h4m-4 4h8" />
    </svg>
  ),
  Profile: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Logout: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Sun: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  Moon: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  ),
};

const defaultPermissions: UserPermissions = {
  viewProvinceStudents: false,
  myCourses: false,
  questionBank: false,
  examManagement: false,
  tickets: false,
  posts: false,
};

// لیست کامل منوها به همراه دسترسی پیش‌نیاز (permissionKey)
const menuItems = [
  { name: 'داشبورد معلم', path: '/teacher', Icon: Icons.Dashboard },
  { name: 'پروفایل من', path: '/teacher/profile', Icon: Icons.Profile },
  { name: 'دانش‌آموزان استان', path: '/teacher/students', Icon: Icons.Users, permissionKey: 'viewProvinceStudents' as keyof UserPermissions },
  { name: 'دوره های من', path: '/teacher/courses', Icon: Icons.Classes, permissionKey: 'myCourses' as keyof UserPermissions },
  { name: 'بانک سوالات', path: '/teacher/questions', Icon: Icons.QuestionBank, permissionKey: 'questionBank' as keyof UserPermissions },
  { name: 'مدیریت آزمون‌ها', path: '/teacher/exams', Icon: Icons.Exam, permissionKey: 'examManagement' as keyof UserPermissions },
  { name: 'پاسخ به تیکت‌ها', path: '/teacher/tickets', Icon: Icons.Tickets, permissionKey: 'tickets' as keyof UserPermissions },
  { name: 'اخبار و مقالات', path: '/teacher/posts', Icon: Icons.Posts, permissionKey: 'posts' as keyof UserPermissions },
];

export default function TeacherSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      const usersRaw = localStorage.getItem('users');
      if (storedUser) {
        const parsedUser: UserData = JSON.parse(storedUser);
        
        // همگام‌سازی کاربر با آرایه کاربران جهت دریافت آخرین دسترسی‌های به‌روزشده
        if (usersRaw && parsedUser.id) {
          const allUsers: UserData[] = JSON.parse(usersRaw);
          const activeUser = allUsers.find(u => u.id === parsedUser.id);
          setUser(activeUser || parsedUser);
        } else {
          setUser(parsedUser);
        }
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage', error);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  // استخراج مجوزهای کاربر
  const userRole = user?.role;
  const userPermissions: UserPermissions = userRole === 'superadmin'
    ? { viewProvinceStudents: true, myCourses: true, questionBank: true, examManagement: true, tickets: true, posts: true }
    : { ...defaultPermissions, ...(user?.permissions || {}) };

  // فیلتر کردن منوها بر اساس نقش و دسترسی‌ها
  const visibleMenuItems = menuItems.filter(item => {
    if (!item.permissionKey) return true; // منوهای عمومی
    return !!userPermissions[item.permissionKey];
  });

  return (
    <aside className={styles.sidebar}>
      <div>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoBadge}>
            <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'T'}</span>
          </div>
          <div className={styles.headerInfo}>
            <span className={styles.brandTitle}>پنل دبیر | {user?.name || 'همکار آموزشی'}</span>
            <span className={styles.brandSub}>خوش آمدید</span>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {visibleMenuItems.map(({ name, path, Icon }) => {
            const isActive = pathname === path;

            return (
              <Link
                key={path}
                href={path}
                className={`${styles.sideBtn} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.iconWrapper}>
                  <Icon />
                </span>
                <span className={styles.btnLabel}>{name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={styles.sidebarFooter}>
        <button
          className={styles.themeToggleBtn}
          onClick={toggleTheme}
          type="button"
        >
          <span className={styles.iconWrapper}>
            {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
          </span>
          <span className={styles.btnLabel}>{theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}</span>
        </button>

        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          type="button"
        >
          <span className={styles.iconWrapper}>
            <Icons.Logout />
          </span>
          <span className={styles.btnLabel}>خروج از حساب</span>
        </button>
      </div>
    </aside>
  );
}
