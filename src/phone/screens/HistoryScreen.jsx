// Phase 2 during the pilot #27: trip history in the driver app.
import { useState } from 'react';
import { Tag, Spin, Empty } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useI18n } from '../../i18n/index.js';
import { PhaseBadge } from '../../demo/phase.jsx';
import { usePoll } from '../../shared/usePoll.js';
import { fmtDate, fmtTime, fmtNum } from '../../shared/format.js';
import { customer } from '../../mock-backend/api.js';
import { run } from '../phoneApi.js';
import { Screen } from '../ui.jsx';

export default function HistoryScreen({ nav }) {
  const { t, L } = useI18n();
  const { data } = usePoll(() => run('getTripHistory'), []);
  const [open, setOpen] = useState(null);

  return (
    <Screen title={t('ph.history.title')} onBack={nav.back} extra={<PhaseBadge phase="pilot" short />}>
      {!data ? (
        <div className="center-col">
          <Spin />
        </div>
      ) : data.length === 0 ? (
        <Empty description={t('ph.history.empty')} />
      ) : (
        data.map((trip) => (
          <div key={trip.id} className="card hist-card" onClick={() => setOpen(open === trip.id ? null : trip.id)}>
            <div className="hist-top">
              <b>{fmtDate(trip.startedAt)}</b>
              <span className="muted small">
                {fmtTime(trip.startedAt)} · {trip.stops.length} {t('ph.history.stops')} · {fmtNum(trip.km)} {t('unit.km')}
              </span>
            </div>
            <div className="hist-line">{trip.customers.map(L).join(' → ')}</div>
            {open === trip.id ? (
              <ul className="hist-stops">
                {trip.stops.map((s) => (
                  <li key={s.id}>
                    <CheckCircleFilled style={{ color: '#52C41A' }} /> {L(customer(s.customerId).name)} · {fmtTime(s.completedAt)}
                    {s.deliveryNote ? (
                      <Tag color={s.deliveryNote.match === 'matched' ? 'success' : 'warning'} style={{ marginInlineStart: 6 }}>
                        {s.deliveryNote.docNo}
                      </Tag>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))
      )}
    </Screen>
  );
}
