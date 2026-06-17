const R = 6371000; // Earth radius, meters
const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface LatLon { lat: number; lon: number; }

// Local equirectangular projection to meters, origin at `a`.
function project(p: LatLon, originLat: number): { x: number; y: number } {
  return {
    x: R * toRad(p.lon) * Math.cos(toRad(originLat)),
    y: R * toRad(p.lat),
  };
}

export function perpendicularDistanceMeters(p: LatLon, a: LatLon, b: LatLon): number {
  const o = a.lat;
  const pp = project(p, o), pa = project(a, o), pb = project(b, o);
  const dx = pb.x - pa.x, dy = pb.y - pa.y;
  const segLen2 = dx * dx + dy * dy;
  if (segLen2 === 0) return Math.hypot(pp.x - pa.x, pp.y - pa.y);
  const cross = Math.abs(dy * (pp.x - pa.x) - dx * (pp.y - pa.y));
  return cross / Math.sqrt(segLen2);
}
