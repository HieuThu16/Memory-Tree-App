"use client";

import { useEffect } from "react";
import { useRealtimeStore } from "@/lib/stores/realtimeStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
          .map((p: any) => ({
            userId: p.userId,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
          }));
        setUsers(users);
      })
      .on("broadcast", { event: "cursor" }, (payload) => {
        if (payload.payload.userId !== user.id) {
          updateCursor(payload.payload);
        }
      })
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

    const handleMouseMove = (e: MouseEvent) => {
      channel.send({
        type: "broadcast",
        event: "cursor",
        payload: {
          x: e.clientX,
          y: e.clientY,
          userId: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      channel.unsubscribe();
    };
  }, [roomId, user, setUsers, updateCursor, removeCursor]);

  return null; // This is purely a behavioral component
}
