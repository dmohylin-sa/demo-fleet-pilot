// Phase 2 during the pilot #23: compliance engine, basic pre-trip inspection - a fixed checklist
// of yes/no items with an optional photo.
import { useState } from 'react';
import { Button, Segmented } from 'antd';
import { CameraOutlined, CheckOutlined } from '@ant-design/icons';
import { INSPECTION_ITEMS } from '../../mock-backend/seed.js';
import { useI18n } from '../../i18n/index.js';
import { PhaseBadge } from '../../demo/phase.jsx';
import { run } from '../phoneApi.js';
import { Screen, usePhoneUi } from '../ui.jsx';

export default function InspectionScreen({ nav }) {
  const { t } = useI18n();
  const { toast } = usePhoneUi();
  const [answers, setAnswers] = useState(() => Object.fromEntries(INSPECTION_ITEMS.map((k) => [k, true])));
  const [photo, setPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const issues = INSPECTION_ITEMS.filter((k) => !answers[k]).length;

  const submit = async () => {
    setBusy(true);
    try {
      await run('submitInspection', { answers, photo });
      toast(t('ph.inspection.sent'), 'success');
      nav.back();
    } catch {
      toast(t('ph.err.offline'), 'error');
      setBusy(false);
    }
  };

  return (
    <Screen
      title={t('ph.inspection.title')}
      onBack={nav.back}
      extra={<PhaseBadge phase="pilot" short />}
      footer={
        <Button type="primary" size="large" block loading={busy} onClick={submit}>
          {issues ? t('ph.inspection.submitIssues', { n: issues }) : t('ph.inspection.submitOk')}
        </Button>
      }
    >
      <div className="muted small" style={{ marginBottom: 8 }}>
        {t('ph.inspection.hint')}
      </div>
      <div className="check-list">
        {INSPECTION_ITEMS.map((k) => (
          <div key={k} className={`check-row${answers[k] ? '' : ' bad'}`}>
            <span>{t(`inspect.${k}`)}</span>
            <Segmented
              size="small"
              value={answers[k] ? 'ok' : 'no'}
              onChange={(v) => setAnswers((a) => ({ ...a, [k]: v === 'ok' }))}
              options={[
                { label: t('ph.inspection.ok'), value: 'ok' },
                { label: t('ph.inspection.issue'), value: 'no' },
              ]}
            />
          </div>
        ))}
      </div>
      <Button block icon={photo ? <CheckOutlined /> : <CameraOutlined />} type={photo ? 'default' : 'dashed'} onClick={() => setPhoto((p) => !p)} style={{ marginTop: 10 }}>
        {photo ? t('ph.inspection.photoAdded') : t('ph.inspection.photo')}
      </Button>
    </Screen>
  );
}
