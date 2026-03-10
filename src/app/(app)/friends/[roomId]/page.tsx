import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/queries/rooms";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoomMemories } from "@/lib/supabase/queries/memories";
import MemoryTree from "@/components/tree/MemoryTree";
import MemoryList from "@/components/memory/MemoryList";
import RealtimeRoomProvider from "@/components/realtime/RealtimeRoomProvider";
import LiveCursor from "@/components/realtime/LiveCursor";
import PresenceAvatars from "@/components/realtime/PresenceAvatars";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const resolvedParams = await params;
  const roomId = resolvedParams.roomId;
  const user = await getCurrentUser();

  if (!user) {
    return notFound();
  }

  const supabase = await createSupabaseServerClient();

  // Verify membership
  const { data: member, error: memberError } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !member) {
    return notFound();
  }

  // Get room details
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return notFound();
  }

  const memories = await getRoomMemories(roomId);

  return (
    <>
      <RealtimeRoomProvider roomId={roomId} user={user} />
      <LiveCursor />

      <main className="px-6 pb-24 pt-8">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <header className="flex flex-col gap-4 animate-fade-in-up">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted">
                  Khu vườn chung
                </p>
                <h1 className="mt-2 text-3xl text-foreground md:text-4xl">
                  {room.name || "Khu vườn chưa đặt tên"}
                </h1>
                <p className="mt-2 font-mono text-sm tracking-[0.2em] text-accent">
                  Mã mời: {room.invite_code}
                </p>
              </div>
              <PresenceAvatars />
            </div>
          </header>

          <RoomClientSection memories={memories} roomId={roomId} />
        </section>
      </main>
    </>
  );
}

// Extract interactive parts to a client component
import RoomClientSection from "./RoomClientSection";
