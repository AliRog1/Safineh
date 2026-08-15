'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/TeacherSidebar';
import styles from './teacher-layout.module.css';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. دریافت اطلاعات کاربر از مرورگر
    const userRaw = localStorage.getItem('currentUser');
    if (!userRaw) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userRaw);

    // 2. چک کردن نقش کاربر (فقط معلم، ادمین و سوپرادمین اجازه ورود دارند)
    const allowedRoles = ['teacher', 'admin', 'superadmin'];
    if (!allowedRoles.includes(user.role)) {
      router.push('/'); // هدایت به صفحه اصلی اگر دسترسی نداشت
      return;
    }

    // 3. چک کردن داشتن حداقل یک Permission (برای غیر از سوپرادمین)
    if (user.role !== 'superadmin') {
      const p = user.permissions || {};
      const hasAnyPermission = 
        p.viewProvinceStudents || 
        p.myCourses || 
        p.questionBank || 
        p.examManagement || 
        p.tickets;

      if (!hasAnyPermission) {
        alert('شما دسترسی لازم برای پنل همکاران را ندارید. با مدیریت تماس بگیرید.');
        router.push('/');
        return;
      }
    }

    // اگر تمام مراحل تایید شد
    setIsAuthorized(true);
  }, [router]);

  // تا زمانی که بررسی وضعیت کاربر تمام نشده، چیزی رندر نشود (برای جلوگیری از پرش تصویر)
  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Tahoma' }}>
        در حال بررسی دسترسی...
      </div>
    );
  }

  return (
    <div className={styles.teacherContainer}>
      <TeacherSidebar />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
