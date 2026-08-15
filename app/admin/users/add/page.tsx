'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Grade {
  id: string;
  name: string;
}

interface Province {
  id: string;
  name: string;
}

interface UserPermissions {
  viewProvinceStudents: boolean;
  myCourses: boolean;
  questionBank: boolean;
  examManagement: boolean;
  tickets: boolean;
  posts: boolean; // اضافه شدن دسترسی جدید
}

const permissionLabels: Record<keyof UserPermissions, string> = {
  viewProvinceStudents: 'مشاهده دانش آموزان استان',
  myCourses: 'دوره های من',
  questionBank: 'بانک سوالات',
  examManagement: 'مدیریت آزمون',
  tickets: 'تیکت',
  posts: 'اخبار و مقالات', // اضافه شدن برچسب فارسی دسترسی جدید
};

export default function AddUserPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    phone: '',
    username: '',
    password: '',
    role: 'student',
    grade: '',
    province: '',
    avatar: '',
  });

  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);

  const [permissions, setPermissions] = useState<UserPermissions>({
    viewProvinceStudents: false,
    myCourses: false,
    questionBank: false,
    examManagement: false,
    tickets: false,
    posts: false, // مقداردهی اولیه دسترسی جدید
  });

  const [gradesList, setGradesList] = useState<Grade[]>([]);
  const [provincesList, setProvincesList] = useState<Province[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const loadedGrades = localStorage.getItem('grades');
    if (loadedGrades) setGradesList(JSON.parse(loadedGrades));

    const loadedProvinces = localStorage.getItem('provinces');
    if (loadedProvinces) setProvincesList(JSON.parse(loadedProvinces));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSelection = (
    item: string,
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentList.includes(item)) {
      setList(currentList.filter((i) => i !== item));
    } else {
      setList([...currentList, item]);
    }
  };

  const handlePermissionToggle = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setFormData((prev) => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.username || !formData.password) {
      alert('لطفاً فیلدهای ضروری را پر کنید.');
      return;
    }

    if (formData.username.includes(' ')) {
      alert('نام کاربری نباید شامل فاصله باشد.');
      return;
    }

    const existingUsers = localStorage.getItem('users');
    let usersList: any[] = [];

    if (existingUsers) {
      try {
        usersList = JSON.parse(existingUsers);
      } catch (err) {
        usersList = [];
      }
    }

    const isDuplicate = usersList.some(
      (u: any) =>
        u.username?.toLowerCase() === formData.username.trim().toLowerCase()
    );

    if (isDuplicate) {
      alert('این نام کاربری قبلاً در سیستم ثبت شده است.');
      return;
    }

    let finalGrades: string[] = [];
    let finalProvinces: string[] = [];

    if (formData.role === 'teacher' || formData.role === 'admin') {
      finalGrades = selectedGrades;
      finalProvinces = selectedProvinces;
    } else if (formData.role === 'superadmin') {
      finalGrades = ['همه پایه‌ها'];
      finalProvinces = ['کشوری - تمام استان‌ها'];
    } else {
      finalGrades = formData.grade ? [formData.grade] : [];
      finalProvinces = formData.province ? [formData.province] : [];
    }

    const shouldSavePermissions =
      formData.role === 'teacher' || formData.role === 'admin';

    const newUser = {
      id: Date.now().toString(),
      name: formData.fullName,
      username: formData.username.trim().toLowerCase(),
      password: formData.password.trim(),
      phone: formData.phone.trim(),
      nationalId: formData.nationalId.trim(),
      email: formData.phone
        ? `${formData.phone.trim()}@phone.com`
        : `${formData.username.trim().toLowerCase()}@system.com`,
      role: formData.role,
      status: 'active',
      grade: finalGrades,
      province: finalProvinces,
      permissions: shouldSavePermissions ? permissions : null,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      avatar: formData.avatar,
    };

    usersList.unshift(newUser);
    localStorage.setItem('users', JSON.stringify(usersList));
    window.dispatchEvent(new Event('storage'));

    alert('کاربر جدید با موفقیت ثبت شد!');
    router.push('/admin/users');
  };

  const isMultiSelectRole =
    formData.role === 'teacher' || formData.role === 'admin';

  const showPermissionsPanel =
    formData.role === 'teacher' || formData.role === 'admin';

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>✨ ثبت کاربر جدید</h2>

        <form onSubmit={handleSubmit}>
          <div style={avatarSectionStyle}>
            <label htmlFor="avatarInput" style={avatarLabelStyle}>
              <div style={avatarCircleStyle}>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="پیش‌نمایش"
                    style={avatarImageStyle}
                  />
                ) : (
                  <span style={{ fontSize: '32px', filter: 'grayscale(1)' }}>
                    📷
                  </span>
                )}
              </div>
              <span style={avatarTextStyle}>انتخاب تصویر پروفایل</span>
            </label>
            <input
              id="avatarInput"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </div>

          <div style={formGridStyle}>
            <div style={fieldGroup}>
              <label style={labelStyle}>نام کامل *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="مثلا: علی محمدی"
                style={inputStyle}
                required
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>نقش کاربر</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={selectStyle}
              >
                <option value="student" style={optionStyle}>
                  🎓 دانش‌آموز
                </option>
                <option value="teacher" style={optionStyle}>
                  👨‍🏫 همکار آموزشی (دبیر)
                </option>
                
                <option value="superadmin" style={optionStyle}>
                  👑 مدیر کل (دسترسی نامحدود)
                </option>
              </select>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>نام کاربری *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="مثلا: alimohammadi"
                style={inputStyle}
                required
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>رمز عبور *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                style={inputStyle}
                required
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>کد ملی</label>
              <input
                type="text"
                name="nationalId"
                value={formData.nationalId}
                onChange={handleChange}
                placeholder="۱۰ رقم کد ملی"
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>شماره تماس</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                style={inputStyle}
              />
            </div>
          </div>

          {formData.role !== 'superadmin' && (
            <div style={doubleGridStyle}>
              <div style={fieldGroup}>
                <label style={labelStyle}>
                  📚 {isMultiSelectRole ? 'انتخاب پایه‌های مجاز' : 'پایه تحصیلی'}
                </label>
                {isMultiSelectRole ? (
                  <div style={multiSelectBox}>
                    {gradesList.map((g) => {
                      const isSelected = selectedGrades.includes(g.name);
                      return (
                        <div
                          key={g.id}
                          onClick={() =>
                            toggleSelection(
                              g.name,
                              selectedGrades,
                              setSelectedGrades
                            )
                          }
                          style={{
                            ...chipStyle,
                            backgroundColor: isSelected
                              ? 'var(--accent-soft)'
                              : 'var(--surface-1)',
                            color: isSelected
                              ? 'var(--accent-primary)'
                              : 'var(--text-main)',
                            borderColor: isSelected
                              ? 'var(--accent-primary)'
                              : 'var(--border-soft)',
                          }}
                        >
                          {g.name}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="" style={optionStyle}>
                      انتخاب پایه...
                    </option>
                    {gradesList.map((g) => (
                      <option key={g.id} value={g.name} style={optionStyle}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>
                  📍 {isMultiSelectRole ? 'انتخاب استان‌های مجاز' : 'استان محل سکونت'}
                </label>
                {isMultiSelectRole ? (
                  <div style={multiSelectBox}>
                    {provincesList.map((p) => {
                      const isSelected = selectedProvinces.includes(p.name);
                      return (
                        <div
                          key={p.id}
                          onClick={() =>
                            toggleSelection(
                              p.name,
                              selectedProvinces,
                              setSelectedProvinces
                            )
                          }
                          style={{
                            ...chipStyle,
                            backgroundColor: isSelected
                              ? 'var(--success-soft)'
                              : 'var(--surface-1)',
                            color: isSelected
                              ? 'var(--success-color)'
                              : 'var(--text-main)',
                            borderColor: isSelected
                              ? 'var(--success-color)'
                              : 'var(--border-soft)',
                          }}
                        >
                          {p.name}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <select
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="" style={optionStyle}>
                      انتخاب استان...
                    </option>
                    {provincesList.map((p) => (
                      <option key={p.id} value={p.name} style={optionStyle}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {formData.role === 'superadmin' && (
            <div style={superadminNoticeStyle}>
              ℹ️ مدیر کل به تمامی پایه‌ها و تمامی استان‌ها دسترسی کامل دارد.
            </div>
          )}

          {showPermissionsPanel && (
            <div style={permissionsPanelStyle}>
              <h3 style={permissionsTitleStyle}>🔐 تنظیم سطوح دسترسی</h3>
              <div style={permissionsGridStyle}>
                {Object.entries(permissionLabels).map(([key, label]) => (
                  <div key={key} style={toggleRowStyle}>
                    <span style={toggleTextStyle}>{label}</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={permissions[key as keyof UserPermissions]}
                        onChange={() =>
                          handlePermissionToggle(key as keyof UserPermissions)
                        }
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={actionsStyle}>
            <button
              type="button"
              onClick={() => router.back()}
              style={btnSecondary}
            >
              انصراف
            </button>
            <button type="submit" style={btnPrimary}>
              ثبت نهایی کاربر
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 22px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: var(--border-soft);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 34px;
          border: 1px solid transparent;
        }

        .slider:before {
          position: absolute;
          content: '';
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 2px;
          background-color: white;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input:checked + .slider {
          background-color: #0070f3;
          box-shadow: 0 0 10px rgba(0, 112, 243, 0.5);
          border-color: rgba(255, 255, 255, 0.1);
        }

        input:checked + .slider:before {
          transform: translateX(22px);
          background-color: #ffffff;
        }

        div[style*='justify-content: space-between']:hover {
          border-color: #0070f3 !important;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }

        select option {
          background-color: var(--surface-1, #ffffff) !important;
          color: var(--text-main, #111111) !important;
        }

        select:focus option {
          background-color: var(--surface-2, #f5f5f5);
          color: var(--text-main, #111111);
        }

        select {
          background-color: #ffffff !important;
          color: #111111 !important;
        }

        select option {
          background-color: #ffffff !important;
          color: #111111 !important;
        }

        :global(.dark) select {
          background-color: #1e1e2e !important;
          color: #f3f4f6 !important;
        }

        :global(.dark) select option {
          background-color: #1e1e2e !important;
          color: #f3f4f6 !important;
        }

        @media (prefers-color-scheme: dark) {
          select option {
            background-color: #1e1e2e;
            color: #f3f4f6;
          }
        }
      `}</style>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: '960px',
  margin: '20px auto',
  padding: '0 20px',
  fontFamily: 'var(--font-base)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-soft)',
  borderRadius: '24px',
  padding: '40px',
  boxShadow: 'var(--shadow-strong)',
  color: 'var(--text-main)',
  backdropFilter: 'blur(10px)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '800',
  marginBottom: '32px',
  textAlign: 'center',
  color: 'var(--text-main)',
};

const avatarSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: '32px',
};

const avatarLabelStyle: React.CSSProperties = {
  cursor: 'pointer',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
};

const avatarCircleStyle: React.CSSProperties = {
  width: '100px',
  height: '100px',
  borderRadius: '30px',
  border: '2px dashed var(--border-soft)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  background: 'var(--surface-2)',
  transition: 'all 0.3s ease',
};

const avatarImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const avatarTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-muted)',
  fontWeight: '500',
};

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '24px',
  marginBottom: '24px',
};

const fieldGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: 'var(--text-soft)',
  marginRight: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid var(--border-soft)',
  background: 'var(--surface-2)',
  color: 'var(--text-main)',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s ease',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'var(--surface-2)',
  color: 'var(--text-main)',
};

const optionStyle: React.CSSProperties = {
  backgroundColor: 'inherit',
  color: 'inherit',
  padding: '12px',
};

const doubleGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '24px',
  padding: '24px 0',
  borderTop: '1px solid var(--border-soft)',
};

const multiSelectBox: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  padding: '12px',
  background: 'var(--surface-2)',
  borderRadius: '12px',
  border: '1px solid var(--border-soft)',
  minHeight: '52px',
};

const chipStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '10px',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  border: '1px solid transparent',
  transition: 'all 0.2s ease',
};

const permissionsPanelStyle: React.CSSProperties = {
  marginTop: '20px',
  padding: '24px',
  borderRadius: '16px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-soft)',
};

const permissionsTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '700',
  color: 'var(--text-main)',
  marginBottom: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const permissionsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '12px',
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  background: 'var(--surface-1)',
  border: '1px solid var(--border-soft)',
  borderRadius: '10px',
};

const toggleTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-soft)',
};

const superadminNoticeStyle: React.CSSProperties = {
  padding: '16px',
  borderRadius: '12px',
  background: 'var(--accent-soft)',
  color: 'var(--accent-primary)',
  fontSize: '13px',
  textAlign: 'center',
  marginTop: '10px',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  justifyContent: 'flex-end',
  marginTop: '40px',
  paddingTop: '20px',
  borderTop: '1px solid var(--border-soft)',
};

const btnPrimary: React.CSSProperties = {
  padding: '12px 32px',
  borderRadius: '12px',
  border: 'none',
  background: 'linear-gradient(135deg, var(--neon-blue) 0%, #4f46e5 100%)',
  color: '#ffffff',
  fontWeight: '700',
  cursor: 'pointer',
  boxShadow: '0 8px 20px rgba(79, 70, 229, 0.2)',
};

const btnSecondary: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: '12px',
  border: '1px solid var(--border-soft)',
  background: 'var(--surface-2)',
  color: 'var(--text-main)',
  fontWeight: '600',
  cursor: 'pointer',
};
