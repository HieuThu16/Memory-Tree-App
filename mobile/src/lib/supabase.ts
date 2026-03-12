import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import { secureSessionStorage } from "./secureSession";

const fallbackUrl = "https://xhgpxtuzocqqqgsdfqig.supabase.co";
const fallbackAnonKey = "sb_publishable_5EExnaFkAHKHEEcwrHF3tg_adJeIbiW";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? fallbackUrl;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fallbackAnonKey;

export const mobileSupabase = createClient(url, anonKey, {
  auth: {
    storage: secureSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "memory-tree-mobile",
  },
});

export function updateSessionCache(_session?: Session | null) {
  void _session;
}
