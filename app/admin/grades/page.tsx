'use client';

import React, { useState, useEffect } from 'react';
import styles from '../users/users.module.css'; // استفاده از استایل‌های مشترک برای یکپارچگی ظاهری

interface Grade {
  id: string;
  name: string;
}

export default function GradesManagementPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [newGradeName, setNewGradeName] = useState('');
  const [error, setError] = useState('');

  // بارگذاری پایه‌ها از localStorage
  useEffect(() => {
    const loadGrades = () => {
      const stored = localStorage.getItem('grades');
      if (stored) {
        setGrades(JSON.parse(stored));
      } else {
        // مقادیر پیش‌فرض اولیه در صورت خالی بودن
        const defaultGrades = [
          { id: '1', name: 'پایه هفتم' },
          { id: '2', name: 'پایه هشتم' },
          { id: '3', name: 'پایه نهم' }
        ];
        localStorage.setItem('grades', JSON.stringify(defaultGrades));
        setGrades(defaultGrades);
      }
    };

    loadGrades();
  }, []);

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newGradeName.trim()) {
      setError('لطفاً نام پایه را وارد کنید.');
      return;
    }

    if (grades.some((g) => g.name === newGradeName.trim())) {
      setError('این پایه قبلاً تعریف شده است.');
      return;
    }

    const newGrade: Grade = {
      id: Date.now().toString(),
      name: newGradeName.trim()
    };

    const updated = [...grades, newGrade];
    setGrades(updated);
    localStorage.setItem('grades', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage')); // همگام‌سازی با صفحات دیگر
    setNewGradeName('');
    setError('');
  };

  const handleDeleteGrade = (id: string) => {
    if (confirm('آیا از حذف این پایه اطمینان دارید؟')) {
      const updated = grades.filter((g) => g.id !== id);
      setGrades(updated);
      localStorage.setItem('grades', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>مدیریت پایه‌های تحصیلی</h1>
      </div>

      {/* فرم افزودن پایه جدید */}
      <div
        className={styles.tableCard}
        style={{
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <form
          onSubmit={handleAddGrade}
          style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center'
          }}
        >
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="نام پایه جدید (مثال: پایه دهم تجربی)"
              value={newGradeName}
              onChange={(e) => setNewGradeName(e.target.value)}
              className={styles.searchInput}
              style={{
                width: '100%',
                margin: 0
              }}
            />
            {error && (
              <p
                style={{
                  color: 'var(--danger, #ef4444)',
                  fontSize: '12px',
                  marginTop: '5px'
                }}
              >
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className={styles.addBtn}
            style={{ height: '42px' }}
          >
            افزودن پایه
          </button>
        </form>
      </div>

      {/* جدول نمایش پایه‌ها */}
      <div className={styles.tableCard}>
        <table className={styles.userTable}>
          <thead>
            <tr>
              <th>عنوان پایه</th>
              <th style={{ width: '150px', textAlign: 'center' }}>عملیات</th>
            </tr>
          </thead>

          <tbody>
            {grades.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)'
                  }}
                >
                  هیچ پایه‌ای تعریف نشده است.
                </td>
              </tr>
            ) : (
              grades.map((grade) => (
                <tr key={grade.id}>
                  <td>{grade.name}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteGrade(grade.id)}
                      style={{
                        color: 'var(--danger, #ef4444)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
