import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, getUserRooms } from "@/lib/supabase/queries/rooms";
import NatureParticles from "@/components/ui/NatureParticles";

export const dynamic = "force-dynamic";

export default async function CountdownPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const rooms = await getUserRooms();

  if (!rooms.length) {
    return (
      <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4 relative min-h-screen">
        <NatureParticles />
        <section className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4 relative z-10">
          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <h1 className="text-base font-semibold text-foreground">⏰ Đếm ngược</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Bạn chưa có phòng chung nào. Vào tab Bạn bè để tạo hoặc tham gia
              phòng.
            </p>
            <Link
              href="/friends"
              className="mt-3 inline-flex rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary"
            >
              Mở tab Bạn bè
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // Count countdowns per room
  const roomIds = rooms.map((room) => room.id);
  const supabase = await createSupabaseServerClient();
  const { data: countdownRows, error: countdownError } = await supabase
    .from("room_countdowns")
    .select("room_id")
    .in("room_id", roomIds);

  const countByRoomId = new Map<string, number>();
  if (!countdownError) {
    for (const row of countdownRows ?? []) {
      const roomId = row.room_id as string;
      countByRoomId.set(roomId, (countByRoomId.get(roomId) ?? 0) + 1);
    }
  }

  return (
    <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4 relative min-h-screen">
      <NatureParticles />
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4 relative z-10">
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <h1 className="text-base font-semibold text-foreground">⏰ Đếm ngược</h1>
          <p className="mt-1 text-xs text-text-secondary">
            Chọn phòng để xem và quản lý các ngày đếm ngược.
          </p>
          {countdownError && (
            <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              Chưa tải được dữ liệu. Vui lòng chạy migration.
            </p>
          )}
        </div>

        <CountdownRoomList
          rooms={rooms.map((room) => ({
            id: room.id,
            name: room.name,
            countdownCount: countByRoomId.get(room.id) ?? 0,
          }))}
        />
      </section>
    </main>
  );
}

import CountdownRoomList from "@/components/room/CountdownRoomList";
