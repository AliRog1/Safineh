'use client';

import React, { useState, useEffect } from 'react';
import styles from './profile.module.css';

// تعریف تایپ کامل کاربر به همراه نام کاربری جدید
interface UserProfile {
  name: string;
  username: string; // فیلد نام کاربری جدید
  email: string;
  phone: string;
  role: string;
  provinces: string[];
  password?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: '',
    provinces: [],
    password: '',
  });

  const [isLoading, setIsLoading] = useState(true);

  // دریافت اطلاعات از LocalStorage با رعایت اصول SSR در Next.js
  useEffect(() => {
    const loadUserData = () => {
      try {
        const data = localStorage.getItem('currentUser');
        if (data) {
          const user = JSON.parse(data);
          
          // ساخت یک نام کاربری پیش‌فرض در صورت عدم وجود (مثلاً از روی ایمیل)
          const fallbackUsername = user.email ? user.email.split('@')[0] : 'user_' + Math.floor(Math.random() * 1000);

          setProfile({
            name: user.name || '',
            username: user.username || fallbackUsername,
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'کاربر سیستم',
            provinces: Array.isArray(user.provinces) ? user.provinces : [],
            password: user.password || '',
          });
        }
      } catch (error) {
        console.error("خطا در بارگذاری اطلاعات:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ۱. دریافت اطلاعات فعلی برای عدم تخریب فیلدهای دیگر
    const currentDataRaw = localStorage.getItem('currentUser');
    const currentData = currentDataRaw ? JSON.parse(currentDataRaw) : {};

    // ۲. به‌روزرسانی فیلدهای مجاز (نام، نام کاربری، تلفن و پسورد)
    const updatedUser = {
      ...currentData,
      name: profile.name,
      username: profile.username,
      phone: profile.phone,
      password: profile.password,
    };

    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    
    // ۳. پیام موفقیت
    alert('پروفایل و نام کاربری با موفقیت به‌روزرسانی شد ✨');
    
    // ۴. رفرش برای اعمال تغییرات در سراسر ادمین پنل
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingText}>در حال فراخوانی اطلاعات پروفایل...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        {/* بنر بالای کارت */}
        <div className={styles.headerBanner} />
        
        {/* بخش آواتار و اطلاعات اصلی */}
        <div className={styles.avatarWrapper}>
          <div className={styles.avatarSquare}>
            {profile.name ? profile.name.charAt(0) : 'A'}
          </div>
          <div className={styles.infoSection}>
            <h1 className={styles.userName}>{profile.name || 'نام کاربری'}</h1>
            {profile.username && (
              <span className={styles.userSubName} style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px', direction: 'ltr' }}>
                @{profile.username}
              </span>
            )}
            <span className={styles.userBadge}>
              {profile.role === 'admin' ? 'مدیریت کل سیستم' : profile.role}
            </span>
          </div>
        </div>

        <form className={styles.formGrid} onSubmit={handleUpdate}>
          {/* فیلد نام و نام خانوادگی - قابل ویرایش */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>نام و نام خانوادگی</label>
            <input 
              className={styles.input} 
              value={profile.name} 
              onChange={(e) => setProfile({...profile, name: e.target.value})}
              required
              placeholder="نام خود را وارد کنید"
            />
          </div>

          {/* فیلد تغییر نام کاربری - قابل ویرایش */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>نام کاربری (Username)</label>
            <input 
              className={styles.input} 
              value={profile.username} 
              onChange={(e) => setProfile({...profile, username: e.target.value.replace(/\s+/g, '')})} // جلوگیری از وارد کردن فاصله
              required
              placeholder="مثال: amir_admin"
              style={{ direction: 'ltr', textAlign: 'right' }}
            />
          </div>

          {/* فیلد شماره تماس - قابل ویرایش */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>شماره تماس</label>
            <input 
              className={styles.input} 
              value={profile.phone} 
              onChange={(e) => setProfile({...profile, phone: e.target.value})}
              placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
            />
          </div>

          {/* فیلد رمز عبور جدید - قابل ویرایش */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>رمز عبور جدید</label>
            <input 
              className={styles.input} 
              type="password"
              value={profile.password} 
              onChange={(e) => setProfile({...profile, password: e.target.value})}
              placeholder="••••••••"
            />
          </div>

          {/* فیلد ایمیل - غیرقابل ویرایش */}
          <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
            <label className={styles.label}>آدرس ایمیل (غیر قابل تغییر)</label>
            <input 
              className={`${styles.input} ${styles.readOnlyInput}`} 
              value={profile.email} 
              readOnly 
              title="ایمیل توسط مدیریت تنظیم شده و قابل تغییر نیست"
            />
          </div>

          {/* بخش نمایش استان‌ها - غیرقابل ویرایش */}
          <div className={styles.provinceBox}>
            <div className={styles.provinceIcon}>📍</div>
            <div className={styles.provinceText}>
              استان‌های تحت مدیریت شما: 
              <span style={{ marginRight: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>
                {profile.provinces.length > 0 ? profile.provinces.join('، ') : 'دسترسی سراسری'}
              </span>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn}>
            ذخیره و به‌روزرسانی نهایی
          </button>
        </form>
      </div>
    </div>
  );
}
