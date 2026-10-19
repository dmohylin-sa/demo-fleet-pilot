// Small building blocks for the driver app screens.
import { createContext, useContext } from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useI18n } from '../i18n/index.js';

export const PhoneUiContext = createContext({ toast: () => {}, nav: null });
export const usePhoneUi = () => useContext(PhoneUiContext);

export function Screen({ title, onBack, extra, footer, children, dark = false, padded = true, className = '' }) {
  const { dir } = useI18n();
  return (
    <div className={`scr${dark ? ' scr-dark' : ''} ${className}`}>
      {title != null || onBack ? (
        <div className="scr-bar">
          {onBack ? (
            <Button type="text" shape="circle" className="scr-back" icon={dir === 'rtl' ? <ArrowRightOutlined /> : <ArrowLeftOutlined />} onClick={onBack} />
          ) : null}
          <div className="scr-title">{title}</div>
          <div className="scr-extra">{extra}</div>
        </div>
      ) : null}
      <div className={`scr-content${padded ? ' padded' : ''}`}>{children}</div>
      {footer ? <div className="scr-footer">{footer}</div> : null}
    </div>
  );
}

// Bottom sheet inside the phone screen (AntD modals would render outside the phone).
export function Sheet({ open, children, onClose }) {
  if (!open) return null;
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {children}
      </div>
    </div>
  );
}

export function Section({ title, extra, children }) {
  return (
    <div className="ph-section">
      {title ? (
        <div className="ph-section-head">
          <span>{title}</span>
          {extra}
        </div>
      ) : null}
      {children}
    </div>
  );
}
