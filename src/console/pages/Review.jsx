import { useState } from 'react';
import { App, Button, Input, Result, Skeleton, Space, Table, Tag } from 'antd';
import { CheckCircleFilled, CheckOutlined, CloseCircleFilled, SaveOutlined, WarningOutlined } from '@ant-design/icons';
import { listReview, resolveReview } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { pickLang, useI18n } from '../../i18n/index.js';
import { fieldLabel } from '../../i18n/common.js';
import { fmtDateTime } from '../../shared/format.js';
import DocumentImage from '../../shared/DocumentImage.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { mismatchKey, mismatchLabel } from '../components/Tags.jsx';

const KIND_COLOR = { bol: 'blue', delivery_note: 'purple' };

const reasonText = (t, item) =>
  item.kind === 'bol'
    ? t('console.review.reason.low', { field: fieldLabel(t, item.lowField) })
    : t('console.review.reason.mismatch', { field: mismatchLabel(t, item.lowField) });

// Phase 2 #10: dispatcher review step. Documents with a low-confidence field or a delivery-note
// mismatch wait here; the dispatcher approves them or saves a correction.
export default function Review() {
  const { t, L, lang } = useI18n();
  const [sel, setSel] = useState(null);
  const { data, setData, refresh } = usePoll(listReview, [], 4000);
  const items = data || [];
  const current = items.find((i) => i.docNo === sel) || items[0] || null;

  const onResolved = (docNo) => {
    setData((d) => (d || []).filter((x) => x.docNo !== docNo));
    setSel(null);
    refresh();
  };

  return (
    <div className="page">
      <PageHeader
        title={t('console.nav.review')}
        phase="golive"
        desc={t('console.review.desc')}
        extra={items.length ? <Tag color="warning">{t('console.review.count', { n: items.length })}</Tag> : null}
      />
      {!data ? (
        <Skeleton active />
      ) : !current ? (
        <Result status="success" title={t('console.review.empty')} subTitle={t('console.review.emptySub')} />
      ) : (
        <div className="review-layout">
          <div className="review-list">
            {items.map((i) => (
              <div key={i.docNo} className={`review-item${i.docNo === current.docNo ? ' active' : ''}`} onClick={() => setSel(i.docNo)} role="button">
                <div className="review-item-top">
                  <Tag color={KIND_COLOR[i.kind]}>{t(`console.doc.kind.${i.kind}`)}</Tag>
                  <b className="mono">{i.docNo}</b>
                </div>
                <div className="muted small">
                  {L(i.driverName)} · {fmtDateTime(i.at)}
                </div>
                <div className="review-reason">
                  <WarningOutlined /> {reasonText(t, i)}
                </div>
              </div>
            ))}
          </div>
          <ReviewDetail key={`${current.docNo}-${lang}`} item={current} onResolved={onResolved} />
        </div>
      )}
    </div>
  );
}

