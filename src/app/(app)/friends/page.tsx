import { getUserRooms } from "@/lib/supabase/queries/rooms";
import ClientFriendsSection from "./ClientFriendsSection";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const rooms = await getUserRooms();

  return (
    <main className="px-6 pb-24 pt-8">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-4 animate-fade-in-up">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
            Kết nối
          </p>
          <h1 className="text-4xl text-foreground md:text-5xl">
            Khu vườn chung
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-text-secondary md:text-base">
            Tạo không gian để cùng người thân, bạn bè nuôi cây kỷ niệm. Đồng bộ theo thời gian thực.
          </p>
        </header>

        <ClientFriendsSection initialRooms={rooms} />
      </section>
    </main>
  );
}
