import { useState } from 'react';
import { Alert, Button, Card, Form, Input } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { loginDispatcher } from '../../mock-backend/api.js';
import { useI18n } from '../../i18n/index.js';
import { PhaseBadge } from '../../demo/phase.jsx';
import BrandMark from '../components/Brand.jsx';

// Phase 2 go-live: dispatcher sign-in with email and password.
export default function SignIn({ onSignedIn }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async ({ email, password }) => {
    setBusy(true);
    setFailed(false);
    try {
      onSignedIn?.(await loginDispatcher(email, password));
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div className="signin-wrap">
      <Card className="signin-card">
        <div className="signin-head">
          <BrandMark size={34} />
          <div>
            <div className="signin-title">{t('console.signin.title')}</div>
            <div className="muted">{t('console.signin.subtitle')}</div>
          </div>
          <PhaseBadge phase="golive" />
        </div>
        {failed ? <Alert type="error" showIcon message={t('console.signin.failed')} style={{ marginBottom: 14 }} /> : null}
        <Form layout="vertical" requiredMark={false} initialValues={{ email: 'noa@trafixct.co.il', password: 'demo' }} onFinish={submit}>
          <Form.Item name="email" label={t('console.signin.email')} rules={[{ required: true, type: 'email', message: t('console.signin.emailRequired') }]}>
            <Input prefix={<MailOutlined />} dir="ltr" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label={t('console.signin.password')} rules={[{ required: true, message: t('console.signin.passwordRequired') }]}>
            <Input.Password prefix={<LockOutlined />} dir="ltr" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={busy}>
            {t('console.signin.submit')}
          </Button>
        </Form>
        <p className="signin-hint">{t('console.signin.hint')}</p>
      </Card>
    </div>
  );
}
