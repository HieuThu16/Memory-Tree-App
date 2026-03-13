import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, getUserRooms } from "@/lib/supabase/queries/rooms";
import PlansRoomList from "@/components/room/PlansRoomList";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const rooms = await getUserRooms();

  if (!rooms.length) {
    return (
      <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4">
        <section className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <h1 className="text-base font-semibold text-foreground">Dự định</h1>
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

  const roomIds = rooms.map((room) => room.id);
  const supabase = await createSupabaseServerClient();
  const { data: plansRows, error: plansError } = await supabase
    .from("room_plans")
    .select("room_id")
    .in("room_id", roomIds);

  const planCountByRoomId = new Map<string, number>();

  if (!plansError) {
    for (const row of plansRows ?? []) {
      const roomId = row.room_id as string;
      planCountByRoomId.set(roomId, (planCountByRoomId.get(roomId) ?? 0) + 1);
    }
  }

  return (
    <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <h1 className="text-base font-semibold text-foreground">Dự định</h1>
          <p className="mt-1 text-xs text-text-secondary">
            Chọn phòng để mở bảng dự định chi tiết.
          </p>
          {plansError ? (
            <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              Chưa tải được dữ liệu dự định. Vui lòng kiểm tra migration
              `room_plans`.
            </p>
          ) : null}
        </div>

        <PlansRoomList
          rooms={rooms.map((room) => ({
            id: room.id,
            name: room.name,
            plansCount: planCountByRoomId.get(room.id) ?? 0,
          }))}
        />
      </section>
    </main>
  );
}
