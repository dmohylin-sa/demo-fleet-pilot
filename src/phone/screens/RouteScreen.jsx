// Phase 1 #13: route screen - ordered stops with ETA, hand-off to Google Maps navigation.
// Phase 2 during the pilot #27: map inside the app.
import { Button, Tag, Spin } from 'antd';
import { CarOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useI18n } from '../../i18n/index.js';
import { usePhase, PhaseBadge } from '../../demo/phase.jsx';
import { usePoll } from '../../shared/usePoll.js';
import { fmtTime, fmtNum, googleMapsUrl } from '../../shared/format.js';
import MapView from '../../shared/MapView.jsx';
import { customer } from '../../mock-backend/api.js';
import { DEPOT } from '../../mock-backend/seed.js';
import { run } from '../phoneApi.js';
import { Screen } from '../ui.jsx';

export const stopPoint = (s) => (s.lat != null ? { lat: s.lat, lng: s.lng } : customer(s.customerId));

export default function RouteScreen({ nav, params }) {
  const { t, L } = useI18n();
  const phase = usePhase();
  const { data: trip } = usePoll(() => run('getTrip', params.tripId), [params.tripId]);

  if (!trip) {
    return (
      <Screen title={t('ph.route.title')}>
        <div className="center-col">
          <Spin />
        </div>
      </Screen>
    );
  }
  const last = trip.stops[trip.stops.length - 1];
  const finish = dayjs(last.etaAt);
  const version = trip.routeVersions.at(-1);
  return (
    <Screen
      title={t('ph.route.title')}
      onBack={nav.back}
      extra={<Tag color="blue">{t('ph.route.version', { v: version.v })}</Tag>}
      footer={
        <div className="footer-2">
          <Button size="large" icon={<ExportOutlined />} href={googleMapsUrl(trip.position || DEPOT, trip.stops.map(stopPoint))} target="_blank">
            {t('ph.route.gmaps')}
          </Button>
          <Button type="primary" size="large" icon={<CarOutlined />} onClick={() => nav.replace('trip')}>
            {t('ph.route.start')}
          </Button>
        </div>
      }
    >
      <div className="route-summary">
        <div>
          <b>{trip.stops.length}</b>
          <span>{t('ph.route.stops')}</span>
        </div>
        <div>
          <b>{fmtNum(version.km)}</b>
          <span>{t('unit.km')}</span>
        </div>
        <div>
          <b>{finish.format('HH:mm')}</b>
          <span>{t('ph.route.finish')}</span>
        </div>
      </div>
      <div className="muted small route-note">{t('ph.route.optimised')}</div>
      {phase.visible('pilot') ? (
        <div className="route-map">
          <MapView height={190} path={trip.path} stops={trip.stops.map((s) => ({ ...stopPoint(s), label: `${s.order}. ${L(customer(s.customerId).name)}`, status: s.status }))} trucks={trip.position ? [{ id: 't1', ...trip.position, label: '', status: 'on_trip', highlight: true }] : []} zoomControl={false} fitKey={trip.id + version.v} />
          <PhaseBadge phase="pilot" short style={{ position: 'absolute', top: 8, insetInlineEnd: 8, zIndex: 2 }} />
        </div>
      ) : null}
      <ol className="stop-list">
        {trip.stops.map((s) => (
          <li key={s.id}>
            <span className="stop-num">{s.order}</span>
            <div className="stop-main">
              <div className="stop-name">{L(customer(s.customerId).name)}</div>
              <div className="stop-addr">{L(s.addressLabel || customer(s.customerId).address)}</div>
            </div>
            <div className="stop-eta">
              <span>{t('ph.route.eta')}</span>
              <b>{fmtTime(s.etaAt)}</b>
            </div>
          </li>
        ))}
      </ol>
    </Screen>
  );
}
