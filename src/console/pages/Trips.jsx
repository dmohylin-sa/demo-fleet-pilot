import { useState } from 'react';
import { DatePicker, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { listTrips } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { fmtTime } from '../../shared/format.js';
import PageHeader from '../components/PageHeader.jsx';
import TripDetailDrawer from '../components/TripDetailDrawer.jsx';
import { MapTag, useTagMaps } from '../components/Tags.jsx';

// Phase 2 go-live: trips of a day; a row opens the trip detail.
export default function Trips() {
  const { t, L } = useI18n();
  const maps = useTagMaps();
  const [date, setDate] = useState(dayjs());
  const [tripId, setTripId] = useState(null);
  const day = date.format('YYYY-MM-DD');
  const { data, loading } = usePoll(() => listTrips({ date: day }), [day], 5000);

  return (
    <div className="page">
      <PageHeader
        title={t('console.nav.trips')}
        phase="golive"
        desc={t('console.trips.desc')}
        extra={<DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} format="DD/MM/YYYY" />}
      />
      <Table
        className="clickable-rows"
        size="small"
        rowKey="id"
        loading={loading && !data}
        dataSource={data || []}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        scroll={{ x: 'max-content' }}
        onRow={(r) => ({ onClick: () => setTripId(r.id) })}
        locale={{ emptyText: t('console.trips.empty') }}
        columns={[
          { title: t('console.col.trip'), dataIndex: 'id', render: (v) => <span className="mono">{v}</span> },
          { title: t('console.col.driver'), dataIndex: 'driverName', render: (v) => L(v) },
          { title: t('console.col.truck'), dataIndex: 'truckPlate' },
          { title: t('console.col.status'), dataIndex: 'status', render: (s) => <MapTag map={maps.trip} status={s} /> },
          { title: t('console.col.stops'), key: 'stops', render: (_, r) => `${r.stopsDone}/${r.stops.length}` },
          {
            title: t('console.col.versions'),
            key: 'versions',
            render: (_, r) => (
              <span>
                {r.routeVersions.length}
                {r.routeVersions.length > 1 ? (
                  <Tag color="orange" style={{ marginInlineStart: 6 }}>
                    {t('console.trips.rerouted')}
                  </Tag>
                ) : null}
              </span>
            ),
          },
          { title: t('console.col.started'), dataIndex: 'startedAt', render: fmtTime },
        ]}
      />
      <TripDetailDrawer tripId={tripId} onClose={() => setTripId(null)} />
    </div>
  );
}
