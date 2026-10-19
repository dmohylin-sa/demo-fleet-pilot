import { useEffect, useState } from 'react';
import { Empty, Result, Skeleton, Table, Tag, Timeline } from 'antd';
import MapView from '../../shared/MapView.jsx';
import { customer, getTripDetail } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { PhaseBadge, usePhase } from '../../demo/phase.jsx';
import { fmtDateTime, fmtNum, fmtTime, initials } from '../../shared/format.js';
import { InlineDrawer } from './Overlay.jsx';
import FieldTable from './FieldTable.jsx';
import { EventTag, MapTag, MatchTag, ScoreBar, eventValue, useTagMaps } from './Tags.jsx';
import { NotificationRow } from './Notify.jsx';

const STOP_DOT = { done: 'green', arrived: 'orange', pending: 'blue' };

// Phase 2 go-live: trip detail for the dispatcher (route, stops, documents, events), polled while open.
export default function TripDetailDrawer({ tripId, onClose }) {
  const { t, dir } = useI18n();
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (tripId) setShown(tripId);
  }, [tripId]);
  return (
    <InlineDrawer
      open={!!tripId}
      onClose={onClose}
      placement={dir === 'rtl' ? 'left' : 'right'}
      width="min(780px, 94%)"
      title={shown ? t('console.drawer.title', { id: shown }) : ''}
      rootClassName="console-drawer"
      afterOpenChange={(open) => !open && setShown(null)}
      styles={{ body: { padding: 16 } }}
    >
      {shown ? <TripDetail tripId={shown} /> : null}
    </InlineDrawer>
  );
}

function Fact({ label, children }) {
  return (
    <div className="fact">
      <div className="fact-label">{label}</div>
      <div className="fact-value">{children}</div>
    </div>
  );
}

