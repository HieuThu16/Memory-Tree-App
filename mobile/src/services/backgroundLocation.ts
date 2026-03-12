import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { clearLiveLocation, syncLocationPoint } from "./locationSync";

const LOCATION_TASK_NAME = "memory-tree-background-location";
const TRACKING_IDENTITY_KEY = "memory-tree-tracking-identity";

export type TrackingIdentity = {
  userId: string;
  roomIds: string[];
};

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      return;
    }

    const currentIdentity = await loadTrackingIdentity();
    const locations =
      (data as { locations?: Location.LocationObject[] } | undefined)
        ?.locations ?? [];

    if (!currentIdentity || !locations.length) {
      return;
    }

    await Promise.allSettled(
      locations.map((location) =>
        syncLocationPoint(
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? null,
            heading: location.coords.heading ?? null,
            speed: location.coords.speed ?? null,
            timestamp: location.timestamp,
          },
          currentIdentity,
        ),
      ),
    );
  });
}

export async function configureBackgroundLocation(identity: TrackingIdentity) {
  await saveTrackingIdentity(identity);

  const foregroundPermission =
    await Location.requestForegroundPermissionsAsync();
  if (foregroundPermission.status !== "granted") {
    throw new Error("Chua duoc cap quyen vi tri foreground.");
  }

  const backgroundPermission =
    await Location.requestBackgroundPermissionsAsync();
  if (backgroundPermission.status !== "granted") {
    throw new Error("Chua duoc cap quyen vi tri background.");
  }
}

export async function startBackgroundTracking(identity: TrackingIdentity) {
  await configureBackgroundLocation(identity);

  const currentPosition = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
  });

  await syncLocationPoint(
    {
      latitude: currentPosition.coords.latitude,
      longitude: currentPosition.coords.longitude,
      accuracy: currentPosition.coords.accuracy ?? null,
      heading: currentPosition.coords.heading ?? null,
      speed: currentPosition.coords.speed ?? null,
      timestamp: currentPosition.timestamp,
    },
    identity,
  );

  const alreadyStarted =
    await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

  if (!alreadyStarted) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Highest,
      activityType: Location.ActivityType.Fitness,
      deferredUpdatesDistance: 0,
      deferredUpdatesInterval: 0,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: "Memory Tree dang chia se vi tri",
        notificationBody: "Ung dung dang dong bo vi tri nen cho room chung.",
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      timeInterval: 60000,
    });
  }
}

export async function stopBackgroundTracking() {
  const identity = await loadTrackingIdentity();

  const alreadyStarted =
    await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

  if (alreadyStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }

  if (identity) {
    await clearLiveLocation(identity);
  }

  await AsyncStorage.removeItem(TRACKING_IDENTITY_KEY);
}

export async function isTrackingEnabled() {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function loadTrackingIdentity(): Promise<TrackingIdentity | null> {
  const value = await AsyncStorage.getItem(TRACKING_IDENTITY_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as TrackingIdentity;
  } catch {
    await AsyncStorage.removeItem(TRACKING_IDENTITY_KEY);
    return null;
  }
}

async function saveTrackingIdentity(identity: TrackingIdentity) {
  await AsyncStorage.setItem(TRACKING_IDENTITY_KEY, JSON.stringify(identity));
}
