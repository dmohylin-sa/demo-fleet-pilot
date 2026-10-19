import { useState } from 'react';
import { Skeleton } from 'antd';
import MapView, { TRUCK_COLORS } from '../../shared/MapView.jsx';
import { listLive } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { initials } from '../../shared/format.js';
import PageHeader from '../components/PageHeader.jsx';
import TripDetailDrawer from '../components/TripDetailDrawer.jsx';
import { MapTag, useTagMaps } from '../components/Tags.jsx';

const DEMO_TRUCK = 't1';

// Phase 2 go-live: map and trips. Last truck positions; the trip detail opens from a truck.
export default function MapPage() {
  const { t, L } = useI18n();
  const maps = useTagMaps();
  const [tripId, setTripId] = useState(null);
  const { data } = usePoll(listLive, [], 3000);
  const fleet = data || [];

  const trucks = fleet.map((f) => ({
    id: f.truck.id,
    lat: f.position?.lat,
    lng: f.position?.lng,
    label: `${f.truck.plate} · ${L(f.driver.name)}`,
    status: f.status,
    highlight: f.truck.id === DEMO_TRUCK,
    permanent: f.truck.id === DEMO_TRUCK,
    tripId: f.tripId,
  }));
  const count = (s) => fleet.filter((f) => f.status === s).length;

  return (
    <div className="page">
      <PageHeader title={t('console.nav.map')} phase="golive" desc={t('console.map.desc')} />
      <div className="map-layout">
        <div className="map-col">
          {/* Mounted once positions are in, so the first fit covers the whole fleet. */}
          <div className="map-box">
            {data ? (
              <MapView height={380} trucks={trucks} fitKey="live" onTruckClick={(tk) => tk.tripId && setTripId(tk.tripId)} />
            ) : (
              <div className="map-placeholder" style={{ height: 380 }} />
            )}
          </div>
          <div className="legend">
            {['on_trip', 'on_shift', 'off'].map((s) => (
              <span key={s} className="legend-item">
                <i className="legend-dot" style={{ background: TRUCK_COLORS[s] }} />
                {maps.truck[s].label} ({count(s)})
              </span>
            ))}
            <span className="legend-item">
              <i className="legend-dot ring" />
              {t('console.map.demoTruck')}
            </span>
          </div>
        </div>
        <div className="fleet-list">
          {!data ? (
            <Skeleton active />
          ) : (
            fleet.map((f) => (
              <div
                key={f.truck.id}
                className={`fleet-item${f.tripId ? ' clickable' : ''}${f.truck.id === DEMO_TRUCK ? ' demo' : ''}`}
                onClick={() => f.tripId && setTripId(f.tripId)}
              >
                <span className="avatar-initials sm">{initials(L(f.driver.name))}</span>
                <div className="fleet-item-body">
                  <div className="fleet-item-top">
                    <b dir="ltr">{f.truck.plate}</b>
                    <MapTag map={maps.truck} status={f.status} />
                  </div>
                  <div className="muted">{L(f.driver.name)}</div>
                  <div className="fleet-next">{f.nextStop ? t('console.map.next', { name: L(f.nextStop) }) : t('console.map.noTrip')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <TripDetailDrawer tripId={tripId} onClose={() => setTripId(null)} />
    </div>
  );
}
