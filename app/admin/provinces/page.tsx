'use client';

import React, { useState, useEffect } from 'react';
import styles from '../users/users.module.css';

interface Province {
  id: string;
  name: string;
}

export default function ProvincesManagementPage() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [newProvinceName, setNewProvinceName] = useState('');
  const [error, setError] = useState('');

  // بارگذاری استان‌ها از localStorage
  useEffect(() => {
    const loadProvinces = () => {
      const stored = localStorage.getItem('provinces');
      if (stored) {
        setProvinces(JSON.parse(stored));
      } else {
        // مقادیر پیش‌فرض اولیه
        const defaultProvinces = [
          { id: '1', name: 'تهران' },
          { id: '2', name: 'خراسان رضوی' },
          { id: '3', name: 'اصفهان' }
        ];
        localStorage.setItem('provinces', JSON.stringify(defaultProvinces));
        setProvinces(defaultProvinces);
      }
    };
    loadProvinces();
  }, []);

  const handleAddProvince = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvinceName.trim()) {
      setError('لطفاً نام استان را وارد کنید.');
      return;
    }

    if (provinces.some(p => p.name === newProvinceName.trim())) {
      setError('این استان قبلاً تعریف شده است.');
      return;
    }

    const newProvince: Province = {
      id: Date.now().toString(),
      name: newProvinceName.trim()
    };

    const updated = [...provinces, newProvince];
    setProvinces(updated);
    localStorage.setItem('provinces', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    setNewProvinceName('');
    setError('');
  };

  const handleDeleteProvince = (id: string) => {
    if (confirm('آیا از حذف این استان اطمینان دارید؟')) {
      const updated = provinces.filter(p => p.id !== id);
      setProvinces(updated);
      localStorage.setItem('provinces', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>مدیریت استان‌ها</h1>
      </div>

      {/* فرم افزودن استان جدید */}
      <div className={styles.tableCard} style={{ padding: '20px', marginBottom: '20px' }}>
        <form onSubmit={handleAddProvince} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="نام استان جدید (مثال: فارس)"
              value={newProvinceName}
              onChange={(e) => setNewProvinceName(e.target.value)}
              className={styles.searchInput}
              style={{ width: '100%', margin: 0 }}
            />
            {error && <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>{error}</p>}
          </div>
          <button type="submit" className={styles.addBtn} style={{ height: '42px' }}>
            افزودن استان
          </button>
        </form>
      </div>

      {/* جدول نمایش استان‌ها */}
      <div className={styles.tableCard}>
        <table className={styles.userTable}>
          <thead>
            <tr>
              <th>نام استان</th>
              <th style={{ width: '150px', textAlign: 'center' }}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {provinces.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center' }}>هیچ استانی تعریف نشده است.</td>
              </tr>
            ) : (
              provinces.map((province) => (
                <tr key={province.id}>
                  <td>{province.name}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => handleDeleteProvince(province.id)}
                      style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
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
