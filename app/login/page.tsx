'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();

  // تعریف استیت‌ها برای فیلدهای فرم
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // بررسی وضعیت لاگین قبلی کاربر در لود اولیه صفحه
  useEffect(() => {
    const currentUserRaw = localStorage.getItem('currentUser');
    if (currentUserRaw) {
      try {
        const currentUser = JSON.parse(currentUserRaw);
        const redirectMap: Record<string, string> = {
          admin: '/admin',
          teacher: '/teacher',
          student: '/student',
        };
        if (currentUser.role && redirectMap[currentUser.role.toLowerCase()]) {
          router.push(redirectMap[currentUser.role.toLowerCase()]);
        }
      } catch (e) {
        console.error('Error parsing current user', e);
      }
    }
  }, [router]);

  // دریافت کاربران از دیتابیس یکپارچه لوکال استوریج ('users')
  const getUsersList = (): any[] => {
    if (typeof window !== 'undefined') {
      try {
        const usersRaw = localStorage.getItem('users');
        return usersRaw ? JSON.parse(usersRaw) : [];
      } catch (e) {
        console.error('Error parsing users list', e);
        return [];
      }
    }
    return [];
  };

  // تابع کمکی: نقش مربوط به هر کاربر رو تشخیص بده
  // دیگه از انتخاب کاربر استفاده نمی‌کنیم، فقط از username استفاده میشه
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // رمز عبور پیش‌فرض و ثابت ادمین ارشد
    const ADMIN_MASTER_PASSWORD = '1234';

    // مسیرهای ریدایرکت بر اساس نقش
    const redirectMap: Record<string, string> = {
      admin: '/admin',
      teacher: '/teacher',
      student: '/student',
    };

    // اگر یوزرنیم admin باشه، نقشش به صورت خودکار admin در نظر گرفته میشه
    if (cleanUsername === 'admin' && cleanPassword === ADMIN_MASTER_PASSWORD) {
      const adminUser = {
        id: 'master-admin',
        username: 'admin',
        name: 'مدیر کل سیستم',
        role: 'admin',
        status: 'active',
      };
      localStorage.setItem('currentUser', JSON.stringify(adminUser));
      // اضافه کردن ادمین ارشد به لیست کل کاربران اگر وجود نداشته باشد
      const currentUsers = getUsersList();
      if (!currentUsers.some((u) => u.username === 'admin')) {
        currentUsers.push(adminUser);
        localStorage.setItem('users', JSON.stringify(currentUsers));
      }
      router.push('/admin');
      return;
    }

    // واکشی لیست کاربران از کلید یکپارچه 'users'
    const users = getUsersList();

    // پیدا کردن کاربر فقط با یوزرنیم و پسورد (بدون نقش)
    const user = users.find(
      (u: any) =>
        u.username &&
        u.username.trim().toLowerCase() === cleanUsername &&
        u.password &&
        u.password.trim() === cleanPassword
    );

    if (!user) {
      alert('❌ نام کاربری یا رمز عبور اشتباه است.');
      return;
    }

    // بررسی فعال بودن حساب کاربری
    if (user.status === 'inactive') {
      alert('❌ حساب کاربری شما غیرفعال شده است. لطفا با مدیریت تماس بگیرید.');
      return;
    }

    // تشخیص خودکار نقش از روی شیء کاربر
    const userRole = (user.role || '').toLowerCase();

    // اگر نقشی برای کاربر مشخص نشده بود، خطا بده
    if (!redirectMap[userRole]) {
      alert('❌ برای این کاربر نقش معتبری تعریف نشده است.');
      return;
    }

    // ذخیره در کاربر جاری و ریدایرکت خودکار بر اساس نقش
    localStorage.setItem('currentUser', JSON.stringify(user));
    router.push(redirectMap[userRole]);
  };

  return (
    <div className={styles.bodyWrapper} dir="rtl">
      <section className={styles.loginBox}>
        <h1 className={styles.title}>ورود به دنیای آموزشی سفینه</h1>
        <p className={styles.loginSubtitle}>امن‌ترین درگاه ورود به دنیای آموزش</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>نام کاربری</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="نام کاربری خود را وارد کنید"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>رمز عبور</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
                required
              />
              <span
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                style={{ color: showPassword ? '#00e5ff' : '#94a3b8' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
            </div>
          </div>

          {/* بخش انتخاب نقش حذف شد ✅ */}

          <button type="submit" className={styles.btnPrimary}>
            ورود به پنل کاربری
          </button>
        </form>
      </section>
    </div>
  );
}