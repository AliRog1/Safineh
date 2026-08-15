'use client';

import React, { useEffect, useState } from 'react';
import styles from './profile.module.css';

interface UserProfile {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username: string;
  password?: string;
  city?: any; 
  province?: any; // در مدل معلم‌ها این فیلد شامل لیست استان‌هاست
  grade: any;
  role: string;
  profileImage?: string;
}

// استفاده از همان منطق کد معلم برای تفکیک مقادیر جهت مقایسه صحیح
function parseMultipleValues(value?: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim().toLowerCase());
  }
  return String(value)
    .split(/[,,،\-]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState({
    id: '',
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    city: '',
    grade: '',
    role: 'student',
    profileImage: '',
    supporter: 'در حال جستجو...',
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      try {
        const currentUserRaw = localStorage.getItem('currentUser');
        if (!currentUserRaw) return;

        const parsedCurrentUser = JSON.parse(currentUserRaw);
        const usersRaw = localStorage.getItem('users');
        const allUsers: UserProfile[] = usersRaw ? JSON.parse(usersRaw) : [];

        // پیدا کردن دانش‌آموز فعلی
        const activeUser = allUsers.find((u) => u.id === parsedCurrentUser.id) || parsedCurrentUser;

        // استخراج نام و نام خانوادگی
        const fullName = activeUser.name || '';
        const nameParts = fullName.trim().split(' ');
        const derivedFirstName = activeUser.firstName || nameParts[0] || '';
        const derivedLastName = activeUser.lastName || nameParts.slice(1).join(' ') || '';
        
        // تبدیل امن به رشته برای جلوگیری از خطای .trim()
        const studentCity = String(activeUser.city || activeUser.province || '').trim();
        const studentGrade = String(activeUser.grade || '').trim();

        // --- منطق هوشمند یافتن پشتیبان ---
        const matchingTeacher = allUsers.find((u) => {
          if (u.role !== 'teacher') return false;

          const teacherProvinces = parseMultipleValues(u.province);
          const teacherGrades = parseMultipleValues(u.grade);

          // بررسی اینکه آیا شهر/استان دانش‌آموز در لیست استان‌های معلم هست؟
          const isProvinceMatch = teacherProvinces.length === 0 || teacherProvinces.includes(studentCity.toLowerCase());
          // بررسی اینکه آیا پایه دانش‌آموز در لیست پایه‌های معلم هست؟
          const isGradeMatch = teacherGrades.length === 0 || teacherGrades.includes(studentGrade.toLowerCase());

          return isProvinceMatch && isGradeMatch;
        });

        const supporterName = matchingTeacher 
          ? matchingTeacher.name 
          : 'پشتیبان یافت نشد (عدم تطابق استان یا پایه)';

        setProfile({
          id: activeUser.id || '',
          firstName: derivedFirstName,
          lastName: derivedLastName,
          username: activeUser.username || '',
          password: activeUser.password || '',
          city: studentCity,
          grade: studentGrade,
          role: 'student',
          profileImage: activeUser.profileImage || '',
          supporter: supporterName || 'نامشخص',
        });
      } catch (error) {
        console.error('خطا در بارگذاری:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const usersRaw = localStorage.getItem('users');
      if (!usersRaw) return;

      const allUsers: any[] = JSON.parse(usersRaw);
      const updatedUsersList = allUsers.map((u) => {
        if (u.id === profile.id) {
          return { ...u, username: profile.username, password: profile.password, profileImage: profile.profileImage };
        }
        return u;
      });

      localStorage.setItem('users', JSON.stringify(updatedUsersList));
      localStorage.setItem('currentUser', JSON.stringify({
        ...JSON.parse(localStorage.getItem('currentUser') || '{}'),
        username: profile.username, password: profile.password, profileImage: profile.profileImage
      }));

      alert('تغییرات با موفقیت ذخیره شد ✨');
    } catch (error) {
      alert('خطا در ذخیره‌سازی.');
    }
  };

  if (isLoading) return <div className={styles.loadingText}>در حال بارگذاری...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.headerBanner} />
        <div className={styles.avatarWrapper}>
          {profile.profileImage ? (
            <img src={profile.profileImage} alt="avatar" className={styles.avatarImage} />
          ) : (
            <div className={styles.avatarSquare}>{profile.firstName.charAt(0)}</div>
          )}
          <div className={styles.infoSection}>
            <h1 className={styles.userName}>{profile.firstName} {profile.lastName}</h1>
            <span className={styles.userSubName}>@{profile.username}</span>
            <div className={styles.userBadge}><span>🎓</span> دانش‌آموز</div>
          </div>
        </div>

        <form className={styles.formGrid} onSubmit={handleUpdate}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>نام</label>
            <input className={`${styles.input} ${styles.readOnlyInput}`} value={profile.firstName} readOnly />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>نام خانوادگی</label>
            <input className={`${styles.input} ${styles.readOnlyInput}`} value={profile.lastName} readOnly />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>شهر / استان</label>
            <input className={`${styles.input} ${styles.readOnlyInput}`} value={profile.city} readOnly />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>پایه تحصیلی</label>
            <input className={`${styles.input} ${styles.readOnlyInput}`} value={profile.grade} readOnly />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>نام کاربری</label>
            <input className={styles.input} value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value.trim() })} style={{ direction: 'ltr' }} />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>رمز عبور</label>
            <input className={styles.input} type="password" value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} style={{ direction: 'ltr' }} />
          </div>
          <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
            <label className={styles.label}>لینک عکس پروفایل</label>
            <input className={styles.input} value={profile.profileImage} onChange={(e) => setProfile({ ...profile, profileImage: e.target.value })} placeholder="https://..." style={{ direction: 'ltr' }} />
          </div>
          <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
            <label className={styles.label}>پشتیبان آموزشی (تخصیص هوشمند)</label>
            <input className={`${styles.input} ${styles.readOnlyInput} ${styles.supporterHighlight}`} value={profile.supporter} readOnly />
          </div>
          <button type="submit" className={styles.submitBtn}>ذخیره تغییرات</button>
        </form>
      </div>
    </div>
  );
}
