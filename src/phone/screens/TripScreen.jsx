// Phase 1 #14: active trip - position reports, delay notification by polling with reroute or keep
// route, Arrived and Complete. Phase 2 go-live: delivery-note photo per drop (#7) and the offline
// queue (#5). Phase 2 during the pilot #27: map inside the app.
import { useEffect } from 'react';
import { Button, Tag, Spin } from 'antd';
import {
  CheckCircleFilled, EnvironmentFilled, ClockCircleOutlined, CameraOutlined, FlagOutlined, WarningFilled, ExportOutlined, CloudUploadOutlined, AimOutlined, ThunderboltFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore } from '../../mock-backend/store.js';
import { customer, distanceKm } from '../../mock-backend/api.js';
import { DEPOT } from '../../mock-backend/seed.js';
import { useI18n } from '../../i18n/index.js';
import { usePhase, PhaseBadge } from '../../demo/phase.jsx';
import { usePoll } from '../../shared/usePoll.js';
import { fmtTime, fmtNum, googleMapsUrl } from '../../shared/format.js';
import MapView from '../../shared/MapView.jsx';
import { run, effectiveStopStatus, noteQueued } from '../phoneApi.js';
import { Screen, Sheet, usePhoneUi } from '../ui.jsx';
import { stopPoint } from './RouteScreen.jsx';

