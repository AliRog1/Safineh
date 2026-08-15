"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./news.public.css";

type UserRole = "admin" | "teacher" | "student";

type PostItem = {
  id: string;
  title: string;
  slug?: string;
  type: "article" | "news";
  status: string;
  content: string;
  attachment: string;
  publishedAt: string;
  expiresAt: string;
  audience: UserRole[];
  createdAt: string;
  updatedAt?: string;
};

function isExpired(expiresAt: string) {
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

export default function NewsPage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [query, setQuery] = useState("");
  // افزودن فیلتر برای تفکیک اخبار و مقالات آموزشی یا نمایش همه
  const [activeTab, setActiveTab] = useState<"all" | "news" | "article">("all");

  useEffect(() => {
    const raw = localStorage.getItem("demo_posts");
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as PostItem[];
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error reading demo_posts", e);
      setPosts([]);
    }
  }, []);

  const filteredAndSortedList = useMemo(() => {
    return posts
      .filter((post) => {
        // فیلتر بر اساس نوع محتوا (همه / خبر / مقاله)
        if (activeTab !== "all" && post.type !== activeTab) {
          return false;
        }
        return true;
      })
      .filter((post) => {
        // اگر وضعیت خالی باشد منتشر شده فرض می‌شود، در غیر این صورت باید برابر published باشد
        return !post.status || post.status === "published";
      })
      .filter((post) => {
        // بررسی تاریخ انقضا
        return !isExpired(post.expiresAt);
      })
      .filter((post) => {
        // جستجوی ایمن و بدون حساسیت به حروف
        const searchTitle = post.title ? post.title.toLowerCase() : "";
        const searchContent = post.content ? post.content.toLowerCase() : "";
        const targetQuery = query.toLowerCase().trim();
        return searchTitle.includes(targetQuery) || searchContent.includes(targetQuery);
      })
      .sort((a, b) => {
        const da = new Date(a.publishedAt || a.createdAt).getTime();
        const db = new Date(b.publishedAt || b.createdAt).getTime();
        return db - da;
      });
  }, [posts, query, activeTab]);

  const formatDate = (value: string) => {
    if (!value) return "نامشخص";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "نامعتبر";
    return date.toLocaleDateString("fa-IR");
  };

  const excerpt = (text: string) => {
    if (!text) return "";
    return text.length > 160 ? `${text.slice(0, 160)}...` : text;
  };

  return (
    <main className="news-page" dir="rtl">
      <section className="news-hero">
        <div className="news-hero__content">
          <span className="news-kicker">آخرین اخبار، اطلاعیه‌ها و مقالات آموزشی</span>
          <h1>اطلاع‌رسانی و آموزش</h1>
          <p>
            جدیدترین خبرها، اطلاعیه‌ها و مطالب علمی-آموزشی را از این بخش دنبال کنید.
          </p>
        </div>

        <div className="news-hero__panel" style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {/* تب‌های تفکیک محتوا */}
          <div className="news-tabs" style={{ display: "flex", gap: "10px", margin: "10px 0" }}>
            <button
              onClick={() => setActiveTab("all")}
              className={`news-btn ${activeTab === "all" ? "active" : ""}`}
              style={{ background: activeTab === "all" ? "var(--primary)" : "#f3f4f6", color: activeTab === "all" ? "#fff" : "#1f2937" }}
            >
              همه مطالب
            </button>
            <button
              onClick={() => setActiveTab("news")}
              className={`news-btn ${activeTab === "news" ? "active" : ""}`}
              style={{ background: activeTab === "news" ? "var(--primary)" : "#f3f4f6", color: activeTab === "news" ? "#fff" : "#1f2937" }}
            >
              اخبار و اطلاعیه‌ها
            </button>
            <button
              onClick={() => setActiveTab("article")}
              className={`news-btn ${activeTab === "article" ? "active" : ""}`}
              style={{ background: activeTab === "article" ? "var(--primary)" : "#f3f4f6", color: activeTab === "article" ? "#fff" : "#1f2937" }}
            >
              مقالات آموزشی
            </button>
          </div>

          <label className="news-search">
            <span>جستجو</span>
            <input
              type="search"
              placeholder="جستجوی عنوان یا متن..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="news-grid">
        {filteredAndSortedList.length === 0 ? (
          <div className="news-empty">
            <h2>محتوایی برای نمایش وجود ندارد</h2>
            <p>در حال حاضر هیچ پست منتشرشده‌ای با معیارهای شما یافت نشد.</p>
          </div>
        ) : (
          filteredAndSortedList.map((post) => (
            <article key={post.id} className="news-card">
              <Link href={`/news/${post.id}`} className="news-card__image">
                {post.attachment ? (
                  <img src={post.attachment} alt={post.title} />
                ) : (
                  <div className="news-card__placeholder">بدون تصویر</div>
                )}
              </Link>

              <div className="news-card__body">
                <div className="news-card__meta">
                  <span className={`news-badge ${post.type === "news" ? "badge-news" : "badge-article"}`}>
                    {post.type === "news" ? "خبر" : "مقاله"}
                  </span>
                  <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                </div>

                <h2 className="news-card__title">
                  <Link href={`/news/${post.id}`}>{post.title}</Link>
                </h2>

                <p className="news-card__excerpt">{excerpt(post.content)}</p>

                <div className="news-card__footer">
                  <span className="news-date">
                    تاریخ انتشار: {formatDate(post.publishedAt || post.createdAt)}
                  </span>

                  <Link href={`/news/${post.id}`} className="news-btn">
                    مشاهده جزئیات
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
