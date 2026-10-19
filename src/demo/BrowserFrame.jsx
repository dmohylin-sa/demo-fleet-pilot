import { LockOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';

// Decorative browser window around the dispatcher console.
export default function BrowserFrame({ height, children }) {
  const { pathname } = useLocation();
  const { t } = useI18n();
  return (
    <div className="browser" style={{ height }}>
      <div className="browser-bar" dir="ltr">
        <span className="browser-dots">
          <i />
          <i />
          <i />
        </span>
        <div className="browser-url">
          <LockOutlined style={{ fontSize: 11, color: '#52C41A' }} />
          <span>console.trafixct.co.il{pathname === '/' ? '' : pathname}</span>
        </div>
        <span className="browser-title">{t('browser.title')}</span>
      </div>
      <div className="browser-body">{children}</div>
    </div>
  );
}
