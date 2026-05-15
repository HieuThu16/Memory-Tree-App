import { redirect } from "next/navigation";
import MusicClientPage from "./MusicClientPage";
import { getCurrentUser, getUserRooms } from "@/lib/supabase/queries/rooms";
import { getLocalMusicTracks } from "@/lib/music/localTracks";

export const dynamic = "force-dynamic";

export default async function MusicPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [rooms, tracks] = await Promise.all([
    getUserRooms(),
    getLocalMusicTracks(),
  ]);

  return (
    <MusicClientPage
      user={user}
      rooms={rooms}
      tracks={tracks}
    />
  );
}
