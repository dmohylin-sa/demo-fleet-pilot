import { useState } from 'react';
import { Table, Tag, Tooltip } from 'antd';
import { CameraOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { INSPECTION_ITEMS, listInspections } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { fmtDate, fmtTime } from '../../shared/format.js';
import PageHeader from '../components/PageHeader.jsx';
import { RangeFilter, lastDays, toRange } from '../components/Filters.jsx';

// Phase 2 during the pilot: compliance engine. Fixed pre-trip checklist results per truck and day.
export default function Inspections() {
  const { t, L } = useI18n();
  const [range, setRange] = useState(() => lastDays(7));
  const { from, to } = toRange(range);
  const { data, loading } = usePoll(() => listInspections({ from, to }), [from, to], 5000);

  return (
    <div className="page">
      <PageHeader title={t('console.nav.inspections')} phase="pilot" desc={t('console.inspections.desc')} />
      <div className="filter-row">
        <RangeFilter value={range} onChange={setRange} />
      </div>
      <Table
        className="clickable-rows"
        size="small"
        rowKey="id"
        loading={loading && !data}
        dataSource={data || []}
        pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: true }}
        locale={{ emptyText: t('console.inspections.empty') }}
        expandable={{
          expandRowByClick: true,
          expandedRowRender: (r) => (
            <div className="check-grid">
              {INSPECTION_ITEMS.map((k) => (
                <span key={k} className={`check-item${r.answers[k] ? '' : ' fail'}`}>
                  {r.answers[k] ? <CheckCircleFilled /> : <CloseCircleFilled />} {t(`inspect.${k}`)}
                </span>
              ))}
            </div>
          ),
        }}
        columns={[
          { title: t('console.col.date'), dataIndex: 'date', render: fmtDate },
          { title: t('console.col.time'), dataIndex: 'at', render: fmtTime },
          { title: t('console.col.truck'), dataIndex: 'plate' },
          { title: t('console.col.driver'), dataIndex: 'driverName', render: (v) => L(v) },
          {
            title: t('console.inspections.result'),
            dataIndex: 'issues',
            render: (v) => (v.length ? <Tag color="error">{t('console.inspections.issues', { n: v.length })}</Tag> : <Tag color="success">{t('console.inspections.ok')}</Tag>),
          },
          {
            title: t('console.inspections.photo'),
            dataIndex: 'photo',
            render: (v) =>
              v ? (
                <Tooltip title={t('console.inspections.photoTip')}>
                  <CameraOutlined className="photo-icon" />
                </Tooltip>
              ) : (
                '-'
              ),
          },
        ]}
      />
    </div>
  );
}
