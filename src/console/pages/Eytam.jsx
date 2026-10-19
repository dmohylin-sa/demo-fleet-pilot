import { useState } from 'react';
import { Alert, App, Button, Table, Tag } from 'antd';
import { CloudUploadOutlined, FileTextOutlined } from '@ant-design/icons';
import { listEytamExports, runEytamExport } from '../../mock-backend/api.js';
import { downloadFile } from '../../mock-backend/csv.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { fmtDate, fmtTime } from '../../shared/format.js';
import PageHeader from '../components/PageHeader.jsx';

// Phase 2 during the pilot: Eytam interface. One-way daily file export of completed deliveries.
export default function Eytam() {
  const { t } = useI18n();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const { data, refresh } = usePoll(listEytamExports, []);

  const run = async () => {
    setBusy(true);
    try {
      const res = await runEytamExport();
      downloadFile(res.filename, res.content);
      message.success(t('console.eytam.done', { n: res.count }));
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title={t('console.nav.eytam')}
        phase="pilot"
        desc={t('console.eytam.desc')}
        extra={
          <Button type="primary" icon={<CloudUploadOutlined />} loading={busy} onClick={run}>
            {t('console.eytam.run')}
          </Button>
        }
      />
      <Alert type="info" showIcon message={t('console.eytam.note')} style={{ marginBottom: 14 }} />
      <Table
        size="small"
        rowKey="id"
        loading={!data}
        dataSource={data || []}
        pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: true }}
        columns={[
          { title: t('console.col.date'), dataIndex: 'date', render: fmtDate },
          { title: t('console.eytam.deliveries'), dataIndex: 'deliveries', align: 'right' },
          {
            title: t('console.eytam.file'),
            dataIndex: 'file',
            render: (v) => (
              <span className="mono" dir="ltr">
                <FileTextOutlined /> {v}
              </span>
            ),
          },
          { title: t('console.col.status'), dataIndex: 'status', render: (s) => <Tag color={s === 'sent' ? 'success' : 'default'}>{t(`console.eytam.status.${s}`)}</Tag> },
          { title: t('console.col.time'), dataIndex: 'at', render: fmtTime },
        ]}
      />
    </div>
  );
}
