// Geometry helpers for the mocked routing service. The real backend calls the Google Routes API;
// here distances come from the haversine formula and a road factor, which is close enough for a demo.

const ROAD_FACTOR = 1.25;
const AVG_SPEED_KMH = 55;
export const SERVICE_MIN_PER_STOP = 15;

export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const roadKm = (a, b) => haversineKm(a, b) * ROAD_FACTOR;
export const driveMin = (km, trafficFactor = 1) => (km / AVG_SPEED_KMH) * 60 * trafficFactor;

// Waypoint optimisation stand-in: nearest neighbour from the origin.
export function nearestNeighbourOrder(origin, stops) {
  const left = [...stops];
  const ordered = [];
  let cur = origin;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) {
      if (haversineKm(cur, left[i]) < haversineKm(cur, left[best])) best = i;
    }
    cur = left.splice(best, 1)[0];
    ordered.push(cur);
  }
  return ordered;
}

// A slightly bent line between two points, so the route does not look ruler-straight on the map.
export function segmentPath(a, b, steps = 12, bend = 0.08) {
  const pts = [];
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const off = Math.sin(Math.PI * t) * bend;
    pts.push([a.lat + dy * t - dx * off * 0.5, a.lng + dx * t + dy * off * 0.5]);
  }
  return pts;
}

export function routePath(points) {
  const path = [];
  for (let i = 0; i < points.length - 1; i++) {
    const seg = segmentPath(points[i], points[i + 1]);
    path.push(...(i === 0 ? seg : seg.slice(1)));
  }
  return path;
}

export function pointAlong(path, t) {
  if (!path.length) return null;
  const idx = Math.min(path.length - 1, Math.max(0, Math.round(t * (path.length - 1))));
  const [lat, lng] = path[idx];
  return { lat, lng };
}
