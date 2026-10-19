import { useState } from 'react';
import { App, Button, Card, Form, InputNumber, Skeleton } from 'antd';
import { LockOutlined, SaveOutlined } from '@ant-design/icons';
import { getSettings, saveSettings } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { PhaseBadge, usePhase } from '../../demo/phase.jsx';
import PageHeader from '../components/PageHeader.jsx';

// Phase 2 go-live: thresholds. Delay threshold is a Phase 1 item; diesel price feeds the pilot savings view.
export default function Settings() {
  const { t } = useI18n();
  const { visible } = usePhase();
  const { message } = App.useApp();
  const { data, setData } = usePoll(getSettings, []);
  const [busy, setBusy] = useState(false);

  const save = async (v) => {
    setBusy(true);
    try {
      const patch = { speedThresholdKmh: v.speedThresholdKmh, delayThresholdMin: v.delayThresholdMin };
      if (visible('pilot')) patch.dieselPricePerLiter = v.dieselPricePerLiter;
      setData(await saveSettings(patch));
      message.success(t('console.settings.saved'));
    } finally {
      setBusy(false);
    }
  };

  const label = (key, phase) => (
    <span className="setting-label">
      {t(`console.settings.${key}`)} <PhaseBadge phase={phase} short />
    </span>
  );

  return (
    <div className="page">
      <PageHeader title={t('console.nav.settings')} phase="golive" desc={t('console.settings.desc')} />
      {!data ? (
        <Skeleton active />
      ) : (
        <Card className="settings-card">
          <Form layout="vertical" initialValues={data} onFinish={save} requiredMark={false}>
            <Form.Item name="speedThresholdKmh" label={label('speed', 'golive')} extra={t('console.settings.speed.hint')} rules={[{ required: true }]}>
              <InputNumber min={50} max={130} suffix={t('unit.kmh')} className="num-input" />
            </Form.Item>
            <Form.Item name="delayThresholdMin" label={label('delay', 'p1')} extra={t('console.settings.delay.hint')} rules={[{ required: true }]}>
              <InputNumber min={1} max={120} suffix={t('unit.min')} className="num-input" />
            </Form.Item>
            <div className="settings-fixed">
              <Form.Item name="harshBrakingG" label={label('braking', 'golive')}>
                <InputNumber disabled suffix={t('unit.g')} prefix={<LockOutlined />} className="num-input" />
              </Form.Item>
              <Form.Item name="harshAccelG" label={label('accel', 'golive')}>
                <InputNumber disabled suffix={t('unit.g')} prefix={<LockOutlined />} className="num-input" />
              </Form.Item>
            </div>
            <p className="muted small settings-note">{t('console.settings.fixedNote')}</p>
            {visible('pilot') ? (
              <Form.Item name="dieselPricePerLiter" label={label('diesel', 'pilot')} extra={t('console.settings.diesel.hint')} rules={[{ required: true }]}>
                <InputNumber min={1} max={20} step={0.1} precision={2} suffix={t('console.settings.diesel.unit')} className="num-input" />
              </Form.Item>
            ) : null}
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={busy}>
              {t('common.save')}
            </Button>
          </Form>
        </Card>
      )}
    </div>
  );
}
