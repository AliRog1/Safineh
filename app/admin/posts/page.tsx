"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./posts.modern.css";

interface ProvinceItem {
  id: string;
  name?: string;
  title?: string;
}

interface GradeItem {
  id: string;
  name?: string;
  title?: string;
}

interface PostItem {
  id: string;
  title: string;
  slug?: string;
  type: "article" | "news";
  status: string;
  allProvinces: boolean;
  provinceIds: string[];
  allGrades: boolean;
  gradeIds: string[];
  content: string;
  publishedAt: string;
  expiresAt: string;
  attachment: string;
  createdAt: string;
  updatedAt?: string;
}

type FormDataState = {
  title: string;
  slug: string;
  type: "article" | "news";
  status: string;
  allProvinces: boolean;
  provinceIds: string[];
  allGrades: boolean;
  gradeIds: string[];
  content: string;
  publishedAt: string;
  expiresAt: string;
  attachment: string;
};

const DEFAULT_FORM_DATA: FormDataState = {
  title: "",
  slug: "",
  type: "article",
  status: "published",
  allProvinces: true,
  provinceIds: [],
  allGrades: true,
  gradeIds: [],
  content: "",
  publishedAt: "",
  expiresAt: "",
  attachment: "",
};

const FALLBACK_PROVINCES: ProvinceItem[] = [
  { id: "1", name: "تهران" },
  { id: "2", name: "اصفهان" },
  { id: "3", name: "فارس" },
  { id: "4", name: "خراسان رضوی" },
  { id: "5", name: "آذربایجان شرقی" },
];

