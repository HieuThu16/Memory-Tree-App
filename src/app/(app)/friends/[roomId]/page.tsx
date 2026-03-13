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
import Link from "next/link";
import InviteLinkButton from "@/components/room/InviteLinkButton";

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
          {/* Compact inline header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href="/friends"
                prefetch={true}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-white/80 text-text-secondary transition hover:border-accent hover:text-accent"
                title="Quay lại"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                  🌿 {room.name || "Khu vườn chung"}
                </h1>
                <div className="flex items-center gap-1.5 text-[9px] text-text-muted">
                  <span className="font-mono tracking-wider">
                    {roomRecord.invite_code ?? "------"}
                  </span>
                  <span>•</span>
                  <span>{participants.length} 👥</span>
                </div>
                {friendParticipant ? (
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-text-secondary">
                    <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-white/80">
                      {friendParticipant.avatarUrl ? (
                        <img
                          src={friendParticipant.avatarUrl}
                          alt={friendParticipant.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[8px] font-semibold">
                          {friendParticipant.displayName
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span>
                      Bạn đang chung vườn với {friendParticipant.displayName}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1">
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
