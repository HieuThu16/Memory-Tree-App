import type {
  RealtimePostgresChangesPayload,
  Session,
} from "@supabase/supabase-js";
import * as ExpoLinking from "expo-linking";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { mobileSupabase, updateSessionCache } from "./lib/supabase";
import { parseAuthCallback } from "./lib/authCallback";
import { loadStoredSession, saveSession } from "./lib/secureSession";
import LoginScreen from "./screens/LoginScreen";
import TrackingStatusScreen from "./screens/TrackingStatusScreen";
import { reverseGeocodePoint } from "./services/addressing";
import {
  isTrackingEnabled,
  startBackgroundTracking,
  stopBackgroundTracking,
} from "./services/backgroundLocation";
import {
  initializeLocalNotifications,
  notifyFriendLocationUpdate,
} from "./services/localNotifications";
import { fetchGlobalFriendships, GlobalFriendshipProfile } from "./services/friendships";

type MobileRoomSummary = {
  id: string;
  name: string;
  inviteCode: string | null;
  sharedPlaylistUrl: string | null;
  memberCount: number;
};

type MobileRoomMember = {
  roomId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

type MobileProfile = {
  displayName: string;
  avatarUrl: string | null;
  lastSyncedAt: string | null;
};

type MobileCurrentLocation = {
  roomId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updatedAt: string;
  address: string | null;
};

type MobileSavedLocation = {
  id: string;
  roomId: string;
  userId: string;
  label: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  address: string | null;
};

type MobileLocationHistory = {
  id: string;
  userId: string;
  roomId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
  address: string | null;
};

type MobileFriendLocation = {
  roomId: string;
  roomName: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  updatedAt: string | null;
  address: string | null;
};

type MobileRealtimeNotice = {
  id: string;
  message: string;
  createdAt: string;
};

type MobileUserContext = {
  session: Session;
  roomIds: string[];
  rooms: MobileRoomSummary[];
  profile: MobileProfile;
  currentLocation: MobileCurrentLocation | null;
  savedLocations: MobileSavedLocation[];
  friendLocations: MobileFriendLocation[];
  locationHistory: MobileLocationHistory[];
  latestRealtimeNotice: MobileRealtimeNotice | null;
  trackingEnabled: boolean;
  savingLocation: boolean;
  syncing: boolean;
  statusMessage: string | null;
  globalFriendProfiles: GlobalFriendshipProfile[];
};

type UserLocationRow = {
  user_id: string;
  room_id: string;
  updated_at: string;
  lat: number;
  lng: number;
  accuracy: number | null;
};

type MembershipRow = {
  room_id: string;
};

type RoomInviteRow = {
  room_id: string;
  code: string | null;
};

type RoomMemberRow = {
  room_id: string;
  user_id: string;
};

type RoomRow = {
  id: string;
  name: string | null;
  shared_playlist_url: string | null;
};

type MemberProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [rooms, setRooms] = useState<MobileRoomSummary[]>([]);
  const [roomMembers, setRoomMembers] = useState<MobileRoomMember[]>([]);
  const [profile, setProfile] = useState<MobileProfile>({
    displayName: "Memory Keeper",
    avatarUrl: null,
    lastSyncedAt: null,
  });
  const [currentLocation, setCurrentLocation] =
    useState<MobileCurrentLocation | null>(null);
  const [savedLocations, setSavedLocations] = useState<MobileSavedLocation[]>(
    [],
  );
  const [friendLocations, setFriendLocations] = useState<
    MobileFriendLocation[]
  >([]);
  const [globalFriendProfiles, setGlobalFriendProfiles] = useState<GlobalFriendshipProfile[]>([]);
  const [locationHistory, setLocationHistory] = useState<
    MobileLocationHistory[]
  >([]);
  const [latestRealtimeNotice, setLatestRealtimeNotice] =
    useState<MobileRealtimeNotice | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const lastRealtimeNoticeKeyRef = useRef<string | null>(null);

  const refreshSavedLocations = useCallback(async (roomIdsToLoad: string[]) => {
    if (!roomIdsToLoad.length) {
      setSavedLocations([]);
      return;
    }

    const { data, error } = await mobileSupabase
      .from("saved_locations")
      .select("id, room_id, user_id, lat, lng, label, created_at")
      .in("room_id", roomIdsToLoad)
      .order("created_at", { ascending: false });

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    const hydratedLocations = await Promise.all(
      (data ?? []).map(async (item) => ({
        id: item.id,
        roomId: item.room_id,
        userId: item.user_id,
        label: item.label,
        latitude: item.lat,
        longitude: item.lng,
        createdAt: item.created_at,
        address: await reverseGeocodePoint({
          latitude: item.lat,
          longitude: item.lng,
        }),
      })),
    );

    setSavedLocations(hydratedLocations);
  }, []);

  const refreshLocationHistory = useCallback(
    async (roomIdsToLoad: string[]) => {
      if (!roomIdsToLoad.length) {
        setLocationHistory([]);
        return;
      }

      const { data, error } = await mobileSupabase
        .from("location_history")
        .select("id, user_id, room_id, lat, lng, recorded_at")
        .in("room_id", roomIdsToLoad)
        .order("recorded_at", { ascending: false })
        .limit(100);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      const hydratedHistory = (data ?? []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        roomId: item.room_id,
        latitude: item.lat,
        longitude: item.lng,
        recordedAt: item.recorded_at,
        address: null, // Reverse geocoding for history might be too heavy for list, fetch on demand or leave null
      }));

      setLocationHistory(hydratedHistory);
    },
    [],
  );

  const refreshRoomContext = useCallback(
    async (activeSession: Session) => {
      const [
        { data: profileData },
        { data: memberships, error: membershipError },
      ] = await Promise.all([
        mobileSupabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", activeSession.user.id)
          .maybeSingle(),
        mobileSupabase
          .from("room_members")
          .select("room_id")
          .eq("user_id", activeSession.user.id),
      ]);

      const nextDisplayName =
        profileData?.display_name ??
        activeSession.user.user_metadata?.full_name ??
        activeSession.user.email?.split("@")[0] ??
        "Memory Keeper";

      setProfile((current) => ({
        ...current,
        displayName: nextDisplayName,
        avatarUrl:
          profileData?.avatar_url ??
          activeSession.user.user_metadata?.avatar_url ??
          null,
      }));

      if (membershipError) {
        setStatusMessage(membershipError.message);
        return;
      }

      const membershipRows = (memberships ?? []) as MembershipRow[];

      const uniqueRoomIds = [
        ...new Set(membershipRows.map((item) => item.room_id)),
      ];
      setRoomIds(uniqueRoomIds);

      if (!uniqueRoomIds.length) {
        setRooms([]);
        setRoomMembers([]);
        setCurrentLocation(null);
        setSavedLocations([]);
        setFriendLocations([]);
        setGlobalFriendProfiles([]);
        setProfile((current) => ({ ...current, lastSyncedAt: null }));
        return;
      }

      const [roomsResult, invitesResult, membersResult, locationsResult] =
        await Promise.all([
          mobileSupabase
            .from("rooms")
            .select("id, name, shared_playlist_url")
            .in("id", uniqueRoomIds),
          mobileSupabase
            .from("room_invites")
            .select("room_id, code")
            .in("room_id", uniqueRoomIds)
            .eq("is_active", true),
          mobileSupabase
            .from("room_members")
            .select("room_id, user_id")
            .in("room_id", uniqueRoomIds),
          mobileSupabase
            .from("user_locations")
            .select("user_id, room_id, updated_at, lat, lng, accuracy")
            .in("room_id", uniqueRoomIds)
            .order("updated_at", { ascending: false })
            .limit(200),
        ]);

      if (roomsResult.error) {
        setStatusMessage(roomsResult.error.message);
        return;
      }

      const roomRows = (roomsResult.data ?? []) as RoomRow[];
      const inviteRows = (invitesResult.data ?? []) as RoomInviteRow[];
      const memberRows = (membersResult.data ?? []) as RoomMemberRow[];
      const locationRows = (locationsResult.data ?? []) as UserLocationRow[];

      const memberIds = [
        ...new Set(memberRows.map((member) => member.user_id)),
      ];
      const { data: memberProfiles, error: memberProfilesError } =
        memberIds.length
          ? await mobileSupabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .in("id", memberIds)
          : { data: [], error: null };

      if (memberProfilesError) {
        setStatusMessage(memberProfilesError.message);
      }

      const memberProfileRows = (memberProfiles ?? []) as MemberProfileRow[];

      const memberProfileById = new Map(
        memberProfileRows.map((item) => [
          item.id,
          {
            displayName: item.display_name,
            avatarUrl: item.avatar_url,
          },
        ]),
      );

      const inviteCodeByRoomId = new Map(
        inviteRows.map((invite) => [invite.room_id, invite.code]),
      );
      const memberCountByRoomId = new Map<string, number>();

      memberRows.forEach((member) => {
        memberCountByRoomId.set(
          member.room_id,
          (memberCountByRoomId.get(member.room_id) ?? 0) + 1,
        );
      });

      const nextRooms = roomRows
        .map((room) => ({
          id: room.id,
          name: room.name ?? "Memory Room",
          inviteCode: inviteCodeByRoomId.get(room.id) ?? null,
          sharedPlaylistUrl: room.shared_playlist_url ?? null,
          memberCount: memberCountByRoomId.get(room.id) ?? 1,
        }))
        .sort((left, right) => left.name.localeCompare(right.name, "vi"));

      setRooms(nextRooms);

      const roomNameById = new Map(
        nextRooms.map((room) => [room.id, room.name]),
      );

      setRoomMembers(
        memberRows.map((member) => {
          const memberProfile = memberProfileById.get(member.user_id);
          return {
            roomId: member.room_id,
            userId: member.user_id,
            displayName:
              memberProfile?.displayName ??
              (member.user_id === activeSession.user.id
                ? nextDisplayName
                : `Thành viên ${member.user_id.slice(0, 6)}`),
            avatarUrl: memberProfile?.avatarUrl ?? null,
          };
        }),
      );

      const latestOwnLocation = locationRows.find(
        (item) => item.user_id === activeSession.user.id,
      );

      setProfile((current) => ({
        ...current,
        lastSyncedAt: latestOwnLocation?.updated_at ?? null,
      }));

      if (latestOwnLocation) {
        setCurrentLocation({
          roomId: latestOwnLocation.room_id,
          latitude: latestOwnLocation.lat,
          longitude: latestOwnLocation.lng,
          accuracy: latestOwnLocation.accuracy ?? null,
          updatedAt: latestOwnLocation.updated_at,
          address: await reverseGeocodePoint({
            latitude: latestOwnLocation.lat,
            longitude: latestOwnLocation.lng,
          }),
        });
      } else {
        setCurrentLocation(null);
      }

      const nextFriendLocations = await Promise.all(
        memberRows
          .filter((member) => member.user_id !== activeSession.user.id)
          .map(async (member) => {
            const memberProfile = memberProfileById.get(member.user_id);
            const location = locationRows.find((loc) => loc.user_id === member.user_id && loc.room_id === member.room_id) || locationRows.find((loc) => loc.user_id === member.user_id);
            
            return {
              roomId: member.room_id,
              roomName: roomNameById.get(member.room_id) ?? "Memory Room",
              userId: member.user_id,
              displayName:
                memberProfile?.displayName ??
                `Thành viên ${member.user_id.slice(0, 6)}`,
              avatarUrl: memberProfile?.avatarUrl ?? null,
              latitude: location?.lat ?? null,
              longitude: location?.lng ?? null,
              accuracy: location?.accuracy ?? null,
              updatedAt: location?.updated_at ?? null,
              address: location ? await reverseGeocodePoint({
                latitude: location.lat,
                longitude: location.lng,
              }) : null,
            };
          }),
      );

      setFriendLocations(nextFriendLocations);
      const friendsData = await fetchGlobalFriendships(activeSession.user.id);
      setGlobalFriendProfiles(friendsData);

      await Promise.all([
        refreshSavedLocations(uniqueRoomIds),
        refreshLocationHistory(uniqueRoomIds),
      ]);
    },
    [refreshSavedLocations, refreshLocationHistory],
  );

  const handleIncomingUrl = useCallback(async (url: string) => {
    const callback = parseAuthCallback(url);

    if (!callback) {
      return;
    }

    if (callback.type === "code") {
      const { error } = await mobileSupabase.auth.exchangeCodeForSession(
        callback.code,
      );
      if (error) {
        setStatusMessage(error.message);
      }
      return;
    }

    const { data, error } = await mobileSupabase.auth.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken,
    });

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    if (data.session) {
      setStatusMessage(null);
      setSession(data.session);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const initialUrl = await ExpoLinking.getInitialURL();
      if (initialUrl) {
        await handleIncomingUrl(initialUrl);
      }

      const storedSession = await loadStoredSession();
      if (!mounted || !storedSession) {
        setSyncing(false);
        return;
      }

      updateSessionCache(storedSession);
      const { data, error } = await mobileSupabase.auth.setSession({
        access_token: storedSession.access_token,
        refresh_token: storedSession.refresh_token,
      });

      if (error || !data.session) {
        await saveSession(null);
        updateSessionCache(null);
        setSyncing(false);
        return;
      }

      setSession(data.session);
      await refreshRoomContext(data.session);
      setTrackingEnabled(await isTrackingEnabled());
      setSyncing(false);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = mobileSupabase.auth.onAuthStateChange(async (_event, nextSession) => {
      updateSessionCache(nextSession);
      await saveSession(nextSession);
      setSession(nextSession);

      if (nextSession) {
        await refreshRoomContext(nextSession);
        setTrackingEnabled(await isTrackingEnabled());
      } else {
        setRoomIds([]);
        setRooms([]);
        setRoomMembers([]);
        setCurrentLocation(null);
        setSavedLocations([]);
        setFriendLocations([]);
        setGlobalFriendProfiles([]);
        setLatestRealtimeNotice(null);
        setTrackingEnabled(false);
      }
    });

    const urlListener = ExpoLinking.addEventListener("url", ({ url }) => {
      void handleIncomingUrl(url);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      urlListener.remove();
    };
  }, [handleIncomingUrl, refreshRoomContext]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void initializeLocalNotifications();
  }, [session]);

  useEffect(() => {
    if (!session || !roomIds.length) {
      return;
    }

    const activeRoomIds = new Set(roomIds);
    const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));
    const memberNameById = new Map(
      roomMembers.map((member) => [member.userId, member.displayName]),
    );

    const handleLocationChange = (
      payload: RealtimePostgresChangesPayload<{
        room_id: string;
        user_id: string;
        updated_at: string;
      }>,
    ) => {
      const nextRow = payload.new as Partial<{
        room_id: string;
        user_id: string;
        updated_at: string;
      }>;
      const previousRow = payload.old as Partial<{
        room_id: string;
        user_id: string;
        updated_at: string;
      }>;
      const roomId = nextRow.room_id ?? previousRow.room_id;

      if (!roomId || !activeRoomIds.has(roomId)) {
        return;
      }

      void refreshRoomContext(session);

      if (payload.eventType === "DELETE") {
        return;
      }

      const changedUserId = nextRow.user_id;
      if (!changedUserId || changedUserId === session.user.id) {
        return;
      }

      const updatedAt = nextRow.updated_at ?? new Date().toISOString();
      const noticeKey = `${payload.eventType}:${roomId}:${changedUserId}:${updatedAt}`;

      if (lastRealtimeNoticeKeyRef.current === noticeKey) {
        return;
      }

      lastRealtimeNoticeKeyRef.current = noticeKey;
      const friendName = memberNameById.get(changedUserId) ?? "Bạn cùng room";
      const roomName = roomNameById.get(roomId) ?? "Memory Room";
      const nextNotice = {
        id: noticeKey,
        message: `${friendName} vừa cập nhật vị trí ở ${roomName}.`,
        createdAt: updatedAt,
      };

      setLatestRealtimeNotice(nextNotice);
      void notifyFriendLocationUpdate({ friendName, roomName });
    };

    const handleSavedLocationChange = (
      payload: RealtimePostgresChangesPayload<{
        room_id: string;
      }>,
    ) => {
      const nextRow = payload.new as Partial<{
        room_id: string;
      }>;
      const previousRow = payload.old as Partial<{
        room_id: string;
      }>;
      const roomId = nextRow.room_id ?? previousRow.room_id;

      if (!roomId || !activeRoomIds.has(roomId)) {
        return;
      }

      void refreshSavedLocations(roomIds);
    };

    const channel = mobileSupabase
      .channel(
        `mobile-room-sync:${session.user.id}:${[...roomIds].sort().join(",")}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_locations",
        },
        handleLocationChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_locations",
        },
        handleSavedLocationChange,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setStatusMessage("Không thể kết nối realtime room trên mobile.");
        }
      });

    return () => {
      void mobileSupabase.removeChannel(channel);
    };
  }, [
    refreshRoomContext,
    refreshSavedLocations,
    roomIds,
    roomMembers,
    rooms,
    session,
  ]);

  const context = useMemo<MobileUserContext | null>(() => {
    if (!session) {
      return null;
    }

    return {
      session,
      roomIds,
      rooms,
      profile,
      currentLocation,
      savedLocations,
      friendLocations,
      locationHistory,
      latestRealtimeNotice,
      trackingEnabled,
      savingLocation,
      syncing,
      statusMessage,
      globalFriendProfiles,
    };
  }, [
    currentLocation,
    friendLocations,
    locationHistory,
    latestRealtimeNotice,
    profile,
    roomIds,
    rooms,
    savedLocations,
    savingLocation,
    session,
    statusMessage,
    syncing,
    trackingEnabled,
    globalFriendProfiles,
  ]);

  const handleStart = async () => {
    if (!session) {
      return;
    }

    setSyncing(true);
    setStatusMessage(null);

    try {
      await startBackgroundTracking({
        userId: session.user.id,
        roomIds,
      });
      await refreshRoomContext(session);
      setTrackingEnabled(true);
      setStatusMessage("Đã bật background tracking trên thiết bị này.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Không thể bật background tracking.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleStop = async () => {
    setSyncing(true);
    setStatusMessage(null);

    try {
      await stopBackgroundTracking();
      if (session) {
        await refreshRoomContext(session);
      }
      setTrackingEnabled(false);
      setStatusMessage("Đã tắt background tracking trên thiết bị này.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Không thể tắt background tracking.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshRooms = async () => {
    if (!session) {
      return;
    }

    setSyncing(true);
    await refreshRoomContext(session);
    setSyncing(false);
  };

  const handleSignOut = async () => {
    try {
      await stopBackgroundTracking();
    } catch {
      // noop
    }
    await mobileSupabase.auth.signOut();
    await saveSession(null);
    updateSessionCache(null);
    setSession(null);
    setRoomIds([]);
    setRooms([]);
    setRoomMembers([]);
    setCurrentLocation(null);
    setSavedLocations([]);
    setFriendLocations([]);
    setLatestRealtimeNotice(null);
    setTrackingEnabled(false);
    setStatusMessage(null);
  };

  const handleSaveLocation = async (label: string, roomId: string) => {
    if (!session || !currentLocation) {
      setStatusMessage("Chưa có vị trí nào để lưu.");
      return;
    }

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setStatusMessage("Nhập tên địa điểm trước khi lưu.");
      return;
    }

    setSavingLocation(true);
    setStatusMessage(null);

    try {
      const { data, error } = await mobileSupabase
        .from("saved_locations")
        .insert({
          room_id: roomId,
          user_id: session.user.id,
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
          label: trimmedLabel,
        })
        .select("id, room_id, user_id, lat, lng, label, created_at")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Không thể lưu địa điểm.");
      }

      setSavedLocations((current) => [
        {
          id: data.id,
          roomId: data.room_id,
          userId: data.user_id,
          label: data.label,
          latitude: data.lat,
          longitude: data.lng,
          createdAt: data.created_at,
          address:
            currentLocation.address ??
            `Tọa độ ${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
        },
        ...current,
      ]);
      setStatusMessage("Đã lưu địa điểm này vào room.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Không thể lưu địa điểm.",
      );
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeleteSavedLocation = async (id: string) => {
    if (!session) return;

    setStatusMessage(null);
    const { error } = await mobileSupabase
      .from("saved_locations")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      setStatusMessage(error.message);
    } else {
      setSavedLocations((curr) => curr.filter((l) => l.id !== id));
      setStatusMessage("Đã xóa địa điểm.");
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: "#05101c" }}>
        {context ? (
          <TrackingStatusScreen
            profile={{
              user: context.session.user,
              displayName: context.profile.displayName,
              avatarUrl: context.profile.avatarUrl,
              currentLocation: context.currentLocation,
              rooms: context.rooms,
              roomIds: context.roomIds,
              savedLocations: context.savedLocations,
              friendLocations: context.friendLocations,
              locationHistory: context.locationHistory,
              latestRealtimeNotice: context.latestRealtimeNotice,
              lastSyncedAt: context.profile.lastSyncedAt,
              trackingEnabled: context.trackingEnabled,
              savingLocation: context.savingLocation,
              syncing: context.syncing,
              statusMessage: context.statusMessage,
              globalFriendProfiles: context.globalFriendProfiles,
            }}
            onStart={handleStart}
            onStop={handleStop}
            onRefreshRooms={handleRefreshRooms}
            onSaveLocation={handleSaveLocation}
            onDeleteSavedLocation={handleDeleteSavedLocation}
            onSignOut={handleSignOut}
          />
        ) : (
          <LoginScreen supabase={mobileSupabase} />
        )}
      </View>
    </SafeAreaProvider>
  );
}