function TripDetail({ tripId }) {
  const { t, L } = useI18n();
  const { visible } = usePhase();
  const maps = useTagMaps();
  const { data: trip, error } = usePoll(() => getTripDetail(tripId), [tripId], 3000);
  if (!trip) return error ? <Result status="warning" title={t('console.drawer.notFound')} /> : <Skeleton active />;

  const point = (s) => (s.lat != null ? s : customer(s.customerId));
  const stopName = (s) => L(customer(s.customerId).name);
  const mapStops = trip.stops.map((s) => ({ key: s.id, lat: point(s).lat, lng: point(s).lng, label: `${s.order}. ${stopName(s)}`, status: s.status }));
  const mapEvents = trip.events.map((e) => ({ id: e.id, lat: e.lat, lng: e.lng, type: e.type, label: `${t(`event.${e.type}`)} · ${fmtTime(e.at)}` }));
  const mapTrucks = trip.position
    ? [{ id: trip.truckId, lat: trip.position.lat, lng: trip.position.lng, label: trip.truckPlate, status: 'on_trip', highlight: trip.truckId === 't1', permanent: true }]
    : [];
  const none = (key) => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t(key)} />;

  return (
    <div className="trip-detail">
      <div className="facts">
        <Fact label={t('console.col.driver')}>
          <span className="who">
            <span className="avatar-initials sm">{initials(L(trip.driverName))}</span>
            {L(trip.driverName)}
          </span>
        </Fact>
        <Fact label={t('console.col.truck')}>{trip.truckPlate}</Fact>
        <Fact label={t('console.col.status')}>
          <MapTag map={maps.trip} status={trip.status} />
        </Fact>
        <Fact label={t('console.col.started')}>{fmtDateTime(trip.startedAt)}</Fact>
        <Fact label={t('console.col.stops')}>
          {trip.stopsDone}/{trip.stops.length}
        </Fact>
        <Fact label={t('console.col.plannedKm')}>
          {fmtNum(trip.km)} {t('unit.km')}
        </Fact>
        <Fact label={t('console.col.bol')}>{trip.bol.docNo}</Fact>
        {visible('pilot') ? (
          <Fact
            label={
              <>
                {t('console.col.score')} <PhaseBadge phase="pilot" short />
              </>
            }
          >
            <ScoreBar value={trip.score} />
          </Fact>
        ) : null}
      </div>

      <div className="map-box">
        <MapView height={250} path={trip.path} stops={mapStops} events={mapEvents} trucks={mapTrucks} fitKey={tripId} />
      </div>

      <div className="split-2">
        <section>
          <h4 className="sub-title">{t('console.drawer.stops')}</h4>
          <Timeline
            className="stop-timeline"
            items={trip.stops.map((s) => ({
              key: s.id,
              color: STOP_DOT[s.status],
              children: (
                <div>
                  <div className="stop-head">
                    <strong>
                      {s.order}. {stopName(s)}
                    </strong>
                    <MapTag map={maps.stop} status={s.status} />
                  </div>
                  <div className="muted">{L(s.addressLabel || customer(s.customerId).address)}</div>
                  <div className="stop-times">
                    {t('console.stop.eta')} {fmtTime(s.etaAt)} · {t('console.stop.arrived')} {fmtTime(s.arrivedAt)} · {t('console.stop.completed')}{' '}
                    {fmtTime(s.completedAt)}
                  </div>
                </div>
              ),
            }))}
          />
        </section>
        <section>
          <h4 className="sub-title">{t('console.drawer.versions')}</h4>
          <Table
            size="small"
            rowKey="v"
            pagination={false}
            dataSource={trip.routeVersions}
            columns={[
              { title: t('console.col.version'), dataIndex: 'v', render: (v) => `v${v}` },
              { title: t('console.col.time'), dataIndex: 'at', render: fmtTime },
              { title: t('console.col.reason'), dataIndex: 'reason', render: (r) => <Tag color={r === 'initial' ? 'default' : 'orange'}>{t(`console.reason.${r}`)}</Tag> },
              { title: t('unit.km'), dataIndex: 'km', render: (v) => fmtNum(v) },
            ]}
          />
        </section>
      </div>

      <h4 className="sub-title">{t('console.drawer.documents')}</h4>
      <div className="split-2">
        <section>
          <div className="doc-head">
            {t('console.doc.bol')} <b>{trip.bol.docNo}</b>
          </div>
          <FieldTable fields={trip.bolFields} />
        </section>
        <section>
          <div className="doc-head">{t('console.doc.notes')}</div>
          {trip.notes.length ? (
            <Table
              size="small"
              rowKey="stopId"
              pagination={false}
              dataSource={trip.notes}
              columns={[
                { title: t('console.col.noteNo'), dataIndex: 'docNo' },
                { title: t('console.col.consignee'), dataIndex: 'customer', render: (v) => L(v) },
                { title: t('console.col.match'), dataIndex: 'match', render: (m, r) => <MatchTag match={m} field={r.mismatchField} /> },
              ]}
            />
          ) : (
            none('console.drawer.noNotes')
          )}
        </section>
      </div>

      <div className="split-2">
        <section>
          <h4 className="sub-title">{t('console.drawer.events')}</h4>
          {trip.events.length ? (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={trip.events}
              columns={[
                { title: t('console.col.time'), dataIndex: 'at', render: fmtTime },
                { title: t('console.col.type'), dataIndex: 'type', render: (v) => <EventTag type={v} /> },
                { title: t('console.col.value'), dataIndex: 'value', render: (_, e) => eventValue(t, e) },
              ]}
            />
          ) : (
            none('console.drawer.noEvents')
          )}
        </section>
        <section>
          <h4 className="sub-title">{t('console.drawer.notifications')}</h4>
          {trip.notifications.length ? trip.notifications.map((n) => <NotificationRow key={n.id} n={n} compact />) : none('console.drawer.noNotifications')}
        </section>
      </div>
    </div>
  );
}
