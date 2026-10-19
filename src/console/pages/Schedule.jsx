import { useMemo, useState } from 'react';
import { Alert, Empty, Segmented, Select, Skeleton } from 'antd';
import { ClockCircleOutlined, InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { DRIVERS, assignOrder, listOrders, truck } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { initials } from '../../shared/format.js';
import PageHeader from '../components/PageHeader.jsx';

const NONE = 'none';

// Phase 2 during the pilot: scheduling engine. A day board; the dispatcher assigns each order to a
// driver and truck by hand (no automatic scheduling in the pilot).
export default function Schedule() {
  const { t, L } = useI18n();
  const [day, setDay] = useState('today');
  const date = (day === 'today' ? dayjs() : dayjs().add(1, 'day')).format('YYYY-MM-DD');
  const { data, setData, refresh } = usePoll(() => listOrders(date), [date]);
  const orders = data || [];

  const options = useMemo(
    () => [{ value: NONE, label: t('console.schedule.unassigned') }, ...DRIVERS.map((d) => ({ value: d.id, label: `${L(d.name)} · ${truck(d.truckId).plate}` }))],
    [t, L],
  );
  const columns = [{ id: NONE, title: t('console.schedule.unassigned') }, ...DRIVERS.map((d) => ({ id: d.id, title: L(d.name), sub: truck(d.truckId).plate }))];
  const colOf = (o) => o.assignment?.driverId || NONE;

  const assign = async (o, value) => {
    const driverId = value === NONE ? null : value;
    setData((list) => list.map((x) => (x.id === o.id ? { ...x, assignment: driverId ? { driverId, truckId: DRIVERS.find((d) => d.id === driverId).truckId } : null } : x)));
    await assignOrder(o.id, driverId);
    refresh();
  };

  return (
    <div className="page">
      <PageHeader
        title={t('console.nav.schedule')}
        phase="pilot"
        desc={t('console.schedule.desc')}
        extra={
          <Segmented
            value={day}
            onChange={setDay}
            options={[
              { label: t('console.schedule.today'), value: 'today' },
              { label: t('console.schedule.tomorrow'), value: 'tomorrow' },
            ]}
          />
        }
      />
      <Alert type="info" showIcon message={t('console.schedule.manual')} style={{ marginBottom: 14 }} />
      {!data ? (
        <Skeleton active />
      ) : (
        <div className="board">
          {columns.map((c) => {
            const list = orders.filter((o) => colOf(o) === c.id);
            const pallets = list.reduce((n, o) => n + o.pallets, 0);
            return (
              <div key={c.id} className={`board-col${c.id === NONE ? ' unassigned' : ''}`}>
                <div className="board-col-head">
                  {c.id === NONE ? <InboxOutlined className="board-icon" /> : <span className="avatar-initials sm">{initials(c.title)}</span>}
                  <div className="board-col-title">
                    <b>{c.title}</b>
                    {c.sub ? (
                      <div className="muted small">
                        <bdi>{c.sub}</bdi>
                      </div>
                    ) : null}
                    <div className="muted small">{t('console.schedule.colCount', { n: list.length, p: pallets })}</div>
                  </div>
                </div>
                <div className="board-cards">
                  {list.length ? (
                    list.map((o) => (
                      <div key={o.id} className="order-card">
                        <div className="order-name">{L(o.customer.name)}</div>
                        <div className="muted small">{L(o.customer.address)}</div>
                        <div className="order-meta">
                          <span>
                            {o.pallets} {t('unit.pallets')}
                          </span>
                          <span dir="ltr">
                            <ClockCircleOutlined /> {o.window}
                          </span>
                        </div>
                        <Select size="small" value={colOf(o)} options={options} onChange={(v) => assign(o, v)} popupMatchSelectWidth={false} className="order-select" />
                      </div>
                    ))
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('console.schedule.empty')} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
