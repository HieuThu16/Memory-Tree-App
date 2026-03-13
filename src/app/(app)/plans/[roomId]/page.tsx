import { notFound, redirect } from "next/navigation";
import {
  getCurrentUser,
  getRoomInviteCode,
  getRoomParticipants,
  getUserRooms,
} from "@/lib/supabase/queries/rooms";
import { getRoomPlans } from "@/lib/supabase/queries/plans";
import RoomPlansBoard from "@/components/room/RoomPlansBoard";
import BackButton from "@/components/ui/BackButton";

export const dynamic = "force-dynamic";

export default async function PlansRoomPage({
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

  const rooms = await getUserRooms();
  const room = rooms.find((item) => item.id === roomId) ?? null;

  if (!room) {
    redirect("/plans");
  }

  const [participants, plans] = await Promise.all([
    getRoomParticipants(roomId),
    getRoomPlans(roomId),
  ]);
  const inviteCode = await getRoomInviteCode(roomId);

  const participantsByUserId = new Map(
    participants.map(
      (participant) => [participant.userId, participant] as const,
    ),
  );

  return (
    <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <BackButton href="/plans" className="text-[11px]" />
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                  ✅ {room.name || "Phòng chung"}
                </h1>
                <p className="mt-1 text-[10px] text-text-muted">
                  Mã phòng:{" "}
                  <span className="font-mono">{inviteCode ?? "------"}</span>
                </p>
              </div>
            </div>
            <span className="rounded-full border border-border bg-white/80 px-3 py-1 text-[10px] font-semibold text-text-secondary">
              {plans.length} dự định
            </span>
          </div>
        </div>

        <RoomPlansBoard
          roomId={roomId}
          currentUserId={user.id}
          initialPlans={plans}
          participantsByUserId={participantsByUserId}
        />
      </section>
    </main>
  );
}
