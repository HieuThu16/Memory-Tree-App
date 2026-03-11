"use client";

import type { MemoryParticipant } from "@/lib/types";
import {
  useLocationTracker,
  type CurrentLocation,
} from "@/lib/location/useLocationTracker";
import { formatSpeed, getDistance } from "@/lib/location/distance";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PartnerLocation = {
  userId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  updatedAt: string;
};

type SavedLocation = {
  id: string;
  user_id?: string;
  lat: number;
  lng: number;
  label: string; // "Nhà", "Trọ", "Trường"...
};

// Hook for reverse geocoding
function useAddress(lat: number | undefined, lng: number | undefined) {
  const [address, setAddress] = useState<string>("Đang xác định vị trí...");

  useEffect(() => {
    if (lat === undefined || lng === undefined) {
      setAddress("Chưa có vị trí");
      return;
    }

    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "vi",
            },
          }
        );
        const data = await res.json();
        if (data && data.display_name) {
          // Simplify address if it's too long
          const parts = data.display_name.split(", ");
          setAddress(parts.slice(0, 4).join(", "));
        } else {
          setAddress("Không tìm thấy địa chỉ");
        }
      } catch (e) {
        setAddress("Lỗi khi tải địa chỉ");
      }
    };

    fetchAddress();
  }, [lat, lng]);

  return address;
}

// Helper component to display each saved location row with geocoding
function SavedLocationItem({ loc, icon }: { loc: SavedLocation; icon: string }) {
  const address = useAddress(loc.lat, loc.lng);
  
  return (
    <li className="bg-white/40 rounded-xl p-3 border border-white/50 flex items-start gap-3">
      <span className="text-base mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-[13px] text-foreground leading-snug">
            {address}
          </p>
          <span className="text-[11px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
            {loc.label}
          </span>
        </div>
        <p className="text-[10px] text-text-muted mt-1.5 font-mono">
          {loc.lat}, {loc.lng}
        </p>
      </div>
    </li>
  );
}

