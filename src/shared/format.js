import dayjs from 'dayjs';

export const fmtTime = (iso) => (iso ? dayjs(iso).format('HH:mm') : '-');
export const fmtDate = (iso) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '-');
export const fmtDateTime = (iso) => (iso ? dayjs(iso).format('DD/MM HH:mm') : '-');
export const fmtNum = (n, digits = 0) =>
  n == null || Number.isNaN(n) ? '-' : Number(n).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const fmtMin = (min) => (min == null ? '-' : min >= 60 ? `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m` : `${Math.round(min)}m`);
export const fmtIls = (n) => `₪${fmtNum(n, 0)}`;
export const fmtPct = (n, digits = 1) => (n == null ? '-' : `${n > 0 ? '+' : ''}${fmtNum(n, digits)}%`);
export const initials = (name) =>
  (name || '')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

// Google Maps hand-off (the driver navigates in the Google Maps app; the pilot does not build turn-by-turn).
export function googleMapsUrl(origin, stops) {
  if (!stops.length) return null;
  const p = (x) => `${x.lat},${x.lng}`;
  const dest = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).map(p).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${p(origin)}&destination=${p(dest)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=driving`;
}
