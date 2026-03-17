import {
  getPersonalMemories,
  getMemoryStats,
} from "@/lib/supabase/queries/memories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ClientSection from "../ClientSection";

export const dynamic = "force-dynamic";

export default async function PersonalPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [memories, stats] = await Promise.all([
    getPersonalMemories(),
    getMemoryStats(),
  ]);

  return (
    <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:gap-4">
        {/* Compact stats bar */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-semibold text-foreground sm:text-lg">
            đŸŒ³ CĂ¢y Ká»‰ Niá»‡m
          </h1>
          <div className="flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-text-secondary">
              đŸŒ¸ {stats.total}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-text-secondary">
              đŸ“· {stats.photo + stats.video}
            </span>
          </div>
        </div>

        <ClientSection memories={memories} currentUserId={user?.id ?? null} />
      </section>
    </main>
  );
}
