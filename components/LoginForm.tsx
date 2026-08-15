"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  username: z.string().min(3, "نام کاربری باید حداقل 3 کاراکتر باشد"),
  password: z.string().min(6, "رمز عبور باید حداقل 6 کاراکتر باشد"),
  role: z.enum(["student", "teacher", "admin"]),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const redirectMap: Record<LoginFormValues["role"], string> = {
  student: "/student",
  teacher: "/teacher",
  admin: "/admin",
};

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "student",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setServerError(result.message || "ورود ناموفق بود");
        return;
      }

      router.push(redirectMap[data.role]);
      router.refresh();
    } catch {
      setServerError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-header">
          <h1>ورود به سفینه</h1>
          <p>برای ادامه وارد حساب کاربری خود شوید</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="field">
            <label htmlFor="username">نام کاربری</label>
            <input
              id="username"
              type="text"
              placeholder="مثلا admin"
              {...register("username")}
            />
            {errors.username && (
              <span className="error">{errors.username.message}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">رمز عبور</label>
            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="رمز عبور"
                {...register("password")}
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "مخفی کردن رمز" : "نمایش رمز"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.password && (
              <span className="error">{errors.password.message}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="role">نقش</label>
            <select id="role" {...register("role")}>
              <option value="student">دانش‌آموز</option>
              <option value="teacher">همکار</option>
              <option value="admin">ادمین</option>
            </select>
            {errors.role && <span className="error">{errors.role.message}</span>}
          </div>

          {serverError && <div className="server-error">{serverError}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "در حال ورود..." : "ورود"}
          </button>
        </form>
      </div>
    </div>
  );
}
