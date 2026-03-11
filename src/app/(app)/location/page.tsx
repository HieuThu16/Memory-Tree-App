import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, getRoomParticipants } from "@/lib/supabase/queries/rooms";
import { redirect } from "next/navigation";
import LocationClientPage from "./LocationClientPage";

export const dynamic = "force-dynamic";

export default async function LocationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();

  // Get first room the user is a member of
  const { data: memberRows } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const roomId = memberRows?.room_id ?? null;
  let participants: Awaited<ReturnType<typeof getRoomParticipants>> = [];

  console.log("=== THÔNG TIN SERVER LOCATION ===");
  console.log("user_id:", user.id);
  console.log("room_id lấy được:", roomId);
  
  if (roomId) {
    participants = await getRoomParticipants(roomId);
    console.log("các participants từ room_id:", participants);
  } else {
    console.log("Không có room_id nào được tìm thấy cho user này!");
  }

  return (
    <LocationClientPage
      user={user}
      roomId={roomId}
      participants={participants}
    />
  );
}
