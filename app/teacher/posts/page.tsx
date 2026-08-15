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

interface UserData {
  id: string;
  name?: string;
  role?: "superadmin" | "admin" | "teacher" | "student";
  province?: string | string[];
  grade?: string | string[];
  provinceId?: string;
  provinceIds?: string[];
  gradeIds?: string[];
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
  authorId: string;
  authorName: string;
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
  allProvinces: false,
  provinceIds: [],
  allGrades: false,
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

function parseMultipleValues(value?: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  return String(value)
    .split(/[,\n،\-]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveAllowedItems<T extends { id: string; name?: string; title?: string }>(
  rawValues: unknown,
  items: T[]
): T[] {
  const values = parseMultipleValues(rawValues).map(normalizeText);

  if (values.length === 0) return items;

  const matched = items.filter((item) => {
    const id = normalizeText(item.id);
    const name = item.name ? normalizeText(item.name) : "";
    const title = item.title ? normalizeText(item.title) : "";

    return values.some((v) => v === id || v === name || v === title);
  });

  return matched.length > 0 ? matched : items;
}

export default function TeacherPostsPage() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [allowedProvinces, setAllowedProvinces] = useState<ProvinceItem[]>([]);
  const [allowedGrades, setAllowedGrades] = useState<GradeItem[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  const [formData, setFormData] = useState<FormDataState>(DEFAULT_FORM_DATA);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = currentUser?.role === "superadmin";

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

    const storedUser = localStorage.getItem("currentUser");
    let activeUser: UserData | null = null;

    if (storedUser) {
      try {
        activeUser = JSON.parse(storedUser);
      } catch (error) {
        console.error("Failed to parse currentUser", error);
      }
    }

    if (activeUser) {
      const usersRaw = localStorage.getItem("users");
      if (usersRaw) {
        try {
          const allUsers: UserData[] = JSON.parse(usersRaw);
          const matchedUser = allUsers.find((u) => u.id === activeUser?.id);
          if (matchedUser) {
            activeUser = { ...activeUser, ...matchedUser };
          }
        } catch (error) {
          console.error("Failed to parse users", error);
        }
      }
    }

    setCurrentUser(activeUser);

    const savedPosts = readJson<PostItem[]>(["demo_posts"], []);
    const allProvinces = readJson<ProvinceItem[]>(
      ["admin_provinces", "provinces"],
      FALLBACK_PROVINCES
    );
    const allGrades = readJson<GradeItem[]>(
      ["admin_grades", "grades"],
      FALLBACK_GRADES
    );

    setPosts(savedPosts);
    setProvinces(allProvinces);
    setGrades(allGrades);

    if (activeUser?.role === "superadmin") {
      setAllowedProvinces(allProvinces);
      setAllowedGrades(allGrades);
      return;
    }

    const provinceValues =
      activeUser?.provinceIds && activeUser.provinceIds.length > 0
        ? activeUser.provinceIds
        : activeUser?.provinceId
        ? [activeUser.provinceId]
        : activeUser?.province;

    const gradeValues =
      activeUser?.gradeIds && activeUser.gradeIds.length > 0
        ? activeUser.gradeIds
        : activeUser?.grade;

    const resolvedProvinces = resolveAllowedItems(provinceValues, allProvinces);
    const resolvedGrades = resolveAllowedItems(gradeValues, allGrades);

    setAllowedProvinces(resolvedProvinces);
    setAllowedGrades(resolvedGrades);
  }, []);

  const savePostsToLocalStorage = (nextPosts: PostItem[]) => {
    localStorage.setItem("demo_posts", JSON.stringify(nextPosts));
    setPosts(nextPosts);
  };

  const resetForm = () => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      allProvinces: false,
      provinceIds: isSuperAdmin
        ? provinces.map((p) => p.id)
        : allowedProvinces.map((p) => p.id),
      allGrades: false,
      gradeIds: isSuperAdmin
        ? grades.map((g) => g.id)
        : allowedGrades.map((g) => g.id),
    });

    setEditingPostId(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFormForCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const canManagePost = (post: PostItem) => {
    return post.authorId === currentUser?.id || isSuperAdmin;
  };

  const openFormForEdit = (post: PostItem) => {
    if (!canManagePost(post)) {
      alert("شما فقط مجاز به ویرایش اخبار و مقالات ایجاد شده توسط خودتان هستید.");
      return;
    }

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
      const newPost: PostItem = {
        ...formData,
        id: Date.now().toString(),
        createdAt: now,
        publishedAt: formData.publishedAt || now,
        authorId: currentUser?.id || "unknown_teacher",
        authorName: currentUser?.name || "دبیر",
      };

      savePostsToLocalStorage([newPost, ...posts]);
    }

    closeForm();
  };

  const deletePost = (post: PostItem) => {
    if (!canManagePost(post)) {
      alert("شما فقط مجاز به حذف اخبار و مقالات ایجاد شده توسط خودتان هستید.");
      return;
    }

    const confirmed = window.confirm("آیا از حذف این خبر/مقاله اطمینان دارید؟");
    if (!confirmed) return;

    savePostsToLocalStorage(posts.filter((p) => p.id !== post.id));
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
        ? Array.from(new Set([...prev.provinceIds, provinceId]))
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
        ? Array.from(new Set([...prev.gradeIds, gradeId]))
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
          <h1>مدیریت اخبار و مقالات دبیر</h1>
          <p>ارسال و مدیریت محتوای آموزشی برای استان و پایه‌های تحصیلی شما</p>
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
          افزودن خبر / مقاله جدید
        </button>
      </header>

      <section className="table-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>تصویر</th>
                <th>عنوان و نوع</th>
                <th>نویسنده</th>
                <th>هدف‌گذاری</th>
                <th>تاریخ انتشار</th>
                <th className="text-center">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    هنوز هیچ خبر یا مقاله‌ای ثبت نشده است.
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const isOwner = canManagePost(post);

                  return (
                    <tr key={post.id}>
                      <td className="w-media">
                        <div className="media-preview-container">
                          {post.attachment ? (
                            <img
                              src={post.attachment}
                              alt="کاور"
                              className="media-preview"
                            />
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
                          {post.type === "news" ? "خبر" : "مقاله"}
                        </span>
                      </td>

                      <td>
                        <span className="author-label">
                          {post.authorName || "ثبت شده توسط مدیریت"}
                        </span>
                        {post.authorId === currentUser?.id && (
                          <span className="owner-badge"> (شما)</span>
                        )}
                      </td>

                      <td>
                        <div className="targets-wrapper">
                          <span
                            className={`tag ${
                              post.allProvinces ? "tag-green" : "tag-gray"
                            }`}
                          >
                            {renderTargetCount(
                              post.allProvinces,
                              post.provinceIds,
                              "استان"
                            )}
                          </span>
                          <span
                            className={`tag ${
                              post.allGrades ? "tag-purple" : "tag-gray"
                            }`}
                          >
                            {renderTargetCount(post.allGrades, post.gradeIds, "پایه")}
                          </span>
                        </div>
                      </td>

                      <td className="date-cell">
                        {formatDateTime(post.publishedAt)}
                      </td>

                      <td className="text-center">
                        <div className="actions-cell">
                          <button
                            type="button"
                            onClick={() => openViewModal(post)}
                            className="btn-icon"
                            title="مشاهده"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => openFormForEdit(post)}
                            className={`btn-icon ${!isOwner ? "btn-disabled" : ""}`}
                            title={isOwner ? "ویرایش" : "غیر قابل ویرایش"}
                            disabled={!isOwner}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => deletePost(post)}
                            className={`btn-danger-icon ${!isOwner ? "btn-disabled" : ""}`}
                            title={isOwner ? "حذف" : "غیر قابل حذف"}
                            disabled={!isOwner}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

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
                    عنوان محتوا <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="مثال: روش‌های یادگیری بهتر درس ریاضی..."
                    value={formData.title}
                    onChange={(e) => updateFormField("title", e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">نوع محتوا</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) =>
                      updateFormField("type", e.target.value as "article" | "news")
                    }
                  >
                    <option value="article">مقاله آموزشی</option>
                    <option value="news">خبر مهم</option>
                  </select>
                </div>
              </div>

              <div className="form-grid grid-3">
                <div>
                  <label className="form-label">تاریخ انتشار</label>
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

              {formData.attachment && (
                <div className="preview-image">
                  <img src={formData.attachment} alt="پیش‌نمایش" />
                </div>
              )}

              <div className="form-grid grid-2">
                <div className="target-box target-blue">
                  <div className="target-header">
                    <span className="target-title">محدوده استان‌ها</span>
                  </div>

                  <div className="target-items-grid">
                    {allowedProvinces.map((province) => (
                      <label
                        key={province.id}
                        className={`checkbox-card ${
                          formData.provinceIds.includes(province.id) ? "active" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.provinceIds.includes(province.id)}
                          onChange={(e) =>
                            toggleProvince(province.id, e.target.checked)
                          }
                        />
                        <span>{province.name || province.title}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="target-box target-purple">
                  <div className="target-header">
                    <span className="target-title">مقاطع تحصیلی</span>
                  </div>

                  <div className="target-items-grid">
                    {allowedGrades.map((grade) => (
                      <label
                        key={grade.id}
                        className={`checkbox-card ${
                          formData.gradeIds.includes(grade.id) ? "active" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.gradeIds.includes(grade.id)}
                          onChange={(e) =>
                            toggleGrade(grade.id, e.target.checked)
                          }
                        />
                        <span>{grade.name || grade.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">
                  متن محتوا <span className="required">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  className="form-textarea"
                  value={formData.content}
                  onChange={(e) => updateFormField("content", e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeForm} className="btn-secondary">
                  انصراف
                </button>
                <button type="submit" className="btn-submit">
                  {editingPostId ? "ذخیره تغییرات" : "ثبت و انتشار"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewOpen && selectedPost && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h2>پیش‌نمایش: {selectedPost.title}</h2>
              <button
                type="button"
                onClick={closeViewModal}
                className="btn-close"
                aria-label="بستن"
              >
                &times;
              </button>
            </div>

            <div
              className="modal-body"
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {selectedPost.attachment && (
                <div className="modal-preview-image">
                  <img
                    src={selectedPost.attachment}
                    alt={selectedPost.title}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <span
                  className={`badge ${
                    selectedPost.type === "news" ? "badge-warning" : "badge-primary"
                  }`}
                >
                  {selectedPost.type === "news" ? "خبر" : "مقاله"}
                </span>

                <span className="tag tag-gray">
                  نویسنده: {selectedPost.authorName || "مدیریت"}
                </span>

                <span className="tag tag-gray">
                  انتشار: {formatDateTime(selectedPost.publishedAt)}
                </span>

                {selectedPost.expiresAt && (
                  <span className="tag tag-gray">
                    انقضا: {formatDateTime(selectedPost.expiresAt)}
                  </span>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "15px" }}>
                <h4 style={{ marginBottom: "10px" }}>محتوای متنی:</h4>
                <p style={{ lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
                  {selectedPost.content}
                </p>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <Link
                href={`/news/${selectedPost.id}`}
                className="btn-submit"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                target="_blank"
              >
                👁 مشاهده در صفحه عمومی اخبار
              </Link>

              <button type="button" onClick={closeViewModal} className="btn-secondary">
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