export default function TripScreen({ nav }) {
  const { t, L } = useI18n();
  const { toast } = usePhoneUi();
  const phase = usePhase();
  const golive = phase.atLeast('golive');
  const tripId = useStore((s) => s.phone.activeTripId);
  const queue = useStore((s) => s.phone.queue);
  const offline = useStore((s) => s.phone.offline);
  const position = useStore((s) => s.phone.position);
  const { data: trip, refresh } = usePoll(() => (tripId ? run('getTrip', tripId) : Promise.resolve(null)), [tripId], 2000);
  // Phase 1 checks for delay alerts while this screen is open (every 30 s in the pilot).
  const { data: alerts, refresh: refreshAlerts } = usePoll(() => (tripId && !offline ? run('getAlerts', tripId) : Promise.resolve([])), [tripId, offline], 2500);

  useEffect(() => {
    if (!tripId) nav.reset('home');
  }, [tripId, nav]);

  if (!trip) {
    return (
      <Screen title={t('ph.trip.title')}>
        <div className="center-col">
          <Spin />
        </div>
      </Screen>
    );
  }

  const status = (s) => effectiveStopStatus(s, queue);
  const current = trip.stops.find((s) => status(s) !== 'done');
  const allDone = !current;
  const version = trip.routeVersions.at(-1);
  const pos = position || trip.position || DEPOT;
  const alert = alerts?.[0];
  const remaining = trip.stops.filter((s) => status(s) !== 'done');

  const act = async (action, ...args) => {
    try {
      const res = await run(action, ...args);
      if (res?.queued) toast(t('ph.trip.queued'), 'warning');
      refresh();
      return res;
    } catch (e) {
      toast(e.code === 'offline' ? t('ph.err.offline') : t('ph.err.generic'), 'error');
      return null;
    }
  };

  const respond = async (choice) => {
    await act('respondAlert', alert.id, choice);
    refreshAlerts();
    toast(choice === 'reroute' ? t('ph.delay.rerouted', { v: version.v + 1 }) : t('ph.delay.kept'), 'success');
  };

  const finish = async () => {
    const res = await act('completeTrip', trip.id);
    if (res) nav.resetTo(['home'], ['complete', { summary: res }]);
  };

  return (
    <Screen
      title={t('ph.trip.title')}
      extra={<Tag color="blue">{t('ph.route.version', { v: version.v })}</Tag>}
      footer={
        allDone ? (
          <Button type="primary" size="large" block icon={<FlagOutlined />} disabled={offline} onClick={finish}>
            {offline ? t('ph.trip.finishOffline') : t('ph.trip.finish')}
          </Button>
        ) : null
      }
    >
      {current ? (
        <div className="next-card">
          <div className="next-label">{t('ph.trip.next')}</div>
          <div className="next-name">{L(customer(current.customerId).name)}</div>
          <div className="next-addr">{L(current.addressLabel || customer(current.customerId).address)}</div>
          <div className="next-meta">
            <span>
              <ClockCircleOutlined /> {t('ph.route.eta')} {fmtTime(current.etaAt)}
            </span>
            <span>
              <AimOutlined /> {fmtNum(distanceKm(pos, stopPoint(current)) * 1.25, 1)} {t('unit.km')}
            </span>
          </div>
          <Button ghost block icon={<ExportOutlined />} href={googleMapsUrl(pos, remaining.map(stopPoint))} target="_blank">
            {t('ph.trip.navigate')}
          </Button>
        </div>
      ) : (
        <div className="match-banner ok">
          <CheckCircleFilled />
          <div>
            <div className="match-title">{t('ph.trip.allDone')}</div>
            <div className="match-sub">{t('ph.trip.allDoneSub')}</div>
          </div>
        </div>
      )}

      <div className="share-line">
        <EnvironmentFilled style={{ color: '#52C41A' }} /> {golive ? t('ph.trip.shareBackground') : t('ph.trip.shareOpen')}
      </div>
      {version.v > 1 ? (
        <div className="share-line">
          <ThunderboltFilled style={{ color: '#1677FF' }} /> {t('ph.trip.rerouted')}
        </div>
      ) : null}

      {phase.visible('pilot') ? (
        <div className="route-map">
          <MapView height={160} path={trip.path} stops={trip.stops.map((s) => ({ ...stopPoint(s), label: `${s.order}`, status: status(s) }))} trucks={[{ id: 't1', ...pos, label: '', status: 'on_trip', highlight: true }]} zoomControl={false} fitKey={trip.id + version.v} />
          <PhaseBadge phase="pilot" short style={{ position: 'absolute', top: 8, insetInlineEnd: 8, zIndex: 2 }} />
        </div>
      ) : null}

      <div className="timeline">
        {trip.stops.map((s) => {
          const st = status(s);
          const isCurrent = current && s.id === current.id;
          const queuedHere = queue.some((q) => q.args?.[1] === s.id);
          return (
            <div key={s.id} className={`tl-item ${st}${isCurrent ? ' current' : ''}`}>
              <div className="tl-dot">{st === 'done' ? <CheckCircleFilled /> : s.order}</div>
              <div className="tl-body">
                <div className="tl-name">
                  {L(customer(s.customerId).name)}
                  {queuedHere ? (
                    <Tag icon={<CloudUploadOutlined />} color="warning" style={{ marginInlineStart: 6 }}>
                      {t('ph.trip.waitingSync')}
                    </Tag>
                  ) : null}
                </div>
                <div className="tl-sub">
                  {st === 'done'
                    ? t('ph.trip.deliveredAt', { time: s.completedAt ? fmtTime(s.completedAt) : dayjs().format('HH:mm') })
                    : st === 'arrived'
                      ? t('ph.trip.arrivedAt', { time: fmtTime(s.arrivedAt) })
                      : `${t('ph.route.eta')} ${fmtTime(s.etaAt)} · ${s.pallets} ${t('unit.pallets')}`}
                </div>
                {s.deliveryNote ? (
                  <Tag color={s.deliveryNote.match === 'matched' ? 'success' : 'warning'} style={{ marginTop: 4 }}>
                    {s.deliveryNote.match === 'matched' ? t('ph.trip.noteMatched') : t('ph.trip.noteMismatch')}
                  </Tag>
                ) : null}
                {isCurrent && st === 'pending' ? (
                  <Button type="primary" block style={{ marginTop: 8 }} onClick={() => act('arriveStop', trip.id, s.id)}>
                    {t('ph.trip.arrived')}
                  </Button>
                ) : null}
                {isCurrent && st === 'arrived' ? (
                  <div className="tl-actions">
                    {golive && !s.deliveryNote ? (
                      noteQueued(s.id, queue) ? (
                        <div className="muted small">
                          <CloudUploadOutlined /> {t('ph.trip.noteWaiting')}
                        </div>
                      ) : (
                        <Button block icon={<CameraOutlined />} onClick={() => nav.go('capture', { kind: 'note', tripId: trip.id, stopId: s.id })}>
                          {t('ph.trip.photoNote')} <PhaseBadge phase="golive" short />
                        </Button>
                      )
                    ) : null}
                    <Button type="primary" block onClick={() => act('completeStop', trip.id, s.id)}>
                      {t('ph.trip.complete')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={!!alert}>
        {alert ? (
          <div className="delay-sheet">
            <WarningFilled className="delay-icon" />
            <div className="delay-title">{t('ph.delay.title')}</div>
            <div className="delay-body">{t('ph.delay.body', { n: alert.delayMin, s: alert.savesMin })}</div>
            <Button type="primary" size="large" block onClick={() => respond('reroute')}>
              {t('ph.delay.reroute', { s: alert.savesMin })}
            </Button>
            <Button size="large" block onClick={() => respond('keep')}>
              {t('ph.delay.keep')}
            </Button>
            <div className="muted small center">
              <PhaseBadge phase="p1" short /> {golive ? t('ph.delay.noteGolive') : t('ph.delay.noteP1')}
            </div>
          </div>
        ) : null}
      </Sheet>
    </Screen>
  );
}
