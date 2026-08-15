'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Particle {
  id: number;
  left: string;
  top: string;
  duration: string;
  delay: string;
}

export default function Hero() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // تولید ذرات پس از لود کامل صفحه در مرورگر
    const items: Particle[] = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + "%",
      top: Math.random() * 100 + "%",
      duration: 5 + Math.random() * 10 + "s",
      delay: Math.random() * 5 + "s",
    }));
    setParticles(items);
  }, []);

  return (
    <section className="hero">
      <div className="particles" id="particles">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: p.left,
              top: p.top,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      <div className="container hero-content">
        <div className="hero-text fade-up">
          <h1>پلتفرم آموزش هوشمند سفینه</h1>
          <p>
            مدرن برای مدیریت یادگیری، آموزش آنلاین و ارتباط مستقیم است. هدف ما ایجاد
            یک تجربه کاربری منحصر به فرد در دنیای آموزش دیجیتال است.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn btn-primary">
              ورود به سامانه
            </Link>
            <a href="#why" className="btn btn-secondary">
              امکانات هوشمند
            </a>
          </div>
        </div>

        <div className="hero-card fade-up">
          <h3 style={{ marginBottom: '15px', color: 'var(--text-main)' }}>دسترسی سریع</h3>
          <div className="quick-links">
            <div className="quick-item">🎬 <span>آموزش ویدیویی نوین</span></div>
            <div className="quick-item">🧠 <span>آزمون‌های آنلاین هوشمند</span></div>
            <div className="quick-item">💬 <span>پشتیبانی مستقیم</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
