"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import "../news.public.css";

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

export default function NewsDetailPage() {
  const params = useParams();
  // تبدیل ایمن شناسه به رشته
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [post, setPost] = useState<PostItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const raw = localStorage.getItem("demo_posts");
    if (!raw) {
      setLoading(false);
      return;
    }

    try {
      const data = JSON.parse(raw) as PostItem[];
      // پیدا کردن خبر بر اساس شناسه (id) به صورت رشته یا عدد مقایسه می‌شود
      const found = data.find((item) => String(item.id) === String(id)) || null;
      setPost(found);
    } catch (e) {
      console.error("Error parsing posts", e);
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const formatDate = (value: string) => {
    if (!value) return "نامشخص";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "نامعتبر";
    return date.toLocaleString("fa-IR");
  };

  if (loading) {
    return (
      <main className="news-detail-page" dir="rtl">
        <div className="news-detail-shell">
          <div className="news-loading">در حال بارگذاری...</div>
        </div>
      </main>
    );
  }

  // اصلاح شرط: حذف بررسی سخت‌گیرانه نوع خبر تا مقالات آموزشی نیز باز شوند
  // همچنین بررسی وضعیت در صورتی که تعریف نشده باشد نادیده گرفته می‌شود
  const isPostInvalid = 
    !post || 
    (post.status && post.status !== "published") || 
    isExpired(post.expiresAt);

  if (isPostInvalid) {
    return (
      <main className="news-detail-page" dir="rtl">
        <div className="news-detail-shell">
          <div className="news-not-found">
            <h1>محتوا پیدا نشد</h1>
            <p>این خبر یا مقاله حذف شده، منتشر نشده یا منقضی شده است.</p>
            <Link href="/news" className="news-btn">
              بازگشت به لیست اخبار و مقالات
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="news-detail-page" dir="rtl">
      <div className="news-detail-shell">
        <Link href="/news" className="news-back-link">
          ← بازگشت به اخبار و مقالات
        </Link>

        <article className="news-detail-card">
          {post.attachment ? (
            <div className="news-detail-image">
              <img src={post.attachment} alt={post.title} />
            </div>
          ) : null}

          <div className="news-detail-content">
            <div className="news-detail-meta">
              <span className={`news-badge ${post.type === "news" ? "badge-news" : "badge-article"}`}>
                {post.type === "news" ? "خبر" : "مقاله آموزشی"}
              </span>
              <span>انتشار: {formatDate(post.publishedAt || post.createdAt)}</span>
              <span>انقضا: {post.expiresAt ? formatDate(post.expiresAt) : "نامحدود"}</span>
            </div>

            <h1>{post.title}</h1>

            <div className="news-detail-text" style={{ whiteSpace: "pre-line" }}>{post.content}</div>
          </div>
        </article>
      </div>
    </main>
  );
}
