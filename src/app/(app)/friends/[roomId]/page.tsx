import { notFound } from "next/navigation";
import {
  getCurrentUser,
  getRoomInviteCode,
  getRoomParticipants,
} from "@/lib/supabase/queries/rooms";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoomMemories } from "@/lib/supabase/queries/memories";
import RealtimeRoomProvider from "@/components/realtime/RealtimeRoomProvider";
import LiveCursor from "@/components/realtime/LiveCursor";

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

  const { data: member, error: memberError } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !member) {
    return notFound();
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, name, created_by, shared_playlist_url, expires_at, created_at")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return notFound();
  }

  const [memories, participants] = await Promise.all([
    getRoomMemories(roomId),
    getRoomParticipants(roomId),
  ]);
  const inviteCode = await getRoomInviteCode(roomId);
  const roomRecord = {
    ...room,
    invite_code: inviteCode,
  };

  const friendParticipant = participants.find(
    (participant) => participant.userId !== user.id,
  );

  return (
    <>
      <RealtimeRoomProvider roomId={roomId} user={user} />
      <LiveCursor />

      <main className="relative h-dvh w-full overflow-hidden">
        {/* Fixed Background Tree */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img 
            src="/new_tree.png" 
            alt="" 
            className="w-full h-full object-cover opacity-20 blur-[2px]" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white/80" />
        </div>

        <section className="relative z-10 flex h-full w-full flex-col">
          <RoomClientSection
            memories={memories}
            roomId={roomId}
            participants={participants}
            currentUserId={user.id}
          />
        </section>
      </main>
    </>
  );
}

import RoomClientSection from "./RoomClientSection";
