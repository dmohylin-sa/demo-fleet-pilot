import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';
import { customer, getTripDetail, listTrips, simulateDelay } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { pickLang, translate, useI18n } from '../../i18n/index.js';
import { fieldLabel } from '../../i18n/common.js';
import { PhaseBadge } from '../../demo/phase.jsx';
import { fmtDate, fmtDateTime, fmtNum, fmtTime } from '../../shared/format.js';
import { notifText } from '../components/Notify.jsx';

// Phase 1 #8: fleet manager web list. A read-only page rendered by the backend itself, English only,
// behind HTTP basic auth, with a "Simulate delay" button for the presentation. Deliberately plain HTML.
const tEn = (key, params) => translate('en', key, params);
const Len = (v) => pickLang('en', v);

function Frame({ children }) {
  const { t, dir } = useI18n();
  return (
    <div className="p1-page" dir="ltr">
      <div className="p1-bar">
        <b>{tEn('console.fleet.brand')}</b>
        <PhaseBadge phase="p1" />
        <span className="p1-auth">
          <LockOutlined /> {tEn('console.fleet.auth')}
        </span>
      </div>
      <div className="p1-note" dir={dir}>
        {t('console.fleet.englishOnly')}
      </div>
      {children}
      <p className="p1-foot">{tEn('console.fleet.foot')}</p>
    </div>
  );
}

const alertText = (a) => tEn('console.fleet.alert', { min: a.delayMin, status: tEn(`console.fleet.alert.${a.status}`) });

export function FleetListPage() {
  const { data } = usePoll(() => listTrips(), [], 3000);
  const trips = data || [];
  const cols = ['trip', 'driver', 'truck', 'status', 'stops', 'bol', 'started', 'alerts'];
  return (
    <Frame>
      <h1>{tEn('console.fleet.listTitle', { date: fmtDate(new Date().toISOString()) })}</h1>
      <p>{tEn('console.fleet.listIntro')}</p>
      {!data ? (
        <p>{tEn('console.fleet.loading')}</p>
      ) : trips.length === 0 ? (
        <p>
          <i>{tEn('console.fleet.empty')}</i>
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              {cols.map((k) => (
                <th key={k}>{tEn(`console.fleet.col.${k}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trips.map((tr) => (
              <tr key={tr.id}>
                <td>
                  <Link to={`/console/fleet/${tr.id}`}>{tr.id}</Link>
                </td>
                <td>{Len(tr.driverName)}</td>
                <td>{tr.truckPlate}</td>
                <td>{tEn(`console.status.${tr.status}`)}</td>
                <td>
                  {tr.stopsDone} / {tr.stops.length}
                </td>
                <td>{tr.bol.docNo}</td>
                <td>{fmtTime(tr.startedAt)}</td>
                <td>{tr.alerts.length ? tr.alerts.map(alertText).join('; ') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Frame>
  );
}

export function FleetTripPage() {
  const { tripId } = useParams();
  const { data: trip, error, refresh } = usePoll(() => getTripDetail(tripId), [tripId], 3000);
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(false);

  const onDelay = async () => {
    setBusy(true);
    try {
      const alert = await simulateDelay(tripId);
      setFlash(alert ? tEn('console.fleet.delay.raised', { min: alert.delayMin }) : tEn('console.fleet.delay.under'));
      refresh();
    } catch {
      setFlash(tEn('console.fleet.delay.noTrip'));
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <p>
      <Link to="/console/fleet">&laquo; {tEn('console.fleet.back')}</Link>
    </p>
  );
  if (!trip) {
    return (
      <Frame>
        {back}
        <p>{error ? tEn('console.fleet.notFound') : tEn('console.fleet.loading')}</p>
      </Frame>
    );
  }

  const kv = [
    ['driver', Len(trip.driverName)],
    ['truck', trip.truckPlate],
    ['status', tEn(`console.status.${trip.status}`)],
    ['started', fmtDateTime(trip.startedAt)],
    ['completed', fmtDateTime(trip.completedAt)],
    ['bol', trip.bol.docNo],
    ['km', fmtNum(trip.km)],
  ];

  return (
    <Frame>
      {back}
      <h1>{tEn('console.fleet.tripTitle', { id: trip.id })}</h1>
      <table className="p1-kv">
        <tbody>
          {kv.map(([k, v]) => (
            <tr key={k}>
              <th>{tEn(`console.fleet.col.${k}`)}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {trip.status === 'active' ? (
        <div className="p1-action">
          <button type="button" className="p1-btn" onClick={onDelay} disabled={busy}>
            {busy ? tEn('console.fleet.delay.busy') : tEn('console.fleet.delay.btn')}
          </button>
          <span className="p1-hint">{tEn('console.fleet.delay.hint')}</span>
        </div>
      ) : null}
      {flash ? <p className="p1-flash">{flash}</p> : null}

      <h2>{tEn('console.fleet.h.stops')}</h2>
      <table>
        <thead>
          <tr>
            {['order', 'consignee', 'address', 'status', 'eta', 'arrived', 'completedAt'].map((k) => (
              <th key={k}>{tEn(`console.fleet.col.${k}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trip.stops.map((s) => (
            <tr key={s.id}>
              <td>{s.order}</td>
              <td>{Len(customer(s.customerId).name)}</td>
              <td>{Len(s.addressLabel || customer(s.customerId).address)}</td>
              <td>{tEn(`console.status.${s.status}`)}</td>
              <td>{fmtTime(s.etaAt)}</td>
              <td>{fmtTime(s.arrivedAt)}</td>
              <td>{fmtTime(s.completedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{tEn('console.fleet.h.versions')}</h2>
      <table>
        <thead>
          <tr>
            {['version', 'created', 'reason', 'km'].map((k) => (
              <th key={k}>{tEn(`console.fleet.col.${k}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trip.routeVersions.map((v) => (
            <tr key={v.v}>
              <td>v{v.v}</td>
              <td>{fmtTime(v.at)}</td>
              <td>{tEn(`console.reason.${v.reason}`)}</td>
              <td>{fmtNum(v.km)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{tEn('console.fleet.h.documents')}</h2>
      <h3>{tEn('console.fleet.bolTitle', { doc: trip.bol.docNo })}</h3>
      <table>
        <thead>
          <tr>
            {['field', 'value', 'confidence'].map((k) => (
              <th key={k}>{tEn(`console.fleet.col.${k}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trip.bolFields.map((f) => (
            <tr key={f.key}>
              <td>{fieldLabel(tEn, f.key)}</td>
              <td>{String(Len(f.value) ?? '')}</td>
              <td className={!f.corrected && f.confidence < 0.7 ? 'p1-low' : ''}>
                {Math.round(f.confidence * 100)}%{f.corrected ? ` (${tEn('console.conf.corrected').toLowerCase()})` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{tEn('console.fleet.h.notifications')}</h2>
      {trip.notifications.length ? (
        <ul>
          {trip.notifications.map((n) => (
            <li key={n.id}>
              {fmtDateTime(n.at)}: {notifText(tEn, Len, n)}
            </li>
          ))}
        </ul>
      ) : (
        <p>
          <i>{tEn('console.fleet.noNotifications')}</i>
        </p>
      )}
    </Frame>
  );
}
