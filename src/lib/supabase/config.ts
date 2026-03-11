const fallbackUrl = "https://xhgpxtuzocqqqgsdfqig.supabase.co";
const fallbackAnonKey = "sb_publishable_5EExnaFkAHKHEEcwrHF3tg_adJeIbiW";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fallbackUrl;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fallbackAnonKey;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase config: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
}
