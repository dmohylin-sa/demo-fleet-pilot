// Phase 1 #2, #10: driver login by driver ID and PIN.
import { useState } from 'react';
import { Button, Input, Alert } from 'antd';
import { IdcardOutlined, LockOutlined } from '@ant-design/icons';
import { useI18n } from '../../i18n/index.js';
import { PhaseBadge } from '../../demo/phase.jsx';
import { TruckLogo } from '../../demo/DemoShell.jsx';
import { run } from '../phoneApi.js';

export default function LoginScreen({ nav }) {
  const { t } = useI18n();
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setBusy(true);
    setError(null);
    try {
      await run('loginDriver', id, pin);
      nav.reset('home');
    } catch (e) {
      setError(e.code === 'offline' ? t('ph.err.offline') : t('ph.login.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scr login">
      <div className="login-hero">
        <TruckLogo size={56} />
        <div className="login-brand">TrafixCT</div>
        <div className="login-sub">{t('ph.login.sub')}</div>
      </div>
      <div className="login-form">
        <div className="login-title">
          {t('ph.login.title')} <PhaseBadge phase="p1" short />
        </div>
        <Input size="large" prefix={<IdcardOutlined />} placeholder={t('ph.login.driverId')} inputMode="numeric" value={id} onChange={(e) => setId(e.target.value)} />
        <Input.Password size="large" prefix={<LockOutlined />} placeholder={t('ph.login.pin')} inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} onPressEnter={login} />
        {error ? <Alert type="error" showIcon message={error} /> : null}
        <Button type="primary" size="large" block loading={busy} onClick={login} disabled={!id || !pin}>
          {t('ph.login.submit')}
        </Button>
        <div className="login-hint">
          {t('ph.login.hint')}{' '}
          <a
            onClick={() => {
              setId('1001');
              setPin('1234');
            }}
          >
            {t('ph.login.fill')}
          </a>
        </div>
      </div>
      <div className="login-foot">v1.0 · Android APK</div>
    </div>
  );
}
