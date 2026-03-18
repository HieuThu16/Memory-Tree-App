import * as Location from "expo-location";

type GeoPoint = {
  latitude: number;
  longitude: number;
};

const addressCache = new Map<string, string>();

function createCacheKey(point: GeoPoint) {
  return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
}

function compactParts(parts: Array<string | null | undefined>) {
  return Array.from(
    new Set(parts.map((part) => part?.trim()).filter(Boolean) as string[]),
  );
}

function formatAddress(result?: Location.LocationGeocodedAddress | null) {
  if (!result) {
    return null;
  }

  const parts = compactParts([
    result.name,
    [result.streetNumber, result.street].filter(Boolean).join(" "),
    result.district,
    result.subregion,
    result.city,
    result.region,
    result.country,
  ]);

  return parts.length ? parts.join(", ") : null;
}

export function formatCoordinates(point: GeoPoint) {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

export async function reverseGeocodePoint(point: GeoPoint) {
  const cacheKey = createCacheKey(point);
  const cached = addressCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const geocodePromise = Location.reverseGeocodeAsync(point);
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Geocode timeout")), 3000)
    );
    
    // @ts-ignore
    const results = await Promise.race([geocodePromise, timeoutPromise]);
    
    const formatted = formatAddress(results ? results[0] : null) ?? `Tọa độ ${formatCoordinates(point)}`;

    addressCache.set(cacheKey, formatted);
    return formatted;
  } catch {
    return `Tọa độ ${formatCoordinates(point)}`;
  }
}
