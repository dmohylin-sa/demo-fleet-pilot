// The driver app (React Native in the pilot), simulated inside the phone frame.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider, Button } from 'antd';
import { WifiOutlined, EnvironmentFilled, CloudUploadOutlined, BellFilled, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore } from '../mock-backend/store.js';
import { useI18n } from '../i18n/index.js';
import { usePhase } from '../demo/phase.jsx';
import { TruckLogo } from '../demo/DemoShell.jsx';
import { PhoneUiContext } from './ui.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import CaptureScreen from './screens/CaptureScreen.jsx';
import ConfirmScreen from './screens/ConfirmScreen.jsx';
import RouteScreen from './screens/RouteScreen.jsx';
import TripScreen from './screens/TripScreen.jsx';
import CompleteScreen from './screens/CompleteScreen.jsx';
import InspectionScreen from './screens/InspectionScreen.jsx';
import HistoryScreen from './screens/HistoryScreen.jsx';
import './phone.css';

const SCREENS = {
  login: LoginScreen,
  home: HomeScreen,
  capture: CaptureScreen,
  confirm: ConfirmScreen,
  route: RouteScreen,
  trip: TripScreen,
  complete: CompleteScreen,
  inspection: InspectionScreen,
  history: HistoryScreen,
};

function useClock() {
  const [now, setNow] = useState(dayjs());
  useEffect(() => {
    const id = setInterval(() => setNow(dayjs()), 15000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function StatusBar({ now, offline, tracking, queued }) {
  return (
    <div className="ph-status" dir="ltr">
      <span className="ph-status-time">{now.format('HH:mm')}</span>
      <span className="ph-status-icons">
        {tracking ? <EnvironmentFilled style={{ color: '#52C41A' }} /> : null}
        {queued ? <CloudUploadOutlined style={{ color: '#FAAD14' }} /> : null}
        {offline ? (
          <span className="ph-airplane">✈</span>
        ) : (
          <>
            <span className="ph-signal">
              <i />
              <i />
              <i />
              <i />
            </span>
            <WifiOutlined />
          </>
        )}
        <span className="ph-battery">
          <i style={{ width: '78%' }} />
        </span>
      </span>
    </div>
  );
}

function PushCard({ push, onOpen, onDismiss, t }) {
  return (
    <div className="push-card" onClick={onOpen}>
      <div className="push-head">
        <TruckLogo size={16} />
        <span>TrafixCT</span>
        <span className="push-time">{dayjs(push.at).format('HH:mm')}</span>
        {onDismiss ? (
          <CloseOutlined
            className="push-x"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          />
        ) : null}
      </div>
      <div className="push-title">{t('ph.push.delay.title')}</div>
      <div className="push-body">{t('ph.push.delay.body', { n: push.delayMin })}</div>
    </div>
  );
}

export default function PhoneApp() {
  const { t } = useI18n();
  const phase = usePhase();
  const now = useClock();
  const screenRef = useRef(null);
  const session = useStore((s) => s.phone.session);
  const locked = useStore((s) => s.phone.locked);
  const offline = useStore((s) => s.phone.offline);
  const queueLen = useStore((s) => s.phone.queue.length);
  const pushes = useStore((s) => s.phone.pushes);
  const shift = useStore((s) => s.db.shifts?.['1001']);
  const mutate = useStore((s) => s.mutate);
  const [stack, setStack] = useState(() => [{ name: session ? 'home' : 'login' }]);
  const [toastMsg, setToastMsg] = useState(null);
  const [dismissed, setDismissed] = useState([]);

  const nav = useMemo(
    () => ({
      go: (name, params) => setStack((s) => [...s, { name, params }]),
      replace: (name, params) => setStack((s) => [...s.slice(0, -1), { name, params }]),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      reset: (name, params) => setStack([{ name, params }]),
      resetTo: (...entries) => setStack(entries.map(([name, params]) => ({ name, params }))),
    }),
    [],
  );

  useEffect(() => {
    if (!session) setStack([{ name: 'login' }]);
    else setStack((s) => (s[0].name === 'login' ? [{ name: 'home' }] : s));
  }, [session]);

  const toastTimer = useRef(null);
  const toast = (msg, type = 'info') => {
    clearTimeout(toastTimer.current);
    setToastMsg({ msg, type });
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  };

  const golive = phase.atLeast('golive');
  const tracking = golive && !!shift && !shift.endedAt && !!session;
  const top = stack[stack.length - 1];
  const Current = SCREENS[top.name] || HomeScreen;
  const banner = golive && !locked && session ? pushes.filter((p) => !dismissed.includes(p.id)).at(-1) : null;
  const openTrip = () => {
    mutate((s) => void (s.phone.locked = false));
    nav.resetTo(['home'], ['trip']);
  };

  return (
    <ConfigProvider getPopupContainer={() => screenRef.current || document.body}>
      <PhoneUiContext.Provider value={{ toast, nav }}>
        <div className="ph" ref={screenRef}>
          <StatusBar now={now} offline={offline} tracking={tracking} queued={golive && queueLen > 0} />
          {golive && offline && session ? (
            <div className="ph-offline">
              {t('ph.offline.banner')}
              {queueLen ? ` · ${t('ph.offline.queued', { n: queueLen })}` : ''}
            </div>
          ) : null}
          <div className="ph-body">
            <Current key={stack.length + top.name} nav={nav} params={top.params || {}} />
          </div>
          {banner ? (
            <div className="push-banner">
              <PushCard push={banner} t={t} onOpen={openTrip} onDismiss={() => setDismissed((d) => [...d, banner.id])} />
            </div>
          ) : null}
          {toastMsg ? <div className={`ph-toast ${toastMsg.type}`}>{toastMsg.msg}</div> : null}
          {locked ? (
            <div className="lock">
              <div className="lock-time">{now.format('HH:mm')}</div>
              <div className="lock-date">{now.format('dddd, D MMMM')}</div>
              <div className="lock-list">
                {golive && session ? (
                  pushes.map((p) => <PushCard key={p.id} push={p} t={t} onOpen={openTrip} />)
                ) : (
                  <div className="lock-note">
                    <BellFilled /> {t('ph.lock.p1note')}
                  </div>
                )}
              </div>
              <Button className="lock-unlock" shape="round" size="large" onClick={() => mutate((s) => void (s.phone.locked = false))}>
                {t('ph.lock.unlock')}
              </Button>
            </div>
          ) : null}
          <div className="ph-gesture">
            <i />
          </div>
        </div>
      </PhoneUiContext.Provider>
    </ConfigProvider>
  );
}
