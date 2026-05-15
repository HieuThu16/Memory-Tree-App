import { notFound } from "next/navigation";
import { getCurrentUser, getRoomParticipants } from "@/lib/supabase/queries/rooms";
import { getMemoryById } from "@/lib/supabase/queries/memories";
import MemoryDetailClient from "./MemoryDetailClient";

export const dynamic = "force-dynamic";

export default async function MemoryDetailPage({
  params,
}: {
  params: Promise<{
    roomId: string;
    year: string;
    month: string;
    memoryId: string;
  }>;
}) {
  const resolvedParams = await params;
  const { roomId, year, month, memoryId } = resolvedParams;
  const user = await getCurrentUser();

  if (!user) {
    return notFound();
  }

  const memory = await getMemoryById(memoryId);
  const participants = await getRoomParticipants(roomId);

  if (!memory) {
    return notFound();
  }

  const targetYear = parseInt(year, 10);
  const targetMonth = parseInt(month, 10);

  return (
    <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto w-full max-w-2xl">
        <MemoryDetailClient
          memory={memory}
          roomId={roomId}
          year={targetYear}
          month={targetMonth}
          currentUserId={user.id}
          participants={participants}
        />
      </div>
    </main>
  );
}
