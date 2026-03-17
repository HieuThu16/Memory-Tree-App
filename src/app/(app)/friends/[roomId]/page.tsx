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
import PresenceAvatars from "@/components/realtime/PresenceAvatars";
import InviteLinkButton from "@/components/room/InviteLinkButton";
import BackButton from "@/components/ui/BackButton";

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

      <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-4">
          {/* Room header - all on one row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BackButton href="/friends" className="text-[11px]" />
              <h1 className="flex items-center gap-1 truncate text-sm font-bold text-rose-900 sm:text-base">
                <span className="text-base">🌿</span>
                <span className="truncate">{room.name || "Khu vườn chung"}</span>
              </h1>
            </div>
            
            {/* Right side: avatars + stats + add + invite */}
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <PresenceAvatars />
              <InviteLinkButton inviteCode={roomRecord.invite_code} />
            </div>
          </div>

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
