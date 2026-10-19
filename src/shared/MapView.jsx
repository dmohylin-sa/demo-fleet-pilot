// Leaflet map on OpenStreetMap tiles (the pilot uses the Google Maps JavaScript API in the console).
// Markers are drawn as circles so no marker image assets are needed.
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DEPOT } from '../mock-backend/seed.js';

const STOP_COLORS = { done: '#52C41A', arrived: '#FAAD14', pending: '#1677FF' };
const TRUCK_COLORS = { on_trip: '#1677FF', on_shift: '#13C2C2', off: '#8C8C8C' };
const EVENT_COLORS = { harsh_braking: '#F5222D', harsh_acceleration: '#FA8C16', speeding: '#722ED1' };

function FitBounds({ points, fitKey }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return undefined;
    // Wait a tick so a map that has just mounted (or been resized in a drawer) knows its size.
    const id = setTimeout(() => {
      map.invalidateSize();
      if (points.length === 1) map.setView(points[0], 13);
      else map.fitBounds(points, { padding: [28, 28], maxZoom: 14 });
    }, 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);
  return null;
}

export default function MapView({
  height = 320,
  path = null,
  stops = [],
  trucks = [],
  events = [],
  showDepot = true,
  fitKey = 'default',
  onTruckClick,
  zoomControl = true,
  rounded = 14,
}) {
  const points = useMemo(() => {
    const pts = [];
    if (path?.length) pts.push(...path);
    stops.forEach((s) => pts.push([s.lat, s.lng]));
    trucks.forEach((t) => t.lat != null && pts.push([t.lat, t.lng]));
    if (!pts.length) pts.push([DEPOT.lat, DEPOT.lng]);
    return pts;
  }, [path, stops, trucks]);

  return (
    <div dir="ltr" style={{ height, borderRadius: rounded, overflow: 'hidden', border: '1px solid #ECEDF0', position: 'relative', isolation: 'isolate', zIndex: 0 }}>
      <MapContainer center={[DEPOT.lat, DEPOT.lng]} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={zoomControl} attributionControl>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} fitKey={fitKey} />
        {path?.length ? <Polyline positions={path} pathOptions={{ color: '#1677FF', weight: 4, opacity: 0.75 }} /> : null}
        {showDepot ? (
          <CircleMarker center={[DEPOT.lat, DEPOT.lng]} radius={6} pathOptions={{ color: '#16171A', fillColor: '#16171A', fillOpacity: 1 }}>
            <Tooltip direction="top">Depot</Tooltip>
          </CircleMarker>
        ) : null}
        {stops.map((s, i) => (
          <CircleMarker key={s.key ?? i} center={[s.lat, s.lng]} radius={9} pathOptions={{ color: '#fff', weight: 2, fillColor: STOP_COLORS[s.status] || STOP_COLORS.pending, fillOpacity: 1 }}>
            <Tooltip direction="top" permanent={!!s.permanent} className="stop-tip">
              {s.label}
            </Tooltip>
          </CircleMarker>
        ))}
        {events.map((e) => (
          <CircleMarker key={e.id} center={[e.lat, e.lng]} radius={5} pathOptions={{ color: EVENT_COLORS[e.type], fillColor: EVENT_COLORS[e.type], fillOpacity: 0.85 }}>
            <Tooltip direction="top">{e.label}</Tooltip>
          </CircleMarker>
        ))}
        {trucks.map((t) =>
          t.lat == null ? null : (
            <CircleMarker
              key={t.id}
              center={[t.lat, t.lng]}
              radius={t.highlight ? 11 : 9}
              eventHandlers={onTruckClick ? { click: () => onTruckClick(t) } : undefined}
              pathOptions={{ color: t.highlight ? '#FADB14' : '#fff', weight: 3, fillColor: TRUCK_COLORS[t.status] || TRUCK_COLORS.on_trip, fillOpacity: 1 }}
            >
              <Tooltip direction="top" permanent={t.permanent}>
                {t.label}
              </Tooltip>
            </CircleMarker>
          ),
        )}
      </MapContainer>
    </div>
  );
}

export { STOP_COLORS, TRUCK_COLORS, EVENT_COLORS };
