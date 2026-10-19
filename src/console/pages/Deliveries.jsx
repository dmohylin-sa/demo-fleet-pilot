import { useState } from 'react';
import { App, Button, Skeleton, Space, Table } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { exportCsv, getDeliveryDocuments, listDeliveries } from '../../mock-backend/api.js';
import { downloadFile } from '../../mock-backend/csv.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { fmtDate } from '../../shared/format.js';
import PageHeader from '../components/PageHeader.jsx';
import FieldTable from '../components/FieldTable.jsx';
import { DriverFilter, RangeFilter, TruckFilter, lastDays, toRange } from '../components/Filters.jsx';
import { MapTag, MatchTag, mismatchKey, useTagMaps } from '../components/Tags.jsx';

// Phase 2 go-live: completed deliveries with their documents and extracted fields.
export default function Deliveries() {
  const { t, L } = useI18n();
  const { message } = App.useApp();
  const maps = useTagMaps();
  const [range, setRange] = useState(() => lastDays(7));
  const [driverId, setDriverId] = useState();
  const [truckId, setTruckId] = useState();
  const [busy, setBusy] = useState(false);
  const { from, to } = toRange(range);
  const { data, loading } = usePoll(() => listDeliveries({ from, to, driverId, truckId }), [from, to, driverId, truckId], 5000);

  const onExport = async () => {
    setBusy(true);
    try {
      const res = await exportCsv('deliveries', { from, to });
      downloadFile(res.filename, res.content);
      message.success(t('console.export.done', { n: res.count }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader title={t('console.nav.deliveries')} phase="golive" desc={t('console.deliveries.desc')} />
      <div className="filter-row">
        <RangeFilter value={range} onChange={setRange} />
        <DriverFilter value={driverId} onChange={setDriverId} />
        <TruckFilter value={truckId} onChange={setTruckId} />
        <Button icon={<DownloadOutlined />} onClick={onExport} loading={busy} className="filter-end">
          {t('console.export.csv')}
        </Button>
      </div>
      <Table
        className="clickable-rows"
        size="small"
        rowKey="id"
        loading={loading && !data}
        dataSource={data || []}
        pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: t('console.deliveries.empty') }}
        // A fixed expand column keeps the expanded documents at the visible width of the scrolling table.
        expandable={{ expandedRowRender: (r) => <DeliveryDocs tripId={r.tripId} stopId={r.id} />, expandRowByClick: true, fixed: 'left' }}
        columns={[
          { title: t('console.col.date'), dataIndex: 'date', render: fmtDate },
          { title: t('console.col.consignee'), dataIndex: 'customer', render: (v) => L(v) },
          { title: t('console.col.address'), dataIndex: 'address', render: (v) => L(v) },
          { title: t('console.col.driver'), dataIndex: 'driverName', render: (v) => L(v) },
          { title: t('console.col.truck'), dataIndex: 'truckPlate' },
          { title: t('console.col.amount'), dataIndex: 'pallets', render: (v) => `${v} ${t('unit.pallets')}` },
          { title: t('console.col.bolNo'), dataIndex: 'bolDocNo' },
          { title: t('console.col.noteNo'), dataIndex: 'noteDocNo', render: (v) => v || '-' },
          {
            title: t('console.col.match'),
            key: 'match',
            render: (_, r) => (
              <Space size={4} wrap>
                <MatchTag match={r.match === 'pending' ? 'no_note' : r.match} />
                {r.reviewStatus ? <MapTag map={maps.review} status={r.reviewStatus} /> : null}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}

function DeliveryDocs({ tripId, stopId }) {
  const { t } = useI18n();
  const { data } = usePoll(() => getDeliveryDocuments(tripId, stopId), [tripId, stopId]);
  if (!data) return <Skeleton active paragraph={{ rows: 3 }} />;
  return (
    <div className="split-2 docs-pair">
      <section>
        <div className="doc-head">
          {t('console.doc.bol')} <b>{data.bol.docNo}</b>
        </div>
        <FieldTable fields={data.bol.fields} />
      </section>
      <section>
        <div className="doc-head">
          {t('console.doc.note')} <b>{data.note?.docNo || '-'}</b>
          {data.note ? <MatchTag match={data.note.match} field={data.note.mismatchField} /> : null}
        </div>
        {data.note ? <FieldTable fields={data.note.fields} flagKey={data.note.mismatchField && mismatchKey(data.note.mismatchField)} /> : <p className="muted">{t('console.drawer.noNotes')}</p>}
      </section>
    </div>
  );
}
