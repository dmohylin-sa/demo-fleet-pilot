import { Table } from 'antd';
import { useI18n } from '../../i18n/index.js';
import { fieldLabel } from '../../i18n/common.js';
import { ConfidenceTag } from './Tags.jsx';

// Extracted document fields with their confidence. `flagKey` highlights a low-confidence or mismatched field.
export default function FieldTable({ fields = [], flagKey }) {
  const { t, L } = useI18n();
  return (
    <Table
      size="small"
      rowKey="key"
      pagination={false}
      dataSource={fields}
      rowClassName={(f) => (f.key === flagKey ? 'row-flag' : '')}
      columns={[
        { title: t('console.col.field'), dataIndex: 'key', render: (k) => fieldLabel(t, k) },
        { title: t('console.col.value'), dataIndex: 'value', render: (v) => <span className="field-value">{String(L(v) ?? '-')}</span> },
        { title: t('console.col.confidence'), dataIndex: 'confidence', width: 84, render: (c, f) => <ConfidenceTag value={c} corrected={f.corrected} /> },
      ]}
    />
  );
}
