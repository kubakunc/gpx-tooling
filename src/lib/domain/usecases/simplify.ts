import type { TrackPoint } from '../entities/TrackPoint';
import { perpendicularDistanceMeters } from './geo';

const ll = (p: TrackPoint) => ({ lat: p.latitude, lon: p.longitude });

export function simplifyRdp(points: TrackPoint[], epsilonMeters: number): TrackPoint[] {
  if (points.length <= 2) return points.slice();
  let maxDist = 0;
  let index = 0;
  const a = points[0], b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistanceMeters(ll(points[i]), ll(a), ll(b));
    if (d > maxDist) { maxDist = d; index = i; }
  }
  if (maxDist > epsilonMeters) {
    const left = simplifyRdp(points.slice(0, index + 1), epsilonMeters);
    const right = simplifyRdp(points.slice(index), epsilonMeters);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}
