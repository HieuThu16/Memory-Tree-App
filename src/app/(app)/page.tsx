import MemoryTree from "@/components/tree/MemoryTree";
import MemoryList from "@/components/memory/MemoryList";
import {
  getPersonalMemories,
  getMemoryStats,
} from "@/lib/supabase/queries/memories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [memories, stats] = await Promise.all([
    getPersonalMemories(),
    getMemoryStats(),
  ]);

  return (
    <main className="px-6 pb-24 pt-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-5 pt-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl text-foreground md:text-5xl lg:text-6xl animate-fade-in-up">
              Kỷ niệm lớn lên<br />
              <span className="bg-gradient-to-r from-accent to-gold bg-clip-text text-transparent">
                theo thời gian
              </span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-text-secondary md:text-base animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Hãy để Memory Tree lưu giữ những khoảnh khắc quý giá nhất.
              Mỗi nút trên cây là một câu chuyện, một cảm xúc có thể sống mãi.
            </p>
          </div>

          <div
            className="mt-4 flex gap-4 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="glass-card flex min-w-28 flex-col rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                Tổng cộng
              </span>
              <span className="stat-number mt-2">{stats.total}</span>
            </div>
            <div className="glass-card flex min-w-28 flex-col rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                Ảnh & Video
              </span>
              <span className="stat-number mt-2">
                {stats.photo + stats.video}
              </span>
            </div>
          </div>
        </header>

        <ClientSection memories={memories} />
      </section>
    </main>
  );
}

// Extract the tree and list to a client component to cleanly handle store interactions
import ClientSection from "./ClientSection";
