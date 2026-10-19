import { useEffect, useState } from 'react';
import { Layout, Segmented, Button, Popconfirm, Space, App as AntdApp } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useStore } from '../mock-backend/store.js';
import { fleetTick } from '../mock-backend/api.js';
import { useI18n } from '../i18n/index.js';
import PhoneFrame from './PhoneFrame.jsx';
import BrowserFrame from './BrowserFrame.jsx';
import ScenarioRail from './ScenarioRail.jsx';
import DemoControls from './DemoControls.jsx';
import ApiLog from './ApiLog.jsx';
import PhoneApp from '../phone/PhoneApp.jsx';
import ConsoleApp from '../console/ConsoleApp.jsx';

const { Header } = Layout;
const PHONE_H = 784;

function useScale() {
  const calc = () => Math.max(0.68, Math.min(1, (window.innerHeight - 60 - 112) / PHONE_H));
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

export const TruckLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="8" fill="#1677FF" />
    <path d="M6 20h14v-8h4l3 4v4h-2" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
    <circle cx="11" cy="22" r="2.4" fill="#fff" />
    <circle cx="23" cy="22" r="2.4" fill="#fff" />
  </svg>
);

export default function DemoShell() {
  const { t, lang } = useI18n();
  const { message } = AntdApp.useApp();
  const phase = useStore((s) => s.demo.phase);
  const setPhase = useStore((s) => s.setPhase);
  const setLang = useStore((s) => s.setLang);
  const resetDemo = useStore((s) => s.resetDemo);
  const scale = useScale();

  useEffect(() => {
    const id = setInterval(fleetTick, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <Layout className="demo-root">
      <Header className="app-header demo-header">
        <Space size={12} align="center">
          <span className="logo-chip" style={{ padding: 0, background: 'transparent' }}>
            <TruckLogo size={30} />
          </span>
          <div className="demo-title">
            <div className="demo-title-main">{t('app.title')}</div>
            <div className="demo-title-sub">{t('app.subtitle')}</div>
          </div>
        </Space>
        <Space size={14} wrap align="center" className="demo-header-tools">
          <span className="demo-header-label">{t('header.phase')}</span>
          <Segmented
            value={phase}
            onChange={setPhase}
            options={[
              { label: t('header.filter.p1'), value: 'p1' },
              { label: t('header.filter.golive'), value: 'golive' },
              { label: t('header.filter.all'), value: 'all' },
            ]}
          />
          <Segmented
            value={lang}
            onChange={setLang}
            options={[
              { label: 'EN', value: 'en' },
              { label: 'עברית', value: 'he' },
            ]}
          />
          <Popconfirm
            title={t('header.reset.confirm')}
            okText={t('common.yes')}
            cancelText={t('common.no')}
            onConfirm={() => {
              resetDemo();
              window.location.hash = '#/';
              message.success(t('header.reset.done'));
            }}
          >
            <Button icon={<ReloadOutlined />} ghost>
              {t('header.reset')}
            </Button>
          </Popconfirm>
        </Space>
      </Header>

      <div className="demo-rail">
        <ScenarioRail />
      </div>

      <div className="demo-grid">
        <div className="demo-left" style={{ width: 384 * scale }}>
          <PhoneFrame scale={scale}>
            <PhoneApp />
          </PhoneFrame>
        </div>
        <div className="demo-tools" style={{ height: PHONE_H * scale }}>
          <DemoControls />
          <ApiLog />
        </div>
        <div className="demo-right">
          <BrowserFrame height={PHONE_H * scale}>
            <ConsoleApp />
          </BrowserFrame>
        </div>
      </div>
    </Layout>
  );
}