function ReviewDetail({ item, onResolved }) {
  const { t, L } = useI18n();
  const { message } = App.useApp();
  const isNote = item.kind === 'delivery_note';
  const flag = isNote ? mismatchKey(item.lowField) : item.lowField;
  const shown = (v) => String(L(v) ?? '');
  const get = (k) => item.fields.find((f) => f.key === k)?.value;
  const [values, setValues] = useState(() => Object.fromEntries(item.fields.map((f) => [f.key, shown(f.value)])));
  const [busy, setBusy] = useState(null);
  const changed = item.fields.filter((f) => values[f.key] !== shown(f.value));

  const act = async (action) => {
    setBusy(action);
    try {
      const num = (v) => (Number.isFinite(Number(v)) && v.trim() !== '' ? Number(v) : v);
      const corrections =
        action === 'correct' ? Object.fromEntries(changed.map((f) => [f.key, typeof f.value === 'number' ? num(values[f.key]) : values[f.key]])) : null;
      await resolveReview(item.docNo, { action, corrections });
      message.success(t(action === 'approve' ? 'console.review.approvedMsg' : 'console.review.correctedMsg', { doc: item.docNo }));
      onResolved(item.docNo);
    } catch {
      setBusy(null);
    }
  };

  // The preview is drawn from the fields as read from the photo; the paper is Hebrew.
  const he = (v) => pickLang('he', v);
  let preview;
  if (isNote) {
    preview = <DocumentImage kind="delivery_note" docNo={get('docNo')} bolRef={get('bolRef')} consignee={he(get('consignee'))} quantity={get('quantity')} />;
  } else {
    const n = Math.min(3, item.fields.filter((f) => f.key.startsWith('consignee_')).length);
    const idx = Array.from({ length: n }, (_, i) => i + 1);
    const sum = idx.reduce((a, k) => a + (Number(get(`pallets_${k}`)) || 0), 0) || 1;
    const total = Number(get('weight_total')) || 0;
    const drops = idx.map((k) => ({
      name: he(get(`consignee_${k}`)),
      address: he(get(`address_${k}`)),
      pallets: get(`pallets_${k}`),
      weightKg: Math.round((total * (Number(get(`pallets_${k}`)) || 0)) / sum),
      handwritten: flag === `pallets_${k}`,
      ambiguous: flag === `address_${k}`,
    }));
    preview = <DocumentImage kind="bol" docNo={get('docNo')} shipper={he(get('shipper'))} plate={get('vehicle')} drops={drops} />;
  }

  const cmp = isNote
    ? [
        { key: 'docNo', label: t('console.match.docNo'), bol: item.bolDocNo, note: get('bolRef') },
        { key: 'consignee', label: t('field.consignee'), bol: item.customer, note: get('consignee') },
        { key: 'quantity', label: t('field.quantity'), bol: item.bolPallets, note: get('quantity') },
      ].map((r) => ({ ...r, ok: shown(r.bol) === shown(r.note) }))
    : null;

  return (
    <div className="review-detail">
      <div className="review-detail-head">
        <Tag color={KIND_COLOR[item.kind]}>{t(`console.doc.kind.${item.kind}`)}</Tag>
        <b className="mono">{item.docNo}</b>
        <span className="muted small">
          {L(item.driverName)} · <span dir="ltr">{item.truckPlate}</span>
          {item.customer ? ` · ${L(item.customer)}` : ''}
        </span>
      </div>
      <div className="review-body">
        <div className="review-preview">{preview}</div>
        <div className="review-form">
          <div className="field-grid">
            {item.fields.map((f) => {
              const flagged = f.key === flag;
              return (
                <div key={f.key} className={`field-cell${flagged ? ' flagged' : ''}`}>
                  <label className="field-label" htmlFor={`rv-${f.key}`}>
                    <span>{fieldLabel(t, f.key)}</span>
                    {flagged ? (
                      <Tag color="orange">{isNote ? t('console.review.mismatchTag') : t('console.review.lowTag', { pct: Math.round(f.confidence * 100) })}</Tag>
                    ) : null}
                  </label>
                  <Input
                    id={`rv-${f.key}`}
                    value={values[f.key]}
                    status={flagged ? 'warning' : undefined}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {cmp ? (
        <>
          <h4 className="sub-title">{t('console.review.compare')}</h4>
          <Table
            size="small"
            rowKey="key"
            pagination={false}
            dataSource={cmp}
            rowClassName={(r) => (r.ok ? '' : 'row-flag')}
            columns={[
              { title: t('console.review.check'), dataIndex: 'label' },
              { title: t('console.doc.bol'), dataIndex: 'bol', render: shown },
              { title: t('console.doc.note'), dataIndex: 'note', render: shown },
              {
                title: t('console.col.match'),
                dataIndex: 'ok',
                render: (ok) =>
                  ok ? (
                    <span className="ok-text">
                      <CheckCircleFilled /> {t('console.status.matched')}
                    </span>
                  ) : (
                    <span className="bad-text">
                      <CloseCircleFilled /> {t('console.status.mismatch')}
                    </span>
                  ),
              },
            ]}
          />
        </>
      ) : null}

      <div className="review-actions">
        <Space wrap>
          <Button type="primary" icon={<CheckOutlined />} loading={busy === 'approve'} disabled={!!busy} onClick={() => act('approve')}>
            {t('console.review.approve')}
          </Button>
          <Button icon={<SaveOutlined />} loading={busy === 'correct'} disabled={!!busy || !changed.length} onClick={() => act('correct')}>
            {changed.length ? t('console.review.saveN', { n: changed.length }) : t('console.review.save')}
          </Button>
        </Space>
        <div className="muted small">{t('console.review.hint')}</div>
      </div>
    </div>
  );
}
