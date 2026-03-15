"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { MemoryRecord, MemoryParticipant } from "@/lib/types";
import MemoryCard from "./MemoryCard";
import { useTreeStore } from "@/lib/stores/treeStore";

// Fix Leaflet's default icon path issue in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const customHeartIcon = new L.DivIcon({
  className: "custom-heart-icon",
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border-2 border-rose-400 text-rose-500 text-lg">❤️</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

type GeocodedMemory = MemoryRecord & {
  coords: [number, number];
};

const CACHE_KEY = "memory_map_geocache";

function MapUpdater({ bounds, center, zoom }: { bounds?: L.LatLngBounds, center?: [number, number], zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    // Force a resize after mount so tiles load fully inside tabs
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else if (center && zoom) {
        map.setView(center, zoom);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [map, bounds, center, zoom]);
  return null;
}

async function geocodeLocation(address: string): Promise<[number, number] | null> {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  const normalized = address.toLowerCase().trim();
  
  if (cache[normalized]) {
    return cache[normalized];
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "User-Agent": "MemoryTreeApp/1.0" } }
    );
    const data = await res.json();
    
    if (data && data.length > 0) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      cache[normalized] = coords;
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return coords;
    }
    
    // Fallback: don't retry failed addresses too often by returning a null-like array but we'll just return null
    return null;
  } catch (err) {
    console.error("Geocoding failed for", address, err);
    return null;
  }
}

export default function MemoryMap({
  memories,
  participantsByUserId,
}: {
  memories: MemoryRecord[];
  participantsByUserId?: Map<string, MemoryParticipant>;
}) {
  const [geocodedMemories, setGeocodedMemories] = useState<GeocodedMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setSelectedId, setIsDetailOpen } = useTreeStore();
  
  // Default to Vietnam's center roughly
  const defaultCenter: [number, number] = [16.047079, 108.206230];

  useEffect(() => {
    let isMounted = true;
    const fetchCoords = async () => {
      setIsLoading(true);
      const withLocation = memories.filter((m) => m.location && m.location.trim() !== "");
      const results: GeocodedMemory[] = [];
      
      for (const mem of withLocation) {
        if (!mem.location) continue;
        const coords = await geocodeLocation(mem.location);
        if (coords) {
          results.push({ ...mem, coords });
        }
        // Small delay to avoid hitting Nominatim rate limit (1 request per second strictly)
        await new Promise((r) => setTimeout(r, 600));
      }
      
      if (isMounted) {
        setGeocodedMemories(results);
        setIsLoading(false);
      }
    };

    fetchCoords();
    return () => { isMounted = false; };
  }, [memories]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-text-muted">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="text-sm font-medium">Đang rà soát và tải bản đồ hành trình...</p>
        <p className="mt-1 text-xs text-text-muted/60 opacity-80">(Chỉ tìm các kỷ niệm có định vị nơi chốn)</p>
      </div>
    );
  }

  if (geocodedMemories.length === 0) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center text-text-muted px-4">
        <span className="text-4xl mb-2">🗺️</span>
        <p className="text-sm font-medium">Chưa có dấu chân nào trên bản đồ</p>
        <p className="mt-1 text-xs text-text-muted/60 max-w-xs">
          Hãy thêm "Vị trí" (vd: Đà Lạt, Sài Gòn...) vào các kỷ niệm để chúng hiển thị lên bản đồ hành trình chung nhé!
        </p>
      </div>
    );
  }

  // Calculate bounds to fit all markers
  let mapBounds: L.LatLngBounds | undefined = undefined;
  
  if (geocodedMemories.length > 0) {
    const coords = geocodedMemories.map((m) => m.coords);
    const uniqueCoords = Array.from(new Set(coords.map(c => c.join(',')))).map(s => s.split(',').map(Number) as [number, number]);
    
    if (uniqueCoords.length > 1) {
      mapBounds = L.latLngBounds(uniqueCoords);
    }
  }

  const isSingleMarker = geocodedMemories.length > 0 && !mapBounds;
  const initialCenter = geocodedMemories.length > 0 ? geocodedMemories[0].coords : defaultCenter;

  return (
    <div className="h-[65vh] w-full relative rounded-2xl overflow-hidden border border-border shadow-sm">
      <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm rounded-xl border border-border px-3 py-1.5 shadow-sm">
        <p className="text-xs font-semibold text-accent">🗺️ Đã ghé thăm {geocodedMemories.length} địa điểm</p>
      </div>
      <MapContainer
        center={initialCenter}
        zoom={isSingleMarker ? 13 : 5}
        style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
        className="z-0"
      >
        <MapUpdater bounds={mapBounds} center={initialCenter} zoom={isSingleMarker ? 15 : 5} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geocodedMemories.map((mem) => (
          <Marker 
            key={mem.id} 
            position={mem.coords}
            icon={customHeartIcon}
          >
            <Popup className="memory-map-popup mt-2">
              <div className="min-w-[200px] max-w-[260px] pb-1">
                <p className="font-bold text-accent border-b border-border pb-1 mb-2 text-[13px]">
                  🗓️ {
                    mem.date || mem.created_at
                      ? new Intl.DateTimeFormat("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        }).format(new Date(mem.date || mem.created_at))
                      : "Ngày ?"
                  } : 📍 {mem.location}
                </p>
                 <MemoryCard
                    memory={mem}
                    participant={participantsByUserId?.get(mem.user_id)}
                    onSelect={(m) => {
                      setSelectedId(m.id);
                      setIsDetailOpen(true);
                    }}
                  />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <style>{`
         /* Fix Leaflet popup styling override to match our design system */
         .leaflet-popup-content-wrapper {
            background-color: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(8px) !important;
            border-radius: 16px !important;
            border: 1px solid rgba(226, 232, 240, 0.8) !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
         }
         .leaflet-popup-content {
            margin: 12px !important;
         }
         .leaflet-popup-tip {
            background-color: rgba(255, 255, 255, 0.95) !important;
         }
         /* Hide some embedded UI inside memory card when in map popup to keep it compact */
         .memory-map-popup .memory-reactions-bar {
            display: none !important;
         }
      `}</style>
    </div>
  );
}
