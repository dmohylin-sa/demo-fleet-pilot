// Phase 1 #12: confirmation screen - extracted fields, each editable in one tap; destinations with
// address candidates to choose from. Phase 2 during the pilot #27: highlighting of uncertain fields
// and address autocomplete.
import { useState } from 'react';
import { Button, Input, InputNumber, Radio, Tag, AutoComplete } from 'antd';
import { EditOutlined, CheckOutlined, SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useI18n } from '../../i18n/index.js';
import { fieldLabel } from '../../i18n/common.js';
import { usePhase, PhaseBadge } from '../../demo/phase.jsx';
import { run } from '../phoneApi.js';
import { Screen, Section, usePhoneUi } from '../ui.jsx';

const NUMERIC = (key) => key.startsWith('pallets_') || key === 'weight_total';
const LOW = 0.7;

function FieldRow({ field, original, editing, onEdit, onSave, highlight, t, L }) {
  const [draft, setDraft] = useState(L(field.value));
  const edited = JSON.stringify(original.value) !== JSON.stringify(field.value);
  const low = !edited && field.confidence < LOW;
  const save = () => onSave(NUMERIC(field.key) ? Number(draft) : draft);
  return (
    <div className={`fld${low && highlight ? ' low' : ''}${edited ? ' edited' : ''}`} onClick={() => !editing && onEdit()}>
      <div className="fld-top">
        <span className="fld-label">{fieldLabel(t, field.key)}</span>
        {edited ? (
          <Tag color="success">{t('ph.confirm.corrected')}</Tag>
        ) : low && highlight ? (
          <Tag color="warning">{t('ph.confirm.check', { n: Math.round(field.confidence * 100) })}</Tag>
        ) : (
          <span className="fld-conf">{Math.round(field.confidence * 100)}%</span>
        )}
      </div>
      {editing ? (
        <div className="fld-edit" onClick={(e) => e.stopPropagation()}>
          {NUMERIC(field.key) ? (
            <InputNumber autoFocus value={draft} onChange={setDraft} onPressEnter={save} style={{ flex: 1 }} />
          ) : (
            <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onPressEnter={save} />
          )}
          <Button type="primary" icon={<CheckOutlined />} onClick={save} />
        </div>
      ) : (
        <div className="fld-value">
          <span>{L(field.value)}</span>
          <EditOutlined className="fld-pen" />
        </div>
      )}
    </div>
  );
}

function AddressSearch({ onPick, t, L }) {
  const [options, setOptions] = useState([]);
  const search = async (q) => {
    const res = await run('geocode', q).catch(() => []);
    setOptions(res.map((c) => ({ value: c.id, label: `${L(c.name)} · ${L(c.label)}`, c })));
  };
  return (
    <AutoComplete
      className="addr-search"
      options={options}
      onSearch={search}
      onSelect={(_, opt) => onPick(opt.c)}
      placeholder={
        <span>
          <SearchOutlined /> {t('ph.confirm.search')}
        </span>
      }
    />
  );
}

