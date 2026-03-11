import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

type SupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
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
          // Server components might not allow setting cookies.
        }
      },
    },
  });
}
