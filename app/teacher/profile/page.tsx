'use client';

import React, { useState, useEffect } from 'react';
import styles from './profile.module.css';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  province?: any; // تغییر به any برای مدیریت ورودی‌های رشته یا آرایه
  grade?: any;
  password?: string;
}

// تابع هوشمند برای تفکیک مقادیر (استان‌ها یا پایه‌ها) و جلوگیری از خطا
function parseMultipleValues(value?: any): string[] {
  if (!value) return [];
  
  // اگر مقدار از قبل آرایه است
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(v => v.length > 0);
  }

  // اگر مقدار رشته است، آن را با جداکننده‌ها تفکیک کن
  return String(value)
    .split(/[,,،\-]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    username: '',
    email: '',
    phone: '',
    role: '',
    province: '',
    grade: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = () => {
      try {
        const currentUserRaw = localStorage.getItem('currentUser');
        if (currentUserRaw) {
          const parsedCurrentUser = JSON.parse(currentUserRaw);
          
          const usersRaw = localStorage.getItem('users');
          const allUsers: UserProfile[] = usersRaw ? JSON.parse(usersRaw) : [];
          
          const matchedUser = allUsers.find((u) => u.id === parsedCurrentUser.id);
          const activeUser = matchedUser || parsedCurrentUser;

          const fallbackUsername = activeUser.email 
            ? activeUser.email.split('@')[0] 
            : 'teacher_' + Math.floor(Math.random() * 1000);

          setProfile({
            id: activeUser.id || '',
            name: activeUser.name || '',
            username: activeUser.username || fallbackUsername,
            email: activeUser.email || '',
            phone: activeUser.phone || '',
            role: activeUser.role || 'teacher',
            province: activeUser.province || '',
            grade: activeUser.grade || '',
            password: activeUser.password || '',
          });
        }
      } catch (error) {
        console.error("خطا در بارگذاری اطلاعات پروفایل معلم:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentUserRaw = localStorage.getItem('currentUser');
      const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : {};

      const updatedUser = {
        ...currentUser,
        name: profile.name,
        username: profile.username,
        phone: profile.phone,
        password: profile.password,
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      const usersRaw = localStorage.getItem('users');
      if (usersRaw) {
        const allUsers: UserProfile[] = JSON.parse(usersRaw);
        const updatedUsersList = allUsers.map((u) => {
          if (u.id === profile.id) {
            return {
              ...u,
              name: profile.name,
              username: profile.username,
              phone: profile.phone,
              password: profile.password,
            };
          }
          return u;
        });
        localStorage.setItem('users', JSON.stringify(updatedUsersList));
      }
      
      alert('اطلاعات پروفایل با موفقیت به‌روزرسانی شد ✨');
      window.location.reload();
    } catch (error) {
      console.error("خطا در به‌روزرسانی اطلاعات پروفایل:", error);
      alert('خطایی در ذخیره‌سازی رخ داد.');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingText}>در حال بارگذاری اطلاعات پروفایل...</div>
      </div>
    );
  }

  const avatarInitial = profile.name 
    ? profile.name.trim().charAt(0).toUpperCase() 
    : (profile.username ? profile.username.trim().charAt(0).toUpperCase() : 'T');

  // آماده‌سازی داده‌ها برای نمایش تفکیک شده
  const provinces = parseMultipleValues(profile.province);
  const grades = parseMultipleValues(profile.grade);

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.headerBanner} />
        
        <div className={styles.avatarWrapper}>
          <div className={styles.avatarSquare}>{avatarInitial}</div>
          <div className={styles.infoSection}>
            <h1 className={styles.userName}>{profile.name || 'همکار آموزشی'}</h1>
            {profile.username && <span className={styles.userSubName}>@{profile.username}</span>}
            <div className={styles.userBadge}>
              <span>🎓</span>
              <span>پنل همکار آموزشی</span>
            </div>
          </div>
        </div>

        <form className={styles.formGrid} onSubmit={handleUpdate}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>نام و نام خانوادگی</label>
            <input 
              className={styles.input} 
              value={profile.name} 
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>نام کاربری (Username)</label>
            <input 
              className={styles.input} 
              value={profile.username} 
              onChange={(e) => setProfile({ ...profile, username: e.target.value.replace(/\s+/g, '') })}
              required
              style={{ direction: 'ltr', textAlign: 'right' }}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>شماره تماس</label>
            <input 
              className={styles.input} 
              value={profile.phone} 
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>رمز عبور جدید</label>
            <input 
              className={styles.input} 
              type="password"
              value={profile.password || ''} 
              onChange={(e) => setProfile({ ...profile, password: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
            <label className={styles.label}>آدرس ایمیل (غیر قابل تغییر)</label>
            <input className={`${styles.input} ${styles.readOnlyInput}`} value={profile.email} readOnly />
          </div>

          {/* بخش نمایش تفکیک شده استان‌ها و پایه‌ها */}
          <div className={styles.badgeSection}>
            <div className={styles.badgeGroup}>
              <span className={styles.badgeLabel}>📍 استان‌های تحت پوشش:</span>
              <div className={styles.badgeList}>
                {provinces.length > 0 ? (
                  provinces.map((p, i) => <span key={i} className={styles.tag}>{p}</span>)
                ) : (
                  <span className={styles.emptyTag}>سراسری</span>
                )}
              </div>
            </div>

            <div className={styles.badgeGroup}>
              <span className={styles.badgeLabel}>📚 پایه‌های هدف:</span>
              <div className={styles.badgeList}>
                {grades.length > 0 ? (
                  grades.map((g, i) => <span key={i} className={`${styles.tag} ${styles.gradeTag}`}>{g}</span>)
                ) : (
                  <span className={styles.emptyTag}>همه پایه‌ها</span>
                )}
              </div>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn}>ذخیره تغییرات پروفایل</button>
        </form>
      </div>
    </div>
  );
}
