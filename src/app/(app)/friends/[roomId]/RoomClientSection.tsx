"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import MemoryTree from "@/components/tree/MemoryTree";
import MemoryGallery from "@/components/memory/MemoryGallery";
import MemoryList from "@/components/memory/MemoryList";
import type { MemoryParticipant, MemoryRecord } from "@/lib/types";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MEMORY_SELECT } from "@/lib/supabase/selects";
import { useUiStore } from "@/lib/stores/uiStore";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

const MemoryMap = dynamic(() => import("@/components/memory/MemoryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-text-muted animate-pulse">
      Đang tải bản đồ kỷ niệm...
    </div>
  ),
});

export default function RoomClientSection({
  memories,
  roomId,
  participants,
  currentUserId,
}: {
  memories: MemoryRecord[];
  roomId: string;
  participants: MemoryParticipant[];
  currentUserId: string;
}) {
  const openCreate = useTreeStore((s) => s.openCreate);
  const hydrateScope = useMemoryStore((s) => s.hydrateScope);
  const upsertMemory = useMemoryStore((s) => s.upsertMemory);
  const removeMemory = useMemoryStore((s) => s.removeMemory);
  const addToast = useUiStore((s) => s.addToast);
  const scopedMemories = useMemoryStore((s) =>
    s.scopeKey === `room:${roomId}` ? s.memories : memories,
  );
  const participantsByUserId = useMemo(
    () =>
      new Map(
        participants.map(
          (participant) => [participant.userId, participant] as const,
        ),
      ),
    [participants],
  );

  const isTwoPerson = participants.length === 2;
  const [memoryViewMode, setMemoryViewMode] = useState<
    "tree" | "gallery" | "map" | "list"
  >("tree");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    hydrateScope(`room:${roomId}`, memories);
  }, [hydrateScope, memories, roomId]);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let isCancelled = false;

    const registerPushSubscription = async () => {
      if (Notification.permission === "denied") return;
      const permission = await Notification.requestPermission();
      if (permission !== "granted" || isCancelled) return;

      const registration = await navigator.serviceWorker.ready;
      if (isCancelled) return;

      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      if (isCancelled) return;

      const supabase = createSupabaseBrowserClient();
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: currentUserId,
          room_id: roomId,
          subscription: JSON.stringify(subscription.toJSON()),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    };

    void registerPushSubscription();

    return () => {
      isCancelled = true;
    };
  }, [currentUserId, roomId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`room_memories:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "memories",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const inserted = payload.new as { id?: string; user_id?: string };
          if (!inserted?.id) return;

          const { data } = await supabase
            .from("memories")
            .select(MEMORY_SELECT)
            .eq("id", inserted.id)
            .single();

          if (!data) return;
          upsertMemory(data as MemoryRecord);

          if (inserted.user_id && inserted.user_id !== currentUserId) {
            const partnerName =
              participantsByUserId.get(inserted.user_id)?.displayName ??
              "Người ấy";
            addToast(`${partnerName} vừa thêm kỷ niệm mới 🌸`, "info");
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "memories",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const updated = payload.new as { id?: string };
          if (!updated?.id) return;

          const { data } = await supabase
            .from("memories")
            .select(MEMORY_SELECT)
            .eq("id", updated.id)
            .single();

          if (!data) return;
          upsertMemory(data as MemoryRecord);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "memories",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const removed = payload.old as { id?: string };
          if (removed?.id) {
            removeMemory(removed.id);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    addToast,
    currentUserId,
    participantsByUserId,
    removeMemory,
    roomId,
    upsertMemory,
  ]);

  const sortedMemories = useMemo(
    () =>
      [...scopedMemories].sort((a, b) => {
        const d1 = new Date(a.date || a.created_at).getTime();
        const d2 = new Date(b.date || b.created_at).getTime();
        return d2 - d1;
      }),
    [scopedMemories],
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredMemories = useMemo(() => {
    if (!normalizedSearchQuery) {
      return sortedMemories;
    }

    return sortedMemories.filter(
      (memory) =>
        memory.title.toLowerCase().includes(normalizedSearchQuery) ||
        (memory.category &&
          memory.category.toLowerCase().includes(normalizedSearchQuery)),
    );
  }, [normalizedSearchQuery, sortedMemories]);

  const handleOpenMemory = (memory: MemoryRecord) => {
    useTreeStore.getState().setSelectedId(memory.id);
    useTreeStore.getState().setIsDetailOpen(true);
  };

  const renderActiveView = () => {
    if (memoryViewMode === "tree") {
      return (
        <MemoryTree
          memories={filteredMemories}
          participants={participants}
          participantsByUserId={participantsByUserId}
          isTwoPerson={isTwoPerson}
          currentUserId={currentUserId}
          startAtLatestYear={true}
        />
      );
    }

    if (memoryViewMode === "list") {
      return (
        <div className="mt-2">
          <MemoryList
            memories={filteredMemories}
            participantsByUserId={participantsByUserId}
            onSelect={handleOpenMemory}
          />
        </div>
      );
    }

    if (memoryViewMode === "gallery") {
      return (
        <MemoryGallery
          memories={filteredMemories}
          participantsByUserId={participantsByUserId}
        />
      );
    }

    return (
      <MemoryMap
        memories={filteredMemories}
        participantsByUserId={participantsByUserId}
      />
    );
  };

  return (
    <section className="glass-card overflow-hidden rounded-2xl p-2.5 sm:rounded-[30px] sm:p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex-shrink-0 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
            👥 {participants.length}/2
          </span>
          <span className="flex-shrink-0 rounded-full border border-border bg-white/75 px-2.5 py-1 text-[10px] font-semibold text-text-secondary">
            🌸 {filteredMemories.length}/{scopedMemories.length}
          </span>

          {memoryViewMode !== "tree" && (
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                placeholder="Tìm kỷ niệm chung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full !rounded-xl !py-1.5 !pl-7 !text-xs"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                🔍
              </span>
            </div>
          )}

          <div className="flex-1" />

          <div className="flex flex-shrink-0 items-center gap-0.5 rounded-xl border border-border bg-white/60 p-0.5 backdrop-blur-sm">
            {(
              [
                { mode: "tree" as const, icon: "🌳" },
                { mode: "list" as const, icon: "📋" },
                { mode: "gallery" as const, icon: "🖼️" },
                { mode: "map" as const, icon: "🗺️" },
              ] as const
            ).map(({ mode, icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMemoryViewMode(mode)}
                className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  memoryViewMode === mode
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:bg-white"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openCreate(roomId)}
            className="btn-primary flex-shrink-0 rounded-full px-3 py-1.5 text-[10px] whitespace-nowrap"
          >
            + Góp 🌱
          </button>
        </div>
      </div>

      <div
        className={`relative ${
          memoryViewMode === "tree"
            ? "mt-1"
            : "mt-2 min-h-[50vh] rounded-2xl bg-white/58 p-1.5 sm:p-3"
        }`}
      >
        {renderActiveView()}
      </div>
    </section>
  );
}
