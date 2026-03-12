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
    const results = await Location.reverseGeocodeAsync(point);
    const formatted =
      formatAddress(results[0]) ?? `Toa do ${formatCoordinates(point)}`;

    addressCache.set(cacheKey, formatted);
    return formatted;
  } catch {
    return `Toa do ${formatCoordinates(point)}`;
  }
}
