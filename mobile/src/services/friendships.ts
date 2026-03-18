import { mobileSupabase } from "../lib/supabase";

export type GlobalFriendshipProfile = {
  id: string; // Friendship ID, null if not friends
  userId: string; // The other user's ID
  displayName: string;
  avatarUrl: string | null;
  status: "pending" | "accepted" | "none";
  direction: "sent" | "received" | "friend" | "none";
  createdAt: string | null;
  lastLocation?: {
    lat: number;
    lng: number;
    updatedAt: string; // Or recordedAt
  } | null;
};

export async function fetchGlobalFriendships(currentUserId: string): Promise<GlobalFriendshipProfile[]> {
  const { data: friendships, error: fError } = await mobileSupabase
    .from("global_friendships")
    .select("id, sender_id, receiver_id, status, created_at")
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

  const { data: profiles, error: pError } = await mobileSupabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .neq("id", currentUserId);

  if (fError || pError) {
    console.warn("Error fetching friendships", fError, pError);
    return [];
  }

  // Find accepted friends to fetch their locations
  const acceptedFriendIds = (friendships ?? [])
    .filter(f => f.status === "accepted")
    .map(f => f.sender_id === currentUserId ? f.receiver_id : f.sender_id);

  let recentLocations: Record<string, any> = {};
  if (acceptedFriendIds.length > 0) {
    // Only get the most recent location per user in an active room
    const { data: locData } = await mobileSupabase
      .from("user_locations")
      .select("user_id, lat, lng, updated_at")
      .in("user_id", acceptedFriendIds)
      .order("updated_at", { ascending: false });
    
    // Pick first occurrence (most recent) per user
    if (locData) {
      locData.forEach(loc => {
        if (!recentLocations[loc.user_id]) recentLocations[loc.user_id] = loc;
      });
    }
  }

  const friendshipProfiles: GlobalFriendshipProfile[] = [];
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
  const existingFriendshipUserIds = new Set<string>();

  for (const f of (friendships ?? [])) {
    const isSender = f.sender_id === currentUserId;
    const otherId = isSender ? f.receiver_id : f.sender_id;
    const profile = profileMap.get(otherId);

    existingFriendshipUserIds.add(otherId);
    if (!profile) continue;

    friendshipProfiles.push({
      id: f.id,
      userId: profile.id,
      displayName: profile.display_name || "Trống",
      avatarUrl: profile.avatar_url,
      status: f.status as "pending" | "accepted",
      direction: f.status === "accepted" ? "friend" : isSender ? "sent" : "received",
      createdAt: f.created_at,
      lastLocation: recentLocations[profile.id] 
        ? { lat: recentLocations[profile.id].lat, lng: recentLocations[profile.id].lng, updatedAt: recentLocations[profile.id].updated_at } 
        : null,
    });
  }

  // Add "none" for all profiles who are not friends
  for (const p of (profiles ?? [])) {
    if (!existingFriendshipUserIds.has(p.id)) {
      friendshipProfiles.push({
        id: "",
        userId: p.id,
        displayName: p.display_name || "Trống",
        avatarUrl: p.avatar_url,
        status: "none",
        direction: "none",
        createdAt: null,
      });
    }
  }

  return friendshipProfiles;
}

export async function sendFriendRequest(receiverId: string, currentUserId: string) {
  return await mobileSupabase
    .from("global_friendships")
    .insert({
      sender_id: currentUserId,
      receiver_id: receiverId,
      status: "pending",
    });
}

export async function acceptFriendRequest(friendshipId: string, currentUserId: string) {
  return await mobileSupabase
    .from("global_friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .eq("receiver_id", currentUserId);
}

export async function cancelOrUnfriend(friendshipId: string, currentUserId: string) {
  return await mobileSupabase
    .from("global_friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
}
