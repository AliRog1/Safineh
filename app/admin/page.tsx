'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  username: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student';
  avatar?: string;
  createdAt: string;
}

interface StatsState {
  usersCount: number;
  coursesCount: number;
  quizzesCount: number;
  questionsCount: number;
  ticketsCount: number; // فیلد جدید برای تیکت‌های باز
  postsCount: number;   // فیلد جدید برای کل مقالات
}

type AnyObject = Record<string, any>;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsState>({
    usersCount: 0,
    coursesCount: 0,
    quizzesCount: 0,
    questionsCount: 0,
    ticketsCount: 0,
    postsCount: 0,
  });

  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const parseJSON = (value: string | null) => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error('خطا در parse JSON:', error, value);
        return null;
      }
    };

    const getArrayFromPossibleKeys = (keys: string[]): any[] => {
      for (const key of keys) {
        const parsed = parseJSON(localStorage.getItem(key));

        if (Array.isArray(parsed)) {
          console.log(`✅ داده آرایه‌ای از localStorage key="${key}" پیدا شد`, parsed);
          return parsed;
        }

        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.data)) {
            console.log(`✅ داده از ${key}.data پیدا شد`, parsed.data);
            return parsed.data;
          }
          if (Array.isArray(parsed.items)) {
            console.log(`✅ داده از ${key}.items پیدا شد`, parsed.items);
            return parsed.items;
          }
          if (Array.isArray(parsed.list)) {
            console.log(`✅ داده از ${key}.list پیدا شد`, parsed.list);
            return parsed.list;
          }
        }
      }
      return [];
    };

    const getSafinehDB = (): AnyObject | null => {
      const possibleDbKeys = ['safinehDB', 'safineh-db', 'db', 'database', 'appDB'];
      for (const key of possibleDbKeys) {
        const parsed = parseJSON(localStorage.getItem(key));
        if (parsed && typeof parsed === 'object') {
          console.log(`✅ دیتابیس از localStorage key="${key}" پیدا شد`, parsed);
          return parsed;
        }
      }
      return null;
    };

    const db = getSafinehDB();

    // ۱. کاربران
    let users: User[] = getArrayFromPossibleKeys([
      'users',
      'allUsers',
      'appUsers',
      'safinehUsers',
    ]) as User[];

    if (!users.length && db) {
      if (Array.isArray(db.users)) users = db.users;
      else if (Array.isArray(db.members)) users = db.members;
      else if (Array.isArray(db.accounts)) users = db.accounts;
    }

    // ۲. دوره‌ها
    let courses: any[] = [];
    if (db) {
      if (Array.isArray(db.courses)) courses = db.courses;
      else if (Array.isArray(db.classes)) courses = db.classes;
      else if (Array.isArray(db.lessons)) courses = db.lessons;
      else if (Array.isArray(db.programs)) courses = db.programs;
    }
    if (!courses.length) {
      courses = getArrayFromPossibleKeys([
        'courses',
        'classes',
        'lessons',
        'programs',
      ]);
    }

    // ۳. آزمون‌ها
    let quizzes: any[] = [];
    if (db) {
      if (Array.isArray(db.quizzes)) quizzes = db.quizzes;
      else if (Array.isArray(db.exams)) quizzes = db.exams;
      else if (Array.isArray(db.tests)) quizzes = db.tests;
      else if (Array.isArray(db.assessments)) quizzes = db.assessments;
    }
    if (!quizzes.length) {
      quizzes = getArrayFromPossibleKeys([
        'quizzes',
        'exams',
        'tests',
        'assessments',
      ]);
    }

    // ۴. سوالات
    let questions: any[] = [];
    if (db) {
      if (Array.isArray(db.questions)) questions = db.questions;
      else if (Array.isArray(db.questionBank)) questions = db.questionBank;
      else if (Array.isArray(db.items)) questions = db.items;
      else if (Array.isArray(db.quizQuestions)) questions = db.quizQuestions;
    }
    if (!questions.length) {
      questions = getArrayFromPossibleKeys([
        'questions',
        'questionBank',
        'quizQuestions',
        'items',
      ]);
    }

    // ۵. تیکت‌های باز (فقط بازها برای مدیریت ادمین)
    let tickets: any[] = [];
    if (db) {
      if (Array.isArray(db.tickets)) tickets = db.tickets;
      else if (Array.isArray(db.supportTickets)) tickets = db.supportTickets;
    }
    if (!tickets.length) {
      tickets = getArrayFromPossibleKeys(['tickets', 'supportTickets']);
    }
    const openTicketsCount = tickets.filter((t: any) => t && (t.status === 'open' || t.status === 'باز')).length;

    // ۶. مقالات و اخبار
    let posts: any[] = [];
    if (db) {
      if (Array.isArray(db.posts)) posts = db.posts;
      else if (Array.isArray(db.articles)) posts = db.articles;
      else if (Array.isArray(db.news)) posts = db.news;
    }
    if (!posts.length) {
      posts = getArrayFromPossibleKeys(['demo_posts', 'posts', 'articles', 'news']);
    }

    console.log('📊 Admin Dashboard Stats Debug:', {
      users,
      courses,
      quizzes,
      questions,
      openTicketsCount,
      postsCount: posts.length,
      db,
    });

    setStats({
      usersCount: users.length,
      coursesCount: courses.length,
      quizzesCount: quizzes.length,
      questionsCount: questions.length,
      ticketsCount: openTicketsCount,
      postsCount: posts.length,
    });

    const lastThree = [...users].slice(-3).reverse();
    setRecentUsers(lastThree);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return { label: 'مدیر کل', color: '#8b5cf6' };
      case 'admin':
        return { label: 'مدیر', color: '#3b82f6' };
      case 'teacher':
        return { label: 'دبیر / همکار', color: '#f59e0b' };
      case 'student':
        return { label: 'دانش‌آموز', color: '#00e5ff' };
      default:
        return { label: role || 'کاربر', color: '#94a3b8' };
    }
  };

  return (
    <div style={{ padding: '10px', animation: 'fadeIn 0.5s ease-out' }}>
      <header
        style={{
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            داشبورد مدیریتی
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px' }}>
            خوش آمدید! وضعیت امروز سامانه به این شرح است:
          </p>
        </div>
        <div
          style={{
            background: 'var(--card-bg-light)',
            padding: '8px 15px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span style={{ color: '#00e5ff', fontSize: '14px' }}>
            📅 {new Date().toLocaleDateString('fa-IR')}
          </span>
        </div>
      </header>

      <div style={gridContainer}>
        <StatCard title="کل کاربران" value={stats.usersCount} icon="👥" color="#00e5ff" />
        <StatCard title="دوره‌های فعال" value={stats.coursesCount} icon="📚" color="#a855f7" />
        <StatCard title="آزمون‌های برگزار شده" value={stats.quizzesCount} icon="📝" color="#22c55e" />
        <StatCard title="سوالات موجود" value={stats.questionsCount} icon="❓" color="#f59e0b" />
        {/* کارت‌های اضافه شده */}
        <StatCard title="تیکت‌های باز" value={stats.ticketsCount} icon="💬" color="#ef4444" />
        <StatCard title="کل مقالات و اخبار" value={stats.postsCount} icon="📰" color="#8b5cf6" />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '20px',
          marginTop: '30px',
        }}
      >
        <div style={cardStyle}>
          <h3
            style={{
              fontSize: '18px',
              marginBottom: '20px',
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '10px',
            }}
          >
            ⚡ دسترسی سریع
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <QuickActionLink href="/admin/users/add" title="افزودن کاربر" icon="➕" />
            <QuickActionLink href="/admin/questions" title="ثبت سوال" icon="❓" />
            <QuickActionLink href="/admin/exams" title="تعریف آزمون" icon="🎯" />
            <QuickActionLink href="/admin/reports" title="گزارش‌گیری" icon="📊" />
            <QuickActionLink href="/admin/tickets" title="مدیریت تیکت‌ها" icon="💬" />
            <QuickActionLink href="/admin/posts" title="مدیریت مقالات" icon="📰" />
          </div>
        </div>

        <div style={cardStyle}>
          <h3
            style={{
              fontSize: '18px',
              marginBottom: '20px',
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '10px',
            }}
          >
            🆕 آخرین کاربران عضو شده
          </h3>

          {recentUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentUsers.map((user: User) => {
                const roleInfo = getRoleBadge(user.role);

                return (
                  <div
                    key={user.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--card-bg-light)',
                      padding: '10px',
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '35px',
                          height: '35px',
                          borderRadius: '50%',
                          background: 'var(--avatar-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          overflow: 'hidden',
                        }}
                      >
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            alt={user.name}
                          />
                        ) : (
                          user.name?.slice(0, 1) || '👤'
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>{user.name}</div>
                        <div style={{ fontSize: '11px', color: roleInfo.color }}>{roleInfo.label}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#4ade80' }}>{user.createdAt}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>
              هنوز کاربری ثبت نشده است.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{title}</span>
          <h2 style={{ fontSize: '32px', color, marginTop: '10px', fontWeight: 'bold' }}>{value}</h2>
        </div>
        <div style={{ fontSize: '40px', opacity: 0.8 }}>{icon}</div>
      </div>
      <div
        style={{
          height: '4px',
          width: '100%',
          background: 'var(--border-color)',
          marginTop: '15px',
          borderRadius: '2px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: value > 0 ? '70%' : '0%',
            background: color,
            borderRadius: '2px',
            boxShadow: value > 0 ? `0 0 10px ${color}` : 'none',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

function QuickActionLink({ href, title, icon }: any) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        background: 'var(--card-bg-light)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        color: 'var(--text-main)',
        fontSize: '14px',
        transition: 'all 0.2s',
      }}
    >
      <span>{icon}</span>
      <span>{title}</span>
    </Link>
  );
}

const gridContainer: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '20px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--card-bg)',
  backdropFilter: 'blur(10px)',
  border: '1px solid var(--border-color)',
  borderRadius: '20px',
  padding: '20px',
  color: 'var(--text-main)',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
};