const FALLBACK_GRADES: GradeItem[] = [
  { id: "10", name: "پایه دهم" },
  { id: "11", name: "پایه یازدهم" },
  { id: "12", name: "پایه دوازدهم" },
];

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  
  // Modals and logic state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  
  const [formData, setFormData] = useState<FormDataState>(DEFAULT_FORM_DATA);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const readJson = <T,>(keys: string[], fallback: T): T => {
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (!value) continue;

        try {
          return JSON.parse(value) as T;
        } catch (error) {
          console.error(`Failed to parse ${key}`, error);
        }
      }
      return fallback;
    };

    const savedPosts = readJson<PostItem[]>(["demo_posts"], []);
    const savedProvinces = readJson<ProvinceItem[]>(
      ["admin_provinces", "provinces"],
      FALLBACK_PROVINCES
    );
    const savedGrades = readJson<GradeItem[]>(["admin_grades", "grades"], FALLBACK_GRADES);

    setPosts(savedPosts);
    setProvinces(savedProvinces);
    setGrades(savedGrades);
  }, []);

  const savePostsToLocalStorage = (nextPosts: PostItem[]) => {
    localStorage.setItem("demo_posts", JSON.stringify(nextPosts));
    setPosts(nextPosts);
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingPostId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFormForCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openFormForEdit = (post: PostItem) => {
    setEditingPostId(post.id);
    setFormData({
      title: post.title,
      slug: post.slug || "",
      type: post.type,
      status: post.status,
      allProvinces: post.allProvinces,
      provinceIds: post.provinceIds || [],
      allGrades: post.allGrades,
      gradeIds: post.gradeIds || [],
      content: post.content,
      publishedAt: post.publishedAt || "",
      expiresAt: post.expiresAt || "",
      attachment: post.attachment || "",
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const openViewModal = (post: PostItem) => {
    setSelectedPost(post);
    setIsViewOpen(true);
  };

  const closeViewModal = () => {
    setSelectedPost(null);
    setIsViewOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        attachment: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const now = new Date().toISOString();

    if (editingPostId) {
      // Edit mode
      const updatedPosts = posts.map((post) =>
        post.id === editingPostId
          ? {
              ...post,
              ...formData,
              updatedAt: now,
              publishedAt: formData.publishedAt || post.publishedAt || now,
            }
          : post
      );
      savePostsToLocalStorage(updatedPosts);
    } else {
      // Create mode
      const newPost: PostItem = {
        ...formData,
        id: Date.now().toString(),
        createdAt: now,
        publishedAt: formData.publishedAt || now,
      };
      const nextPosts = [newPost, ...posts];
      savePostsToLocalStorage(nextPosts);
    }

    closeForm();
  };

  const deletePost = (id: string) => {
    const confirmed = window.confirm("آیا از حذف این خبر/مقاله اطمینان دارید؟");
    if (!confirmed) return;

    const filteredPosts = posts.filter((post) => post.id !== id);
    savePostsToLocalStorage(filteredPosts);
  };

  const updateFormField = <K extends keyof FormDataState>(
    key: K,
    value: FormDataState[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleProvince = (provinceId: string, checked: boolean) => {
    setFormData((prev) => {
      const nextIds = checked
        ? [...prev.provinceIds, provinceId]
        : prev.provinceIds.filter((id) => id !== provinceId);

      return {
        ...prev,
        provinceIds: nextIds,
      };
    });
  };

  const toggleGrade = (gradeId: string, checked: boolean) => {
    setFormData((prev) => {
      const nextIds = checked
        ? [...prev.gradeIds, gradeId]
        : prev.gradeIds.filter((id) => id !== gradeId);

      return {
        ...prev,
        gradeIds: nextIds,
      };
    });
  };

  const formatDateTime = (value: string) => {
    if (!value) return "نامحدود";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "نامعتبر";
    return date.toLocaleString("fa-IR");
  };

  const renderTargetCount = (all: boolean, ids: string[], label: string) => {
    return all ? `همه ${label}` : `${ids.length} ${label}`;
  };

  return (
    <main className="admin-posts-page" dir="rtl">
      <header className="admin-header">
        <div className="header-title">
          <h1>مدیریت اخبار و مقالات</h1>
          <p>مدیریت و هدف‌گذاری محتوا بر اساس استان، پایه تحصیلی و زمان‌بندی انتشار</p>
        </div>

        <button type="button" onClick={openFormForCreate} className="btn-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          افزودن محتوای جدید
        </button>
      </header>

      <section className="table-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>تصویر</th>
                <th>عنوان و نوع</th>
                <th>هدف‌گذاری (استان / پایه)</th>
                <th>تاریخ انتشار</th>
                <th>تاریخ انقضا</th>
                <th className="text-center">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    هنوز محتوایی ثبت نشده است. جهت ایجاد اولین خبر یا مقاله روی دکمه «افزودن
                    محتوای جدید» کلیک کنید.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id}>
                    <td className="w-media">
                      <div className="media-preview-container">
                        {post.attachment ? (
                          <img src={post.attachment} alt="کاور" className="media-preview" />
                        ) : (
                          <div className="media-placeholder">بدون تصویر</div>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="post-title">{post.title}</div>
                      <span
                        className={`badge ${
                          post.type === "news" ? "badge-warning" : "badge-primary"
                        }`}
                      >
                        {post.type === "news" ? "خبر" : "مقاله آموزشی"}
                      </span>
                    </td>

                    <td>
                      <div className="targets-wrapper">
                        <span className={`tag ${post.allProvinces ? "tag-green" : "tag-gray"}`}>
                          {renderTargetCount(post.allProvinces, post.provinceIds, "استان")}
                        </span>
                        <span className={`tag ${post.allGrades ? "tag-purple" : "tag-gray"}`}>
                          {renderTargetCount(post.allGrades, post.gradeIds, "پایه")}
                        </span>
                      </div>
                    </td>

                    <td className="date-cell">{formatDateTime(post.publishedAt)}</td>
                    <td className="date-cell">{formatDateTime(post.expiresAt)}</td>

                    <td className="text-center">
                      <div className="actions-cell">
                        {/* دکمه مشاهده جزئیات */}
                        <button
                          type="button"
                          onClick={() => openViewModal(post)}
                          className="btn-icon"
                          title="مشاهده جزئیات"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>

                        {/* دکمه ویرایش */}
                        <button
                          type="button"
                          onClick={() => openFormForEdit(post)}
                          className="btn-icon"
                          title="ویرایش"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                          </svg>
                        </button>

                        {/* دکمه حذف */}
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          className="btn-danger-icon"
                          title="حذف"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* مودال ایجاد و ویرایش */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>{editingPostId ? "ویرایش خبر یا مقاله" : "ایجاد خبر یا مقاله جدید"}</h2>
              <button type="button" onClick={closeForm} className="btn-close" aria-label="بستن">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid grid-3">
                <div className="grid-span-2">
                  <label className="form-label">
                    عنوان خبر یا مقاله <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="مثال: راهنمای جامع برنامه‌ریزی کنکور..."
                    value={formData.title}
                    onChange={(e) => updateFormField("title", e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">نوع محتوا</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => updateFormField("type", e.target.value as "article" | "news")}
                  >
                    <option value="article">مقاله آموزشی</option>
                    <option value="news">خبر مهم</option>
                  </select>
                </div>
              </div>

              <div className="form-grid grid-3">
                <div>
                  <label className="form-label">تاریخ و ساعت انتشار</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.publishedAt}
                    onChange={(e) => updateFormField("publishedAt", e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">زمان انقضا (اختیاری)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.expiresAt}
                    onChange={(e) => updateFormField("expiresAt", e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">تصویر شاخص</label>
                  <div className="file-upload-wrapper">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="file-input-custom"
                    />
                  </div>
                </div>
              </div>

              {/* نمایش زنده پیش‌نمایش تصویر در داخل فرم ادمین */}
              {formData.attachment && (
                <div className="preview-image">
                  <img src={formData.attachment} alt="پیش‌نمایش تصویر شاخص" />
                </div>
              )}

              <div className="form-grid grid-2">
                <div className="target-box target-blue">
                  <div className="target-header">
                    <span className="target-title">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      محدوده استان‌ها
                    </span>

                    <label className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={formData.allProvinces}
                        onChange={(e) => updateFormField("allProvinces", e.target.checked)}
                      />
                      <span>همه استان‌ها</span>
                    </label>
                  </div>

                  {!formData.allProvinces && (
                    <div className="target-items-grid">
                      {provinces.map((province) => (
                        <label
                          key={province.id}
                          className={`checkbox-card ${
                            formData.provinceIds.includes(province.id) ? "active" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.provinceIds.includes(province.id)}
                            onChange={(e) => toggleProvince(province.id, e.target.checked)}
                          />
                          <span>{province.name || province.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="target-box target-purple">
                  <div className="target-header">
                    <span className="target-title">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                      مقاطع تحصیلی
                    </span>

                    <label className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={formData.allGrades}
                        onChange={(e) => updateFormField("allGrades", e.target.checked)}
                      />
                      <span>همه پایه‌ها</span>
                    </label>
                  </div>

                  {!formData.allGrades && (
                    <div className="target-items-grid">
                      {grades.map((grade) => (
                        <label
                          key={grade.id}
                          className={`checkbox-card ${
                            formData.gradeIds.includes(grade.id) ? "active" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.gradeIds.includes(grade.id)}
                            onChange={(e) => toggleGrade(grade.id, e.target.checked)}
                          />
                          <span>{grade.name || grade.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">
                  متن اصلی خبر یا مقاله <span className="required">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  className="form-textarea"
                  placeholder="محتوای کامل خود را به صورت دقیق بنویسید..."
                  value={formData.content}
                  onChange={(e) => updateFormField("content", e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeForm} className="btn-secondary">
                  انصراف
                </button>
                <button type="submit" className="btn-submit">
                  {editingPostId ? "ذخیره تغییرات" : "ثبت و انتشار محتوا"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال نمایش جزئیات و پیش‌نمایش محتوا */}
      {isViewOpen && selectedPost && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h2>پیش‌نمایش: {selectedPost.title}</h2>
              <button type="button" onClick={closeViewModal} className="btn-close" aria-label="بستن">
                &times;
              </button>
            </div>
            
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {selectedPost.attachment && (
                <div className="modal-preview-image">
                  <img 
                    src={selectedPost.attachment} 
                    alt={selectedPost.title} 
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <span className={`badge ${selectedPost.type === "news" ? "badge-warning" : "badge-primary"}`}>
                  {selectedPost.type === "news" ? "خبر" : "مقاله آموزشی"}
                </span>
                <span className="tag tag-gray">تاریخ انتشار: {formatDateTime(selectedPost.publishedAt)}</span>
                {selectedPost.expiresAt && (
                  <span className="tag tag-gray">انقضا: {formatDateTime(selectedPost.expiresAt)}</span>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "15px" }}>
                <h4 style={{ marginBottom: "10px" }}>محتوای متنی:</h4>
                <p style={{ lineHeight: "1.8", whiteSpace: "pre-wrap", color: "var(--text)" }}>
                  {selectedPost.content}
                </p>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <Link 
                href={`/news/${selectedPost.id}`} 
                className="btn-submit" 
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}
                target="_blank"
              >
                👁 مشاهده در صفحه عمومی اخبار
              </Link>
              
              <button type="button" onClick={closeViewModal} className="btn-secondary">
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
