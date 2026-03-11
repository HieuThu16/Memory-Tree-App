"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") ?? "/";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState<"google" | "magic" | null>(null);

  const getSupabaseBrowser = () => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      setStatus({
        type: "error",
        message:
          "Thiếu cấu hình Supabase trên môi trường deploy. Hãy thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      });
      setLoading(null);
      return null;
    }
  };

  const getRedirectTo = () => {
    if (typeof window === "undefined") {
      return "";
    }

    const next = redirectedFrom.startsWith("/") ? redirectedFrom : "/";
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next,
    )}`;
  };

  const handleGoogle = async () => {
    setStatus(null);
    setLoading("google");

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectTo(),
      },
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(null);
    }
  };

  const handleMagicLink = async () => {
    if (!email || !email.includes("@")) {
      setStatus({ type: "error", message: "Vui lòng nhập email hợp lệ." });
      return;
    }

    setStatus(null);
    setLoading("magic");

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectTo(),
      },
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({
        type: "success",
        message: "Đã gửi Magic Link. Vui lòng kiểm tra email của bạn.",
      });
    }

    setLoading(null);
  };

  return (
    <div className="glass-card w-full max-w-md rounded-3xl p-8 shadow-[var(--shadow-card)] mx-auto mt-20">
      <div className="flex flex-col items-center justify-center mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
          Memory Tree
        </p>
        <h1 className="mt-3 text-3xl font-medium text-foreground text-center">
          Đăng nhập
        </h1>
        <p className="mt-2 text-sm text-text-muted text-center max-w-xs">
          Kết nối bằng Google hoặc nhận magic link để vào khu vườn kỷ niệm của
          bạn.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading !== null}
          className="btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading === "google" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-white"></span>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-current"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          {loading === "google"
            ? "Đang chuyển hướng..."
            : "Đăng nhập với Google"}
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink-0 mx-4 text-xs tracking-widest uppercase text-text-muted">
            Hoặc
          </span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="magic-email"
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted pl-1"
            >
              Email của bạn
            </label>
            <input
              id="magic-email"
              type="email"
              autoComplete="email"
              placeholder="ten@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-field"
            />
          </div>
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading !== null}
            className="btn-secondary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading === "magic" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-white"></span>
            ) : null}
            {loading === "magic" ? "Đang gửi..." : "Gửi Magic Link ✨"}
          </button>
        </div>
      </div>

      {status ? (
        <div
          className={`mt-6 rounded-2xl p-4 text-[13px] text-center font-medium ${
            status.type === "error"
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}
          role="status"
        >
          {status.message}
        </div>
      ) : authError ? (
        <div
          className="mt-6 rounded-2xl p-4 text-[13px] text-center font-medium bg-red-500/10 text-red-400 border border-red-500/20"
          role="status"
        >
          Đăng nhập thất bại. Vui lòng thử lại.
        </div>
      ) : null}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="glass-card mx-auto mt-20 w-full max-w-md rounded-3xl p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-sm text-text-secondary">Đang tải đăng nhập...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
