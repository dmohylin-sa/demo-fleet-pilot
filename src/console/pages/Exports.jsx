import { useState } from 'react';
import { Alert, App, Button, Card } from 'antd';
import { CarOutlined, DownloadOutlined, FileDoneOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { exportCsv } from '../../mock-backend/api.js';
import { downloadFile } from '../../mock-backend/csv.js';
import { useI18n } from '../../i18n/index.js';
import PageHeader from '../components/PageHeader.jsx';
import { RangeFilter, thisMonth, toRange } from '../components/Filters.jsx';

const KINDS = [
  { kind: 'deliveries', icon: <FileDoneOutlined /> },
  { kind: 'events', icon: <ThunderboltOutlined /> },
  { kind: 'performance', icon: <CarOutlined /> },
];

// Phase 2 go-live: CSV reports for Excel (deliveries, driving events, trip performance).
export default function Exports() {
  const { t } = useI18n();
  return (
    <div className="page">
      <PageHeader title={t('console.nav.exports')} phase="golive" desc={t('console.exports.desc')} />
      <div className="card-grid">
        {KINDS.map((k) => (
          <ExportCard key={k.kind} {...k} />
        ))}
      </div>
      <Alert type="info" showIcon message={t('console.exports.noPdf')} style={{ marginTop: 16 }} />
    </div>
  );
}

function ExportCard({ kind, icon }) {
  const { t } = useI18n();
  const { message } = App.useApp();
  const [range, setRange] = useState(thisMonth);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);

  const run = async () => {
    setBusy(true);
    try {
      const res = await exportCsv(kind, toRange(range));
      downloadFile(res.filename, res.content);
      setLast(res);
      message.success(t('console.export.done', { n: res.count }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="export-card">
      <div className="export-head">
        <span className="metric-chip export-chip">{icon}</span>
        <div>
          <div className="export-title">{t(`console.exports.${kind}`)}</div>
          <div className="muted small">{t(`console.exports.${kind}.desc`)}</div>
        </div>
      </div>
      <RangeFilter value={range} onChange={setRange} />
      <Button type="primary" icon={<DownloadOutlined />} block loading={busy} onClick={run} style={{ marginTop: 10 }}>
        {t('console.exports.download')}
      </Button>
      {last ? (
        <div className="export-result">
          {t('console.exports.result', { n: last.count })} <span className="mono" dir="ltr">{last.filename}</span>
        </div>
      ) : null}
    </Card>
  );
}
