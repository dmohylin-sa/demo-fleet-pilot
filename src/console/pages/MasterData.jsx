import { useState } from 'react';
import { Alert, Button, Skeleton, Space, Table, Tabs, Tag, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { getImportTemplate, getMasterData, truck, validateImport } from '../../mock-backend/api.js';
import { downloadFile } from '../../mock-backend/csv.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import PageHeader from '../components/PageHeader.jsx';

const ENTITIES = ['drivers', 'trucks', 'customers'];

// Phase 2 go-live: master data import. One fixed Excel template per entity; invalid rows are listed and skipped.
export default function MasterData() {
  const { t } = useI18n();
  const { data } = usePoll(getMasterData, []);
  return (
    <div className="page">
      <PageHeader title={t('console.nav.master-data')} phase="golive" desc={t('console.master.desc')} />
      {!data ? (
        <Skeleton active />
      ) : (
        <Tabs items={ENTITIES.map((e) => ({ key: e, label: `${t(`console.master.${e}`)} (${data[e].length})`, children: <EntityTab entity={e} rows={data[e]} /> }))} />
      )}
    </div>
  );
}

function EntityTab({ entity, rows }) {
  const { t, L } = useI18n();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const template = async () => {
    const res = await getImportTemplate(entity);
    downloadFile(res.filename, res.content);
  };
  const upload = (file) => {
    setBusy(true);
    validateImport(entity, file.name)
      .then(setResult)
      .finally(() => setBusy(false));
    return false;
  };

  const columns = {
    drivers: [
      { title: t('console.master.col.driverId'), dataIndex: 'id', render: (v) => <span className="mono">{v}</span> },
      { title: t('console.master.col.name'), dataIndex: 'name', render: (v) => L(v) },
      { title: t('console.master.col.phone'), dataIndex: 'phone' },
      { title: t('console.col.truck'), dataIndex: 'truckId', render: (v) => truck(v)?.plate },
    ],
    trucks: [
      { title: t('console.master.col.plate'), dataIndex: 'plate', render: (v) => <b dir="ltr">{v}</b> },
      { title: t('console.master.col.model'), dataIndex: 'model' },
      { title: t('console.master.col.tracker'), dataIndex: 'tracker', render: (v) => <Tag color={v === 'Ituran' ? 'geekblue' : 'magenta'}>{v}</Tag> },
    ],
    customers: [
      { title: t('console.master.col.customer'), dataIndex: 'name', render: (v) => L(v) },
      { title: t('console.col.address'), dataIndex: 'address', render: (v) => L(v) },
      { title: t('console.master.col.eytam'), dataIndex: 'eytam', render: (v) => <span className="mono">{v}</span> },
    ],
  }[entity];

  return (
    <div>
      <div className="filter-row">
        <Button icon={<DownloadOutlined />} onClick={template}>
          {t('console.master.template')}
        </Button>
        <Upload accept=".xlsx,.xls,.csv" showUploadList={false} beforeUpload={upload} maxCount={1}>
          <Button type="primary" icon={<UploadOutlined />} loading={busy}>
            {t('console.master.upload')}
          </Button>
        </Upload>
        <span className="muted small">{t('console.master.formats')}</span>
      </div>
      {result ? (
        <div className="import-result">
          <Alert
            showIcon
            type={result.invalid.length ? 'warning' : 'success'}
            message={t('console.master.result', { n: result.imported, m: result.total })}
            description={
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <span>
                  {t('console.master.resultFile')} <span className="mono" dir="ltr">{result.fileName}</span>
                  {result.invalid.length ? ` · ${t('console.master.skipped', { n: result.invalid.length })}` : ''}
                </span>
                {result.invalid.length ? (
                  <Table
                    size="small"
                    rowKey="row"
                    pagination={false}
                    dataSource={result.invalid}
                    columns={[
                      { title: t('console.master.col.row'), dataIndex: 'row', width: 90 },
                      { title: t('console.master.col.reason'), dataIndex: 'reason', render: (r) => t(`console.master.reason.${r}`) },
                    ]}
                  />
                ) : null}
              </Space>
            }
          />
        </div>
      ) : null}
      <Table size="small" rowKey={(r) => r.id || r.plate} dataSource={rows} columns={columns} pagination={{ pageSize: 8, hideOnSinglePage: true, showSizeChanger: false }} scroll={{ x: true }} />
    </div>
  );
}
