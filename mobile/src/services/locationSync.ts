import AsyncStorage from "@react-native-async-storage/async-storage";
import { mobileSupabase } from "../lib/supabase";

const LIVE_UPDATE_DISTANCE_METERS = 10;
const HISTORY_DISTANCE_METERS = 15;
const HISTORY_INTERVAL_MS = 5 * 60 * 1000;
const HISTORY_STATE_KEY = "memory-tree-history-state";

type TrackingIdentity = {
  userId: string;
  roomIds: string[];
};

type HistoryState = {
  lat: number;
  lng: number;
  recordedAt: number;
} | null;

export type SyncLocationPoint = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number | string;
};

export async function syncLocationPoint(
  point: SyncLocationPoint,
  identity: TrackingIdentity,
) {
  if (!identity.roomIds.length) {
    return;
  }

  const pointTimestamp = new Date(point.timestamp).getTime();

  if (Number.isNaN(pointTimestamp)) {
    return;
  }

  const updatedAt = new Date(pointTimestamp).toISOString();

  await Promise.allSettled(
    identity.roomIds.map((roomId) =>
      mobileSupabase.from("user_locations").upsert(
        {
          user_id: identity.userId,
          room_id: roomId,
          lat: point.latitude,
          lng: point.longitude,
          accuracy: point.accuracy,
          heading: point.heading,
          speed: point.speed,
          updated_at: updatedAt,
        },
        { onConflict: "user_id,room_id" },
      ),
    ),
  );

  const historyState = await loadHistoryState();
  const movedEnough =
    !historyState ||
    getDistanceMeters(
      historyState.lat,
      historyState.lng,
      point.latitude,
      point.longitude,
    ) >= HISTORY_DISTANCE_METERS;
  const waitedEnough =
    !historyState ||
    pointTimestamp - historyState.recordedAt >= HISTORY_INTERVAL_MS;

  if (!movedEnough || !waitedEnough) {
    return;
  }

  await Promise.allSettled(
    identity.roomIds.map((roomId) =>
      mobileSupabase.from("location_history").insert({
        user_id: identity.userId,
        room_id: roomId,
        lat: point.latitude,
        lng: point.longitude,
        recorded_at: updatedAt,
      }),
    ),
  );

  await saveHistoryState({
    lat: point.latitude,
    lng: point.longitude,
    recordedAt: pointTimestamp,
  });
}

export async function clearLiveLocation(identity: TrackingIdentity) {
  if (!identity.roomIds.length) {
    return;
  }

  await mobileSupabase
    .from("user_locations")
    .delete()
    .eq("user_id", identity.userId)
    .in("room_id", identity.roomIds);
}

async function loadHistoryState(): Promise<HistoryState> {
  const value = await AsyncStorage.getItem(HISTORY_STATE_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as HistoryState;
  } catch {
    await AsyncStorage.removeItem(HISTORY_STATE_KEY);
    return null;
  }
}

async function saveHistoryState(state: Exclude<HistoryState, null>) {
  await AsyncStorage.setItem(HISTORY_STATE_KEY, JSON.stringify(state));
}

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const startLat = toRadians(lat1);
  const endLat = toRadians(lat2);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) ** 2;

  return (
    earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export { LIVE_UPDATE_DISTANCE_METERS };
