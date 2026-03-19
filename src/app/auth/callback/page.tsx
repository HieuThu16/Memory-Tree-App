"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";
  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");

  useEffect(() => {
    if (authError) {
      router.replace("/login?error=auth_callback_failed");
      return;
    }

    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    const redirectToTarget = () => {
      if (!cancelled) {
        router.replace(safeNext);
      }
    };

    const redirectToLoginError = () => {
      if (!cancelled) {
        router.replace("/login?error=auth_callback_failed");
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        session
      ) {
        redirectToTarget();
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          redirectToLoginError();
          return;
        }
        if (data.session) {
          redirectToTarget();
        }
      })
      .catch(() => {
        redirectToLoginError();
      });

    const timeoutId = window.setTimeout(async () => {
      if (cancelled) return;

      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          redirectToTarget();
          return;
        }
      } catch {
        // Fall through to login error below.
      }

      redirectToLoginError();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [authError, router, safeNext]);

  return (
    <main className="px-4 py-16">
      <div className="glass-card mx-auto flex w-full max-w-md flex-col items-center rounded-3xl p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
        <h1 className="text-xl font-semibold text-foreground">Đang xác thực</h1>
        <p className="mt-2 text-sm text-text-muted">
          Memory Tree đang hoàn tất đăng nhập cho bạn...
        </p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-16">
          <div className="glass-card mx-auto flex w-full max-w-md flex-col items-center rounded-3xl p-8 text-center shadow-[var(--shadow-card)]">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
            <p className="text-sm text-text-muted">Đang tải xác thực...</p>
          </div>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
