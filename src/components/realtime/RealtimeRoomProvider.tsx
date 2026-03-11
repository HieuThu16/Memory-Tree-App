"use client";

import { useEffect, useRef } from "react";
import { useRealtimeStore } from "@/lib/stores/realtimeStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PresenceUser = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

const isPresenceUser = (value: unknown): value is PresenceUser => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === "string" &&
    typeof candidate.displayName === "string" &&
    (typeof candidate.avatarUrl === "string" || candidate.avatarUrl === null)
  );
};

type BroadcastCursorPayload = {
  payload: {
    x: number;
    y: number;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export default function RealtimeRoomProvider({
  roomId,
  user,
}: {
  roomId: string;
  user: { id: string; displayName: string; avatarUrl: string | null };
}) {
  const setUsers = useRealtimeStore((s) => s.setUsers);
  const updateCursor = useRealtimeStore((s) => s.updateCursor);
  const removeCursor = useRealtimeStore((s) => s.removeCursor);
  const frameRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ x: number; y: number } | null>(null);
  const queuedPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state)
          .flat()
          .reduce<PresenceUser[]>((acc, presence) => {
            if (isPresenceUser(presence)) {
              acc.push({
                userId: presence.userId,
                displayName: presence.displayName,
                avatarUrl: presence.avatarUrl,
              });
            }

            return acc;
          }, []);
        setUsers(users);
      })
      .on(
        "broadcast",
        { event: "cursor" },
        (payload: BroadcastCursorPayload) => {
          if (payload.payload.userId !== user.id) {
            updateCursor(payload.payload);
          }
        },
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    const flushCursor = () => {
      frameRef.current = null;

      if (!queuedPointRef.current) {
        return;
      }

      const point = queuedPointRef.current;
      queuedPointRef.current = null;
      lastSentRef.current = point;

      channel.send({
        type: "broadcast",
        event: "cursor",
        payload: {
          x: point.x,
          y: point.y,
          userId: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const nextPoint = { x: e.clientX, y: e.clientY };
      const lastPoint = lastSentRef.current;

      if (
        lastPoint &&
        Math.abs(lastPoint.x - nextPoint.x) < 6 &&
        Math.abs(lastPoint.y - nextPoint.y) < 6
      ) {
        return;
      }

      queuedPointRef.current = nextPoint;

      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(flushCursor);
    };

    if (window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
    }

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      window.removeEventListener("mousemove", handleMouseMove);
      removeCursor(user.id);
      channel.unsubscribe();
    };
  }, [roomId, user, setUsers, updateCursor, removeCursor]);

  return null; // This is purely a behavioral component
}
