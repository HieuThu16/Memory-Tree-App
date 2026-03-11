"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDistance } from "./distance";

const MIN_DISTANCE_TO_UPDATE = 10; // meters — update real-time
const MIN_DISTANCE_TO_RECORD = 20; // meters — save to history

export type LocationStatus =
  | "idle"
  | "requesting"
  | "tracking"
  | "error"
  | "denied";

export type CurrentLocation = {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
};

export function useLocationTracker(userId: string, roomId: string) {
  const supabase = createSupabaseBrowserClient();
  const lastUpdatedPos = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastRecordedPos = useRef<{ latitude: number; longitude: number } | null>(null);
  const watchId = useRef<number | null>(null);

  const [status, setStatus] = useState<LocationStatus>("idle");
  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePosition = useCallback(
    async (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy, heading, speed } =
        pos.coords;

      setCurrentLocation({
        lat,
        lng,
        accuracy,
        heading,
        speed,
        updatedAt: new Date().toISOString(),
      });

      // 1. Update real-time location (if moved >10m)
      const distUpdate = lastUpdatedPos.current
        ? getDistance(lastUpdatedPos.current, { latitude: lat, longitude: lng })
        : Infinity;

      if (distUpdate > MIN_DISTANCE_TO_UPDATE) {
        await supabase.from("user_locations").upsert(
          {
            user_id: userId,
            room_id: roomId,
            lat,
            lng,
            accuracy,
            heading,
            speed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,room_id" },
        );
        lastUpdatedPos.current = { latitude: lat, longitude: lng };
      }

      // 2. Record history (if moved >20m)
      const distRecord = lastRecordedPos.current
        ? getDistance(lastRecordedPos.current, { latitude: lat, longitude: lng })
        : Infinity;

      if (distRecord > MIN_DISTANCE_TO_RECORD) {
        await supabase.from("location_history").insert({
          user_id: userId,
          room_id: roomId,
          lat,
          lng,
          recorded_at: new Date().toISOString(),
        });
        lastRecordedPos.current = { latitude: lat, longitude: lng };
      }
    },
    [userId, roomId, supabase],
  );

  const handleError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setStatus("denied");
      setErrorMessage(
        "Bạn đã từ chối quyền vị trí. Vui lòng bật lại trong cài đặt trình duyệt.",
      );
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      setStatus("error");
      setErrorMessage("Không thể xác định vị trí của bạn.");
    } else {
      setStatus("error");
      setErrorMessage("Hết thời gian chờ GPS.");
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMessage("Trình duyệt không hỗ trợ GPS.");
      return;
    }

    setStatus("requesting");

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus("tracking");
        setErrorMessage(null);
        handlePosition(pos);
      },
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    );
  }, [handlePosition, handleError]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setStatus("idle");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return {
    status,
    currentLocation,
    errorMessage,
    startTracking,
    stopTracking,
  };
}
