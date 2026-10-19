import { useMemo, useState } from 'react';
import { Button, Select, Table } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getBehaviour } from '../../mock-backend/api.js';
import { downloadFile, toCsv } from '../../mock-backend/csv.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { fmtNum, initials } from '../../shared/format.js';
import PageHeader from '../components/PageHeader.jsx';
import { ScoreBar } from '../components/Tags.jsx';

// Phase 2 during the pilot: driver behaviour statistics per driver and month, with CSV export.
export default function Behaviour() {
  const { t, L, lang } = useI18n();
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'));
  const { data, loading } = usePoll(() => getBehaviour(month), [month]);
  const months = useMemo(
    () => [0, 1, 2].map((i) => dayjs().subtract(i, 'month')).map((m) => ({ value: m.format('YYYY-MM'), label: m.locale(lang).format('MMMM YYYY') })),
    [lang],
  );

  // Built on the client from the table rows.
  const exportCsv = () => {
    const headers = ['driver', 'truck', 'trips', 'km', 'harsh_braking', 'harsh_acceleration', 'speeding', 'score', 'change_vs_previous_month'];
    const rows = (data || []).map((r) => [L(r.driverName), r.plate, r.trips, r.km, r.braking, r.acceleration, r.speeding, r.score ?? '', r.change ?? '']);
    downloadFile(`trafixct_driver_behaviour_${month}.csv`, toCsv(headers, rows));
  };

  return (
    <div className="page">
      <PageHeader
        title={t('console.nav.behaviour')}
        phase="pilot"
        desc={t('console.behaviour.desc')}
        extra={
          <Button icon={<DownloadOutlined />} onClick={exportCsv} disabled={!data}>
            {t('console.export.csv')}
          </Button>
        }
      />
      <div className="filter-row">
        <Select value={month} onChange={setMonth} options={months} className="filter-select" />
      </div>
      <Table
        size="small"
        rowKey="driverId"
        loading={loading && !data}
        dataSource={data || []}
        pagination={false}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: t('console.col.driver'),
            dataIndex: 'driverName',
            render: (v) => (
              <span className="who">
                <span className="avatar-initials sm">{initials(L(v))}</span>
                {L(v)}
              </span>
            ),
          },
          { title: t('console.col.truck'), dataIndex: 'plate' },
          { title: t('console.behaviour.trips'), dataIndex: 'trips', align: 'right' },
          { title: t('console.col.km'), dataIndex: 'km', align: 'right', render: (v) => fmtNum(v) },
          { title: t('event.harsh_braking'), dataIndex: 'braking', align: 'right' },
          { title: t('event.harsh_acceleration'), dataIndex: 'acceleration', align: 'right' },
          { title: t('event.speeding'), dataIndex: 'speeding', align: 'right' },
          { title: t('console.col.score'), dataIndex: 'score', render: (v) => <ScoreBar value={v} /> },
          {
            title: t('console.behaviour.change'),
            dataIndex: 'change',
            render: (v) =>
              v == null ? (
                '-'
              ) : v === 0 ? (
                <span className="muted">0</span>
              ) : (
                <span className={v > 0 ? 'ok-text' : 'bad-text'}>
                  {v > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(v)}
                </span>
              ),
          },
        ]}
      />
      <p className="caption">{t('console.behaviour.caption')}</p>
    </div>
  );
}
