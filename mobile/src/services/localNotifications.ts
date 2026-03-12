import Constants from "expo-constants";
import { Platform } from "react-native";

const LOCATION_CHANNEL_ID = "friend-location-updates";

let initialized = false;

function isExpoGo() {
  return Constants.executionEnvironment === "storeClient";
}

async function loadNotificationsModule() {
  if (isExpoGo()) {
    return null;
  }

  const Notifications = await import("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  return Notifications;
}

export async function initializeLocalNotifications() {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return false;
  }

  if (!initialized) {
    initialized = true;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(LOCATION_CHANNEL_ID, {
        name: "Friend location updates",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status === "granted") {
    return true;
  }

  const request = await Notifications.requestPermissionsAsync();
  return request.status === "granted";
}

export async function notifyFriendLocationUpdate({
  friendName,
  roomName,
}: {
  friendName: string;
  roomName: string;
}) {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return;
  }

  const granted = await initializeLocalNotifications();
  if (!granted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${friendName} vua cap nhat vi tri`,
      body: `${friendName} vua chia se vi tri moi trong room ${roomName}.`,
    },
    trigger: null,
  });
}