export default function LocationClientPage({
  user,
  roomId,
  participants,
}: {
  user: { id: string; displayName: string; avatarUrl: string | null };
  roomId: string | null;
  participants: MemoryParticipant[];
}) {
  const { status, currentLocation, errorMessage, startTracking, stopTracking } =
    useLocationTracker(user.id, roomId ?? "");
  const [partnerLocation, setPartnerLocation] =
    useState<PartnerLocation | null>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createSupabaseBrowserClient>["channel"]
  > | null>(null);

  const [partnerHistory, setPartnerHistory] = useState<{ lat: number; lng: number }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  console.log("id của tôi là:", user.id);
  console.log("danh sách bạn trong room là:", participants);  

  // Saved Locations State
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const supabase = createSupabaseBrowserClient();

    // Fetch initial saved locations
    supabase
      .from("saved_locations")
      .select("*")
      .eq("room_id", roomId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSavedLocations(data);
        }
      });
      
    // Subscribe to changes (so both users see new locations instantly)
    const channel = supabase
      .channel(`saved_locations:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_locations",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          const { data } = await supabase
            .from("saved_locations")
            .select("*")
            .eq("room_id", roomId);
          if (data) setSavedLocations(data);
        }
      )
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const handleSaveLocation = async () => {
    if (!currentLocation || !locationLabel.trim() || !roomId) return;
    setIsSaving(true);
    const supabase = createSupabaseBrowserClient();
    
    // Save to Supabase Database
    const { data, error } = await supabase
      .from("saved_locations")
      .insert({
        room_id: roomId,
        user_id: user.id,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        label: locationLabel.trim(),
      })
      .select()
      .single();
      
    if (!error && data) {
      // Optimistic UI update
      setSavedLocations((prev) => {
        if (prev.find((p) => p.id === data.id)) return prev;
        return [...prev, data];
      });
    }
    
    setIsSaving(false);
    setLocationLabel("");
    setShowSaveModal(false);
  };

  const getCustomLabel = (lat?: number, lng?: number) => {
    if (!lat || !lng) return null;
    let closest: SavedLocation | null = null;
    let minD = 60; // radius 60m
    for (const loc of savedLocations) {
      const d = getDistance(
        { latitude: lat, longitude: lng },
        { latitude: loc.lat, longitude: loc.lng }
      );
      if (d < minD) {
        closest = loc;
        minD = d;
      }
    }
    return closest?.label || null;
  };

  const partner = participants.find((p) => p.userId !== user.id) ?? null;

  const myAddress = useAddress(currentLocation?.lat, currentLocation?.lng);
  const partnerAddress = useAddress(partnerLocation?.lat, partnerLocation?.lng);

  const myCustomLabel = getCustomLabel(currentLocation?.lat, currentLocation?.lng);
  const partnerCustomLabel = getCustomLabel(partnerLocation?.lat, partnerLocation?.lng);

  // Subscribe to partner's real-time location via Supabase Realtime
  useEffect(() => {
    if (!roomId || !partner) return;
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`location:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_locations",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as {
            user_id: string;
            lat: number;
            lng: number;
            accuracy: number | null;
            speed: number | null;
            updated_at: string;
          };
          if (row.user_id !== user.id) {
            setPartnerLocation({
              userId: row.user_id,
              lat: row.lat,
              lng: row.lng,
              accuracy: row.accuracy,
              speed: row.speed,
              updatedAt: row.updated_at,
            });
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    // Initial fetch
    supabase
      .from("user_locations")
      .select("*")
      .eq("room_id", roomId)
      .neq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setPartnerLocation({
            userId: data.user_id,
            lat: data.lat,
            lng: data.lng,
            accuracy: data.accuracy,
            speed: data.speed,
            updatedAt: data.updated_at,
          });
        }
      });

    // Fetch history
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("location_history")
      .select("lat, lng")
      .eq("room_id", roomId)
      .eq("user_id", partner.userId)
      .gte("recorded_at", yesterday)
      .order("recorded_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPartnerHistory(data);
        }
      });

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, partner?.userId, user.id]);

  const statusConfig = {
    idle: {
      color: "text-text-muted",
      dot: "bg-gray-300",
      label: "Chưa bật vị trí",
    },
    requesting: {
      color: "text-amber-600",
      dot: "bg-amber-400 animate-pulse",
      label: "Đang xin quyền GPS...",
    },
    tracking: {
      color: "text-green",
      dot: "bg-green animate-pulse",
      label: "Đang theo dõi",
    },
    error: {
      color: "text-rose",
      dot: "bg-rose",
      label: "Lỗi GPS",
    },
    denied: {
      color: "text-rose",
      dot: "bg-rose",
      label: "Bị từ chối GPS",
    },
  };

  const cfg = statusConfig[status];

  return (
    <main className="flex h-[100dvh] flex-col pb-16 px-4 pt-6 max-w-lg mx-auto w-full relative">
      <div className="flex-1 flex flex-col gap-6">
        <div className="text-center mb-4 mt-8">
          <h1 className="text-2xl font-medium text-foreground mb-2">Vị trí hiện tại</h1>
          <p className="text-sm text-text-muted">Theo dõi và nhìn thấy nhau mỗi ngày</p>
        </div>

        {/* My Status Card */}
        <div className="glass-card rounded-3xl p-6 shadow-[var(--shadow-card)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/50">
              <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              <p className={`text-[10px] font-semibold ${cfg.color}`}>
                {cfg.label}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 mb-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-sm">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-accent">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-1 border-b border-border/50 pb-3">
              <p className="text-base font-semibold text-foreground">
                Bạn ({user.displayName})
              </p>
              <div className="flex items-center justify-between gap-2 mt-1">
                {currentLocation && (
                  <p className="text-[12px] text-text-muted">
                    Tốc độ: {formatSpeed(currentLocation.speed)}
                  </p>
                )}
                
                {status === "tracking" && currentLocation && (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="bg-accent/10 hover:bg-accent/20 text-accent text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors"
                  >
                    + Thêm và lưu
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white/40 rounded-2xl p-4 border border-white/50">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">📍</span>
              <div>
                <p className="text-sm text-foreground font-medium mb-1">
                  Đang ở: {myCustomLabel ? <span className="text-accent bg-accent/10 px-2 py-0.5 rounded-md ml-1">{myCustomLabel}</span> : null}
                </p>
                <p className="text-[13px] text-text-secondary leading-relaxed">
                  {status === "tracking" && currentLocation ? myAddress : "Đang chờ bật vị trí hoặc GPS."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 w-full">
            <button
              onClick={status === "tracking" ? stopTracking : startTracking}
              className={`w-full rounded-2xl py-3 text-sm font-semibold transition-all ${
                status === "tracking"
                  ? "bg-rose/10 text-rose border border-rose/20 hover:bg-rose/20"
                  : "btn-primary text-white shadow-md shadow-accent/20"
              }`}
            >
              {status === "tracking" ? "📍 Tắt chia sẻ vị trí" : "📍 Bật chia sẻ vị trí"}
            </button>
            {errorMessage && (
              <p className="text-[11px] text-center text-rose mt-3 px-2 leading-tight">Lỗi: {errorMessage}</p>
            )}
          </div>
        </div>

        {/* Partner status card */}
        {roomId ? (
          partner ? (
            <div className="glass-card rounded-3xl p-6 shadow-[var(--shadow-card)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/50">
                  <div className={`h-2 w-2 rounded-full ${partnerLocation ? "bg-green animate-pulse" : "bg-gray-300"}`} />
                  <p className={`text-[10px] font-semibold ${partnerLocation ? "text-green" : "text-text-muted"}`}>
                    {partnerLocation ? "Online" : "Chưa chia sẻ"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 mb-4 border-b border-border/50 pb-4">
                <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-sm ${!partnerLocation ? "grayscale-[50%] opacity-80" : ""}`}>
                  {partner.avatarUrl ? (
                    <img
                      src={partner.avatarUrl}
                      alt={partner.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-accent">
                      {partner.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-base font-semibold text-foreground">
                    {partner.displayName}
                  </p>
                  <p className="text-[12px] text-text-muted mt-0.5">
                    {partnerLocation
                      ? `Cập nhật ${formatRelativeTime(partnerLocation.updatedAt)}`
                      : "Đang chờ ngóng vị trí..."}
                  </p>
                  {partnerLocation && (
                    <p className="text-[12px] text-text-muted mt-0.5">
                      Tốc độ: {formatSpeed(partnerLocation.speed)}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white/40 rounded-2xl p-4 border border-white/50">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">🌿</span>
                  <div>
                    <p className="text-sm text-foreground font-medium mb-1">
                      Đang ở: {partnerCustomLabel ? <span className="text-accent bg-accent/10 px-2 py-0.5 rounded-md ml-1">{partnerCustomLabel}</span> : null}
                    </p>
                    <p className="text-[13px] text-text-secondary leading-relaxed">
                      {partnerLocation ? partnerAddress : `${partner.displayName} chưa chia sẻ vị trí hiện tại.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-6 shadow-[var(--shadow-card)] relative overflow-hidden border-dashed border-2 border-border/60">
              <div className="flex items-start gap-4 mb-4 pointer-events-none opacity-50 grayscale">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-sm bg-surface">
                  <span className="text-xl font-bold text-text-muted">?</span>
                </div>
                <div className="min-w-0 flex-1 pt-2 border-border/50 pb-3">
                  <p className="text-base font-semibold text-text-muted">
                    Không có bạn bè
                  </p>
                  <p className="text-[12px] text-text-muted mt-0.5 mb-1">
                    Hãy mời thêm người vào vườn để xem vị trí.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : null}

        {/* Saved Locations Lists */}
        {roomId && savedLocations.length > 0 && (
          <div className="glass-card rounded-3xl p-6 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-semibold text-foreground mb-4">Các vị trí đã lưu</h3>
            
            <div className="flex flex-col gap-5">
              {/* My saved locations */}
              {savedLocations.filter((loc) => loc.user_id === user.id).length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-text-muted mb-2 uppercase tracking-wide">Của bạn</p>
                  <ul className="flex flex-col gap-2.5">
                    {savedLocations
                      .filter((loc) => loc.user_id === user.id)
                      .map((loc) => (
                        <SavedLocationItem key={loc.id} loc={loc} icon="📍" />
                    ))}
                  </ul>
                </div>
              )}

              {/* Partner saved locations */}
              {partner && savedLocations.filter((loc) => loc.user_id === partner.userId).length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-text-muted mb-2 uppercase tracking-wide">Của {partner.displayName}</p>
                  <ul className="flex flex-col gap-2.5">
                    {savedLocations
                      .filter((loc) => loc.user_id === partner.userId)
                      .map((loc) => (
                        <SavedLocationItem key={loc.id} loc={loc} icon="🌿" />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No room overlay */}
        {!roomId && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="glass-card mx-4 rounded-3xl p-8 text-center max-w-sm">
              <div className="mb-4 text-5xl">🌿</div>
              <h2 className="mb-2 font-display text-xl font-bold text-foreground">
                Chưa có vườn chung
              </h2>
              <p className="text-sm text-text-secondary">
                Tham gia hoặc tạo khu vườn chung để xem vị trí của nhau.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Save Location Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-foreground/20 backdrop-blur-sm px-4">
          <div className="glass-card w-full max-w-sm rounded-[24px] p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-foreground mb-1">Định danh vị trí</h3>
            <p className="text-xs text-text-secondary mb-5">
              Đặt tên thân thuộc cho nơi này (vd: Nhà, Trọ, Trường, Chỗ lượn lờ...)
            </p>
            
            <input
              type="text"
              className="input-field w-full mb-4 text-sm"
              placeholder="VD: Nhà trọ thủ đô"
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              autoFocus
              maxLength={30}
            />

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-text-secondary bg-surface hover:bg-gray-100 transition-colors text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveLocation}
                disabled={!locationLabel.trim() || isSaving}
                className="flex-1 btn-primary py-2.5 rounded-xl font-semibold text-white disabled:opacity-50 text-sm"
              >
                {isSaving ? "Đang lưu..." : "Lưu lại"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}
