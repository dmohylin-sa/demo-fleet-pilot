// Buttons that stand in for the real world: traffic, driving, sensors, signal and the screen lock.
import { useState } from 'react';
import { Card, Button, Switch, Tooltip, App as AntdApp } from 'antd';
import {
  ThunderboltOutlined, CarOutlined, WifiOutlined, AlertOutlined, DashboardOutlined, LockOutlined, ExperimentOutlined, DisconnectOutlined,
} from '@ant-design/icons';
import { useStore } from '../mock-backend/store.js';
import { simulateDelay } from '../mock-backend/api.js';
import { run, setOffline } from '../phone/phoneApi.js';
import { driveToNextStop } from '../phone/driveSim.js';
import { useI18n } from '../i18n/index.js';
import { usePhase, PhaseBadge } from './phase.jsx';

function Ctl({ icon, label, hint, phase, onClick, disabled, loading, reason, active = false }) {
  return (
    <Tooltip title={disabled && reason ? reason : hint} placement="right">
      <Button className="ctl-btn" type={active ? 'primary' : 'default'} ghost={active} icon={icon} onClick={onClick} disabled={disabled} loading={loading}>
        <span className="ctl-row">
          <span className="ctl-label">{label}</span>
          <PhaseBadge phase={phase} short />
        </span>
      </Button>
    </Tooltip>
  );
}

function Toggle({ icon, label, hint, phase, checked, onChange }) {
  return (
    <Tooltip title={hint} placement="right">
      <div className="ctl-row" style={{ padding: '4px 2px' }}>
        {icon}
        <span className="ctl-label">{label}</span>
        <PhaseBadge phase={phase} short />
        <Switch size="small" checked={checked} onChange={onChange} />
      </div>
    </Tooltip>
  );
}

export default function DemoControls() {
  const { t } = useI18n();
  const { message } = AntdApp.useApp();
  const phase = usePhase();
  const tripId = useStore((s) => s.phone.activeTripId);
  const shiftOn = useStore((s) => !!s.db.shifts?.['1001'] && !s.db.shifts['1001'].endedAt);
  const offline = useStore((s) => s.phone.offline);
  const locked = useStore((s) => s.phone.locked);
  const flaky = useStore((s) => s.phone.flaky);
  const mutate = useStore((s) => s.mutate);
  const [driving, setDriving] = useState(false);
  const [busy, setBusy] = useState(null);

  const delay = async () => {
    setBusy('delay');
    try {
      await simulateDelay(tripId);
      message.info(t('controls.sent.delay'));
    } catch {
      message.warning(t('controls.needTrip'));
    } finally {
      setBusy(null);
    }
  };
  const drive = async () => {
    setDriving(true);
    const moved = await driveToNextStop();
    setDriving(false);
    if (moved) message.success(t('controls.arrived'));
  };
  const sendEvent = async (type, value, key) => {
    setBusy(type);
    try {
      const res = await run('postDrivingEvent', type, value);
      message.info(res?.queued ? t('controls.sent.queued') : t(key));
    } catch {
      message.warning(t('controls.needTrip'));
    } finally {
      setBusy(null);
    }
  };
  const toggleOffline = async (v) => {
    const synced = await setOffline(v);
    if (!v && synced) message.success(t('controls.synced', { n: synced }));
  };
  const needShift = phase.atLeast('golive') && !shiftOn;

  return (
    <Card
      className="tool-card"
      title={
        <span>
          <ExperimentOutlined /> {t('controls.title')}
        </span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Ctl icon={<CarOutlined />} label={t('controls.drive')} hint={t('controls.drive.hint')} phase="p1" onClick={drive} loading={driving} disabled={!tripId} reason={t('controls.needTrip')} />
        <Ctl icon={<ThunderboltOutlined />} label={t('controls.delay')} hint={t('controls.delay.hint')} phase="p1" onClick={delay} loading={busy === 'delay'} disabled={!tripId} reason={t('controls.needTrip')} />
        <Ctl
          icon={<DisconnectOutlined />}
          label={t('controls.flaky')}
          hint={t('controls.flaky.hint')}
          phase="p1"
          onClick={() => mutate((s) => void (s.phone.flaky = !s.phone.flaky))}
          active={flaky}
        />
        {phase.visible('golive') ? (
          <>
            <Ctl icon={<AlertOutlined />} label={t('controls.braking')} hint={t('controls.braking.hint')} phase="golive" onClick={() => sendEvent('harsh_braking', 0.58, 'controls.sent.braking')} loading={busy === 'harsh_braking'} disabled={needShift} reason={t('controls.needShift')} />
            <Ctl icon={<DashboardOutlined />} label={t('controls.speeding')} hint={t('controls.speeding.hint')} phase="golive" onClick={() => sendEvent('speeding', 97, 'controls.sent.speeding')} loading={busy === 'speeding'} disabled={needShift} reason={t('controls.needShift')} />
            <Toggle icon={<WifiOutlined />} label={t('controls.offline')} hint={t('controls.offline.hint')} phase="golive" checked={offline} onChange={toggleOffline} />
          </>
        ) : null}
        <Toggle icon={<LockOutlined />} label={t('controls.lock')} hint={t('controls.lock.hint')} phase="golive" checked={locked} onChange={(v) => mutate((s) => void (s.phone.locked = v))} />
      </div>
    </Card>
  );
}
