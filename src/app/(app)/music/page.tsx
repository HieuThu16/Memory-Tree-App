import { getCurrentUser } from "@/lib/supabase/queries/rooms";
import { getUserRooms } from "@/lib/supabase/queries/rooms";
import { getRoomPlaylists } from "@/lib/supabase/queries/playlists";
import { redirect } from "next/navigation";
import MusicClientPage from "./MusicClientPage";

export const dynamic = "force-dynamic";

export default async function MusicPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rooms = await getUserRooms();
  const resolvedParams = await searchParams;
  const activeRoomId = resolvedParams.room ?? rooms[0]?.id ?? null;

  const initialPlaylists = activeRoomId
    ? await getRoomPlaylists(activeRoomId)
    : [];

  return (
    <MusicClientPage
      user={user}
      rooms={rooms}
      activeRoomId={activeRoomId}
      initialPlaylists={initialPlaylists}
    />
  );
}