export default function ConfirmScreen({ nav, params }) {
  const { extraction } = params;
  const { t, L } = useI18n();
  const { toast } = usePhoneUi();
  const phase = usePhase();
  const highlight = phase.visible('pilot');
  const [fields, setFields] = useState(extraction.fields);
  const [editing, setEditing] = useState(null);
  const [extra, setExtra] = useState({});
  const [picked, setPicked] = useState(() =>
    Object.fromEntries(extraction.drops.map((d) => [d.index, d.candidates[0].score >= 0.9 ? d.candidates[0].id : null])),
  );
  const [busy, setBusy] = useState(false);

  const field = (key) => fields.find((f) => f.key === key);
  const original = (key) => extraction.fields.find((f) => f.key === key);
  const setValue = (key, value) => {
    setFields((fs) => fs.map((f) => (f.key === key ? { ...f, value } : f)));
    setEditing(null);
  };
  const row = (key) => (
    <FieldRow key={key} field={field(key)} original={original(key)} editing={editing === key} onEdit={() => setEditing(key)} onSave={(v) => setValue(key, v)} highlight={highlight} t={t} L={L} />
  );
  const candidatesOf = (d) => [...d.candidates, ...(extra[d.index] || []).filter((c) => !d.candidates.some((b) => b.id === c.id))];
  const allPicked = extraction.drops.every((d) => picked[d.index]);

  const confirm = async () => {
    setBusy(true);
    try {
      const drops = extraction.drops.map((d) => ({
        index: d.index,
        customerId: d.customerId,
        pallets: Number(field(`pallets_${d.index}`).value),
        weightKg: d.weightKg,
        candidate: candidatesOf(d).find((c) => c.id === picked[d.index]),
      }));
      const trip = await run('createTrip', { documentId: extraction.documentId, fields, drops });
      nav.resetTo(['home'], ['route', { tripId: trip.id }]);
    } catch (e) {
      toast(e.code === 'offline' ? t('ph.err.offline') : t('ph.err.generic'), 'error');
      setBusy(false);
    }
  };

  return (
    <Screen
      title={t('ph.confirm.title')}
      onBack={nav.back}
      extra={<PhaseBadge phase="p1" short />}
      footer={
        <Button type="primary" size="large" block loading={busy} disabled={!allPicked} onClick={confirm}>
          {allPicked ? t('ph.confirm.submit') : t('ph.confirm.pickAddress')}
        </Button>
      }
    >
      <div className="confirm-hint">
        {t('ph.confirm.hint')}
        {highlight ? (
          <div className="confirm-hint-pilot">
            <PhaseBadge phase="pilot" short /> {t('ph.confirm.hintPilot')}
          </div>
        ) : null}
      </div>
      <Section title={t('ph.confirm.document')}>
        {['docNo', 'date', 'shipper', 'vehicle'].map(row)}
      </Section>
      {extraction.drops.map((d) => {
        const addr = field(`address_${d.index}`);
        return (
          <Section key={d.index} title={t('ph.confirm.drop', { n: d.index })}>
            {row(`consignee_${d.index}`)}
            {row(`pallets_${d.index}`)}
            <div className={`fld addr${highlight && addr.confidence < LOW ? ' low' : ''}`}>
              <div className="fld-top">
                <span className="fld-label">{t('ph.confirm.onDocument')}</span>
                {highlight && addr.confidence < LOW ? <Tag color="warning">{t('ph.confirm.check', { n: Math.round(addr.confidence * 100) })}</Tag> : <span className="fld-conf">{Math.round(addr.confidence * 100)}%</span>}
              </div>
              <div className="fld-value raw" dir="rtl">
                {d.rawAddress}
              </div>
              <div className="cand-head">
                <EnvironmentOutlined /> {t('ph.confirm.candidates')}
              </div>
              <Radio.Group className="cand-list" value={picked[d.index]} onChange={(e) => setPicked((p) => ({ ...p, [d.index]: e.target.value }))}>
                {candidatesOf(d).map((c) => (
                  <Radio key={c.id} value={c.id}>
                    <span className="cand-label">{L(c.label)}</span>
                    <span className="cand-score">{Math.round(c.score * 100)}%</span>
                  </Radio>
                ))}
              </Radio.Group>
              {highlight ? (
                <div className="addr-search-wrap">
                  <AddressSearch
                    t={t}
                    L={L}
                    onPick={(c) => {
                      setExtra((x) => ({ ...x, [d.index]: [...(x[d.index] || []).filter((y) => y.id !== c.id), c] }));
                      setPicked((p) => ({ ...p, [d.index]: c.id }));
                    }}
                  />
                </div>
              ) : null}
            </div>
          </Section>
        );
      })}
      <Section>{row('weight_total')}</Section>
    </Screen>
  );
}
