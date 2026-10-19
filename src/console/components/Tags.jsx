import { useMemo } from 'react';
import { Progress, Tag, Tooltip } from 'antd';
import StatusTag from '../../components/StatusTag.jsx';
import { useI18n } from '../../i18n/index.js';
import { fieldLabel } from '../../i18n/common.js';

// Status vocabularies shared by the console pages. Colors follow the map markers in MapView.
export function useTagMaps() {
  const { t } = useI18n();
  return useMemo(() => {
    const m = (pairs) => Object.fromEntries(pairs.map(([k, color]) => [k, { label: t(`console.status.${k}`), color }]));
    return {
      trip: m([['active', 'processing'], ['completed', 'success']]),
      stop: m([['pending', 'blue'], ['arrived', 'gold'], ['done', 'success']]),
      truck: m([['on_trip', 'blue'], ['on_shift', 'cyan'], ['off', 'default']]),
      match: m([['matched', 'success'], ['mismatch', 'error'], ['no_note', 'default']]),
      review: m([['needs_review', 'warning'], ['approved', 'success'], ['corrected', 'blue']]),
    };
  }, [t]);
}

export function MapTag({ map, status }) {
  return <StatusTag status={status} map={map} />;
}

// Extraction confidence per field (Vertex AI document reading).
export function ConfidenceTag({ value, corrected }) {
  const { t } = useI18n();
  if (corrected) return <Tag color="blue">{t('console.conf.corrected')}</Tag>;
  if (value == null) return null;
  const color = value >= 0.85 ? 'success' : value >= 0.7 ? 'gold' : 'orange';
  return (
    <Tooltip title={t('console.conf.tip')}>
      <Tag color={color}>{Math.round(value * 100)}%</Tag>
    </Tooltip>
  );
}

const EVENT_TAG = { harsh_braking: 'red', harsh_acceleration: 'orange', speeding: 'purple' };

export function EventTag({ type }) {
  const { t } = useI18n();
  return <Tag color={EVENT_TAG[type] || 'default'}>{t(`event.${type}`)}</Tag>;
}

// Delivery note matched against the bill of lading on document number, consignee and quantity.
export function MatchTag({ match, field }) {
  const { t } = useI18n();
  if (match === 'mismatch') {
    return <Tag color="error">{field ? t('console.match.mismatchOn', { field: mismatchLabel(t, field) }) : t('console.status.mismatch')}</Tag>;
  }
  if (match === 'matched') return <Tag color="success">{t('console.status.matched')}</Tag>;
  return <Tag>{t('console.status.no_note')}</Tag>;
}

// Fuel-efficiency score, 0-100 (Phase 2 during the pilot).
export const scoreColor = (v) => (v >= 85 ? '#52C41A' : v >= 70 ? '#FAAD14' : '#F5222D');

export function ScoreBar({ value }) {
  if (value == null) return '-';
  return <Progress percent={value} size={[64, 6]} strokeColor={scoreColor(value)} format={(p) => p} className="score-bar" />;
}

// Harsh events are measured in g, speeding in km/h.
export const eventValue = (t, e) => `${e.value} ${t(e.type === 'speeding' ? 'unit.kmh' : 'unit.g')}`;

// A delivery-note mismatch on "docNo" means its bill-of-lading reference does not match.
export const mismatchLabel = (t, field) => (field === 'docNo' ? t('console.match.docNo') : fieldLabel(t, field));
export const mismatchKey = (field) => (field === 'docNo' ? 'bolRef' : field);
