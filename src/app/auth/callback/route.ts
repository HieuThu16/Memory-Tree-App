import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

type SupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const { url, anonKey } = getSupabaseConfig();
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error.message);
      const errorUrl = new URL("/login", request.url);
      errorUrl.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(errorUrl);
    }
  }

  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, request.url));
}
