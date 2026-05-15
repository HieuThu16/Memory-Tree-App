"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { MemoryParticipant, MemoryRecord } from "@/lib/types";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  MEMORY_SELECT,
  MEMORY_SELECT_LEGACY,
  MEMORY_SUMMARY_SELECT,
  MEMORY_SUMMARY_SELECT_LEGACY,
} from "@/lib/supabase/selects";
import MemoryTree from "@/components/tree/MemoryTree";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

const MemoryGallery = dynamic(
  () => import("@/components/memory/MemoryGallery"),
  {
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-text-muted animate-pulse">
        Dang tai thu vien ky niem...
      </div>
    ),
  },
);

const MemoryList = dynamic(() => import("@/components/memory/MemoryList"), {
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-text-muted animate-pulse">
      Dang tai danh sach ky niem...
    </div>
  ),
});


const isMissingMemoryMetadataColumn = (message?: string) => {
  if (!message) return false;
  const lowered = message.toLowerCase();
  return (
    lowered.includes("column") &&
    (lowered.includes("memories.with_whom") ||
      lowered.includes("memories.event_time"))
  );
};

type BrowserMemoryListResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
};

type BrowserMemorySingleResult = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

function MemorySearchInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (nextValue: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onCommit(draftValue);
    }, 140);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftValue, onCommit]);

  return (
    <div className="relative min-w-0 flex-1">
      <input
        type="text"
        placeholder="Tim ky niem chung..."
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        className="input-field w-full !rounded-xl !py-1.5 !pl-7 !text-xs"
      />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
        🔍
      </span>
    </div>
  );
}

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
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [yearsWithMemories, setYearsWithMemories] = useState<number[]>([now.getFullYear()]);
  const [lightbox, setLightbox] = useState<{
    url: string;
    type: "image" | "video";
  } | null>(null);

  const openCreate = useTreeStore((s) => s.openCreate);
  const hydrateScope = useMemoryStore((s) => s.hydrateScope);
  const upsertMemory = useMemoryStore((s) => s.upsertMemory);
  const removeMemory = useMemoryStore((s) => s.removeMemory);
  const addToast = useUiStore((s) => s.addToast);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const focusRefreshAtRef = useRef(0);

  const scopedMemories = useMemoryStore((s) =>
    s.scopeKey === `room:${roomId}` ? s.memories : memories,
  );

  const handleSelectMemory = useCallback((memory: MemoryRecord) => {
    const d = new Date(memory.date || memory.created_at);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    router.push(`/friends/${roomId}/timeline/${year}/${month}/${memory.id}`);
  }, [router, roomId]);

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
    "tree" | "gallery" | "list"
  >("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasLoadedDetailedMemories, setHasLoadedDetailedMemories] =
    useState(false);
  const [isLoadingDetailedMemories, setIsLoadingDetailedMemories] = useState(false);

  const handleSearchCommit = useCallback((nextValue: string) => {
    setSearchQuery((current) => (current === nextValue ? current : nextValue));
  }, []);

  useEffect(() => {
    hydrateScope(`room:${roomId}`, memories);
  }, [hydrateScope, memories, roomId]);

  const [allMemoryDates, setAllMemoryDates] = useState<{ date: string | null; created_at: string }[]>([]);

  useEffect(() => {
    const fetchDates = async () => {
      const { data } = await supabase
        .from("memories")
        .select("date, created_at")
        .eq("room_id", roomId);
      
      if (data) {
        setAllMemoryDates(data);
        const years = new Set<number>();
        years.add(now.getFullYear());
        data.forEach(m => {
          const d = new Date(m.date || m.created_at);
          if (!isNaN(d.getTime())) years.add(d.getFullYear());
        });
        setYearsWithMemories(Array.from(years).sort((a, b) => b - a));
      }
    };
    fetchDates();
  }, [roomId, supabase, now]);

  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) counts[i] = 0;

    allMemoryDates.forEach(m => {
      const d = new Date(m.date || m.created_at);
      if (!isNaN(d.getTime()) && d.getFullYear() === selectedYear) {
        const month = d.getMonth() + 1;
        counts[month] = (counts[month] || 0) + 1;
      }
    });
    return counts;
  }, [allMemoryDates, selectedYear]);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let isCancelled = false;

    const registerPushSubscription = async () => {
      try {
        if (Notification.permission === "denied") {
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        if (isCancelled) return;

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const permission =
            Notification.permission === "granted"
              ? "granted"
              : await Notification.requestPermission();

          if (permission !== "granted" || isCancelled) {
            return;
          }

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        if (!subscription || isCancelled) {
          return;
        }

        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: currentUserId,
            room_id: roomId,
            subscription: JSON.stringify(subscription.toJSON()),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

        if (error) {
          console.error("Error saving push subscription to Supabase:", error);
        }
      } catch (error) {
        console.error("Failed to register push subscription:", error);
      }
    };

    const timer = window.setTimeout(() => {
      void registerPushSubscription();
    }, 1200);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentUserId, roomId, supabase]);

  useEffect(() => {
    const activeSelect = MEMORY_SELECT;
    const legacySelect = MEMORY_SELECT_LEGACY;

    const refreshMemories = async () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }

      setIsLoadingDetailedMemories(true);
      try {
        // Range for selected month in YYYY-MM-DD format for better DB compatibility
        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${new Date(selectedYear, selectedMonth, 0).getDate()}`;

        const primaryResult = await supabase
          .from("memories")
          .select(activeSelect)
          .eq("room_id", roomId)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: true });

        if (primaryResult.error) {
          console.error("Supabase Error (Primary):", primaryResult.error);
          addToast("Lỗi khi tải kỉ niệm tháng: " + primaryResult.error.message, "error");
        }

        // Handle case where some memories might not have 'date' column yet (legacy)
        const legacyResult = await supabase
          .from("memories")
          .select(legacySelect)
          .eq("room_id", roomId)
          .is("date", null)
          .order("created_at", { ascending: true });

        if (legacyResult.error) {
          console.error("Supabase Error (Legacy):", legacyResult.error);
        }

        const combined = [
          ...(primaryResult.data || []),
          ...(legacyResult.data || []),
        ] as MemoryRecord[];

        hydrateScope(`room:${roomId}`, combined);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setIsLoadingDetailedMemories(false);
      }
    };

    refreshMemories();

    const channel = supabase
      .channel(`room_memories_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memories",
          filter: `room_id=eq.${roomId}`,
        },
        () => refreshMemories(),
      )
      .subscribe();

    window.addEventListener("focus", refreshMemories);
    return () => {
      channel.unsubscribe();
      window.removeEventListener("focus", refreshMemories);
    };
  }, [roomId, supabase, selectedYear, selectedMonth, hydrateScope]);

  useEffect(() => {
    const activeSelect = hasLoadedDetailedMemories
      ? MEMORY_SELECT
      : MEMORY_SUMMARY_SELECT;
    const legacySelect = hasLoadedDetailedMemories
      ? MEMORY_SELECT_LEGACY
      : MEMORY_SUMMARY_SELECT_LEGACY;

    const fetchChangedMemory = async (memoryId: string) => {
      const primaryResult = (await supabase
        .from("memories")
        .select(activeSelect)
        .eq("id", memoryId)
        .single()) as unknown as BrowserMemorySingleResult;

      if (!primaryResult.error && primaryResult.data) {
        return primaryResult.data as MemoryRecord;
      }

      if (!isMissingMemoryMetadataColumn(primaryResult.error?.message)) {
        return null;
      }

      const legacyResult = (await supabase
        .from("memories")
        .select(legacySelect)
        .eq("id", memoryId)
        .single()) as unknown as BrowserMemorySingleResult;

      return legacyResult.error ? null : (legacyResult.data as MemoryRecord);
    };

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

          const data = await fetchChangedMemory(inserted.id);
          if (!data) return;

          upsertMemory(data);

          if (inserted.user_id && inserted.user_id !== currentUserId) {
            const partnerName =
              participantsByUserId.get(inserted.user_id)?.displayName ??
              "Nguoi ay";
            addToast(`${partnerName} vua them ky niem moi.`, "info");
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

          const data = await fetchChangedMemory(updated.id);
          if (!data) return;

          upsertMemory(data);
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
    hasLoadedDetailedMemories,
    participantsByUserId,
    removeMemory,
    roomId,
    supabase,
    upsertMemory,
  ]);

  const availableYears = yearsWithMemories;

  const activeSearchQuery = searchQuery.trim().toLowerCase();

  const filteredMemories = useMemo(() => {
    let list = [...scopedMemories];
    
    // Filter by Tabs first
    list = list.filter((m) => {
      const d = new Date(m.date || m.created_at);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });

    // Then filter by Search
    if (activeSearchQuery) {
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(activeSearchQuery) ||
          (m.category && m.category.toLowerCase().includes(activeSearchQuery)),
      );
    }

    // Sort by date ascending (Day 1 first as requested before)
    return list.sort((a, b) => {
      const d1 = new Date(a.date || a.created_at).getTime();
      const d2 = new Date(b.date || b.created_at).getTime();
      return d1 - d2;
    });
  }, [scopedMemories, selectedYear, selectedMonth, activeSearchQuery]);

  return (
    <section className="flex flex-col h-full w-full overflow-hidden bg-transparent">
      {lightbox && (
        <div 
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-white/20 text-white text-xl">✕</button>
          {lightbox.type === "image" ? (
            <img src={lightbox.url} alt="" className="max-h-[85vh] max-w-[95vw] object-contain shadow-2xl rounded-lg" />
          ) : (
            <video src={lightbox.url} controls autoPlay className="max-h-[85vh] max-w-[95vw] shadow-2xl rounded-lg" />
          )}
        </div>
      )}

      {/* Year Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 no-scrollbar border-b border-white/20 backdrop-blur-md bg-white/10">
        <span className="text-[10px] font-black text-emerald-800/60 uppercase tracking-widest mr-1">Năm</span>
        {availableYears.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`flex-shrink-0 px-5 py-1.5 rounded-full text-xs font-black transition-all duration-300 ${
              selectedYear === y
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105"
                : "bg-white/40 text-emerald-800/70 hover:bg-white/60 border border-white/40"
            }`}
          >
            {y}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => openCreate(roomId)}
          className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 active:scale-90 transition-all border-2 border-white/50"
        >
          <span className="text-2xl font-light">+</span>
        </button>
      </div>

      {/* Month Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 bg-white/5 backdrop-blur-sm no-scrollbar border-b border-white/10">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className={`flex-shrink-0 w-11 h-11 flex flex-col items-center justify-center rounded-2xl text-[14px] font-black transition-all duration-300 ${
              selectedMonth === m
                ? "bg-white text-emerald-700 shadow-xl ring-2 ring-emerald-500/20 scale-110"
                : "bg-white/20 text-emerald-900/40 hover:bg-white/40 border border-white/20"
            }`}
          >
            <span className="leading-none">{m}</span>
            <span className="text-[7px] uppercase opacity-70 mt-0.5 font-bold">
              {monthCounts[m] || 0} KN
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 bg-gradient-to-b from-white/10 to-transparent">
        <MemorySearchInput value={searchQuery} onCommit={handleSearchCommit} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 no-scrollbar">
        {isLoadingDetailedMemories ? (
          <div className="flex flex-col items-center justify-center h-48 animate-pulse">
            <div className="h-10 w-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <p className="mt-4 text-xs font-black text-emerald-800/40 uppercase tracking-widest">Đang tải kỉ niệm...</p>
          </div>
        ) : filteredMemories.length > 0 ? (
          <MemoryList
            memories={filteredMemories}
            onSelect={handleSelectMemory}
            onMediaClick={(url, type) => setLightbox({ url, type })}
            participantsByUserId={participantsByUserId}
            roomId={roomId}
            year={selectedYear}
            month={selectedMonth}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-8 rounded-[40px] border-2 border-dashed border-white/40 bg-white/10 backdrop-blur-md text-emerald-800/50">
            <span className="text-4xl mb-4 animate-bounce">🍃</span>
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-center">Tháng này chưa có kỉ niệm</p>
            <button
              onClick={() => openCreate(roomId)}
              className="mt-6 px-8 py-3 rounded-full bg-emerald-600/10 border border-emerald-600/20 text-[11px] font-black text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-widest"
            >
              + THÊM KỈ NIỆM ĐẦU TIÊN
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
