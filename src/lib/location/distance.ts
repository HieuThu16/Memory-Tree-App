// Haversine formula — tính khoảng cách giữa 2 tọa độ (meters)
export function getDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatSpeed(metersPerSecond: number | null): string {
  if (!metersPerSecond) return "—";
  const kmh = metersPerSecond * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}
