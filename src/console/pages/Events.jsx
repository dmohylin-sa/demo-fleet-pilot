import { useMemo, useState } from 'react';
import { Button, Select, Table } from 'antd';
import { getSettings, listEvents } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { fmtDateTime } from '../../shared/format.js';
import PageHeader from '../components/PageHeader.jsx';
import TripDetailDrawer from '../components/TripDetailDrawer.jsx';
import { DriverFilter, RangeFilter, lastDays, toRange } from '../components/Filters.jsx';
import { EventTag, eventValue } from '../components/Tags.jsx';

const TYPES = ['harsh_braking', 'harsh_acceleration', 'speeding'];
const THRESHOLD = { harsh_braking: 'harshBrakingG', harsh_acceleration: 'harshAccelG', speeding: 'speedThresholdKmh' };

// Phase 2 go-live: harsh events and speeding per trip and driver.
export default function Events() {
  const { t, L } = useI18n();
  const [range, setRange] = useState(() => lastDays(7));
  const [driverId, setDriverId] = useState();
  const [type, setType] = useState();
  const [tripId, setTripId] = useState(null);
  const { from, to } = toRange(range);
  const { data, loading } = usePoll(() => listEvents({ from, to, driverId, type }), [from, to, driverId, type], 5000);
  const { data: settings } = usePoll(getSettings, []);
  const typeOptions = useMemo(() => TYPES.map((v) => ({ value: v, label: t(`event.${v}`) })), [t]);

  return (
    <div className="page">
      <PageHeader title={t('console.nav.events')} phase="golive" desc={t('console.events.desc')} />
      <div className="filter-row">
        <RangeFilter value={range} onChange={setRange} />
        <DriverFilter value={driverId} onChange={setDriverId} />
        <Select allowClear placeholder={t('console.filter.allTypes')} value={type} onChange={setType} options={typeOptions} className="filter-select" />
      </div>
      <Table
        size="small"
        rowKey="id"
        loading={loading && !data}
        dataSource={data || []}
        pagination={{ pageSize: 12, hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: t('console.events.empty') }}
        columns={[
          { title: t('console.col.time'), dataIndex: 'at', render: fmtDateTime },
          { title: t('console.col.driver'), dataIndex: 'driverName', render: (v) => L(v) },
          { title: t('console.col.truck'), dataIndex: 'truckPlate' },
          { title: t('console.col.type'), dataIndex: 'type', render: (v) => <EventTag type={v} /> },
          {
            title: t('console.col.value'),
            key: 'value',
            render: (_, e) => {
              const limit = settings?.[THRESHOLD[e.type]];
              return (
                <span>
                  <b>{eventValue(t, e)}</b>
                  {limit != null ? <span className="muted small"> {t('console.events.vsLimit', { v: eventValue(t, { ...e, value: limit }) })}</span> : null}
                </span>
              );
            },
          },
          {
            title: t('console.col.trip'),
            dataIndex: 'tripId',
            render: (v) =>
              v ? (
                <Button type="link" size="small" className="mono link-cell" onClick={() => setTripId(v)}>
                  {v}
                </Button>
              ) : (
                '-'
              ),
          },
        ]}
      />
      <TripDetailDrawer tripId={tripId} onClose={() => setTripId(null)} />
    </div>
  );
}
