import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { Platform } from "react-native";

const SESSION_KEY = "memory-tree-mobile-session";

type WebStorageLike = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

function getWebStorage(): WebStorageLike | null {
  const storageCandidate = (globalThis as { localStorage?: WebStorageLike })
    .localStorage;

  if (Platform.OS !== "web" || !storageCandidate) {
    return null;
  }

  return storageCandidate;
}

async function getItemAsync(key: string) {
  const webStorage = getWebStorage();
  if (webStorage) {
    return webStorage.getItem(key);
  }

  return AsyncStorage.getItem(key);
}

async function setItemAsync(key: string, value: string) {
  const webStorage = getWebStorage();
  if (webStorage) {
    await webStorage.setItem(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

async function removeItemAsync(key: string) {
  const webStorage = getWebStorage();
  if (webStorage) {
    await webStorage.removeItem(key);
    return;
  }

  await AsyncStorage.removeItem(key);
}

export const secureSessionStorage = {
  getItem: (key: string) => getItemAsync(key),
  setItem: (key: string, value: string) => setItemAsync(key, value),
  removeItem: (key: string) => removeItemAsync(key),
};

export async function saveSession(session: Session | null) {
  if (!session) {
    await removeItemAsync(SESSION_KEY);
    return;
  }

  await setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function loadStoredSession(): Promise<Session | null> {
  const value = await getItemAsync(SESSION_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Session;
  } catch {
    await removeItemAsync(SESSION_KEY);
    return null;
  }
}
