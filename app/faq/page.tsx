"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import styles from "./faq.module.css";

type FAQItem = {
  q: string;
  a: string;
};

// فقط سوالات مربوط به سایت
const siteQuestions: FAQItem[] = [
  {
    q: "اگر رمز عبورم را فراموش کنم چه کار کنم؟",
    a: "در صفحه ورود روی گزینه فراموشی رمز عبور کلیک کنید تا لینک بازیابی برای شما ارسال شود. اگر ایمیلی دریافت نکردید، صندوق اسپم را هم چک کنید و در صورت نیاز با پشتیبانی در ارتباط باشید.",
  },
  {
    q: "چرا بعضی بخش‌های پنل برای من فعال نیست؟",
    a: "برخی قابلیت‌ها فقط برای کاربران دارای دسترسی مشخص یا دوره فعال نمایش داده می‌شوند. اگر باید به بخشی دسترسی داشته باشید اما فعال نیست، لطفاً از طریق تیکت پشتیبانی درخواست بررسی بدهید.",
  },
  {
    q: "چطور با پشتیبانی سایت ارتباط بگیرم؟",
    a: "می‌توانید از طریق سیستم تیکت، پنل کاربری یا فرم تماس با تیم پشتیبانی در ارتباط باشید. تیم ما در ساعات کاری پاسخگوی شماست و معمولاً کمتر از ۲۴ ساعت جواب می‌گیرید.",
  },
  {
    q: "اطلاعات شخصی من چگونه محافظت می‌شود؟",
    a: "تمام اطلاعات شما به صورت رمزنگاری‌شده ذخیره می‌شود و به هیچ شخص ثالثی ارائه نمی‌گردد. شما در هر زمان می‌توانید درخواست حذف کامل حساب خود را ثبت کنید.",
  },
  {
    q: "چطور می‌توانم اطلاعات حساب کاربری‌ام را به‌روزرسانی کنم؟",
    a: "از بخش «تنظیمات» در پنل کاربری می‌توانید مشخصات، شماره تماس، ایمیل و رمز عبور خود را ویرایش کنید. تغیيرات بلافاصله اعمال می‌شود.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className={styles.page} dir="rtl">
      <Navbar />

      <div className={styles.orbTop} />
      <div className={styles.orbBottom} />
      <div className={styles.orbSide} />

      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>سوالات متداول</h1>
          <p className={styles.subtitle}>
            جواب سوالات پرتکرار درباره استفاده از سایت، حساب کاربری و پشتیبانی
            را اینجا پیدا کن.
          </p>
        </header>

        <section className={styles.faqSection}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon}>🌐</span>
            <div>
              <h3 className={styles.sectionTitle}>سوالات مربوط به سایت</h3>
              <p className={styles.sectionDesc}>
                هر سوالی درباره سامانه داشتی، اینجا جوابش هست.
              </p>
            </div>
          </div>

          {siteQuestions.map((item, index) => (
            <div
              key={index}
              className={`${styles.accordionItem} ${
                openIndex === index ? styles.accordionItemOpen : ""
              }`}
            >
              <button
                onClick={() => toggleAccordion(index)}
                className={styles.questionButton}
              >
                <span
                  className={`${styles.questionText} ${
                    openIndex === index ? styles.questionTextOpen : ""
                  }`}
                >
                  {item.q}
                </span>

                <div
                  className={`${styles.plusIcon} ${
                    openIndex === index ? styles.plusIconOpen : ""
                  }`}
                >
                  <span>+</span>
                </div>
              </button>

              <div
                className={`${styles.answerWrapper} ${
                  openIndex === index ? styles.answerWrapperOpen : ""
                }`}
              >
                <div className={styles.answerContent}>
                  <p className={styles.answerText}>{item.a}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <div className={styles.backWrapper}>
          <Link href="/" className={styles.backLink}>
            <span>بازگشت به صفحه اصلی</span>
            <span className={styles.backArrow}>←</span>
          </Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© تمامی حقوق برای Safineh Educational Team محفوظ است</p>
      </footer>
    </div>
  );
}
