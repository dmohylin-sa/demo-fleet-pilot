// Home: Phase 1 scan entry point; Phase 2 adds the shift (go-live), the pre-trip inspection
// and the trip history (during the pilot).
import { Button, Popconfirm, Tag, Progress } from 'antd';
import {
  CameraOutlined, LogoutOutlined, PlayCircleOutlined, StopOutlined, SafetyCertificateOutlined, HistoryOutlined, RightOutlined, LeftOutlined, CarOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useI18n } from '../../i18n/index.js';
import { usePhase, PhaseBadge } from '../../demo/phase.jsx';
import { usePoll } from '../../shared/usePoll.js';
import { fmtTime, fmtMin } from '../../shared/format.js';
import { run } from '../phoneApi.js';
import { Screen, usePhoneUi } from '../ui.jsx';

export default function HomeScreen({ nav }) {
  const { t, L, dir } = useI18n();
  const { toast } = usePhoneUi();
  const phase = usePhase();
  const { data, refresh } = usePoll(() => run('getHome'), [], 3000);
  const Chevron = dir === 'rtl' ? LeftOutlined : RightOutlined;

  if (!data) return <Screen title=" " />;
  const { driver, truck, shift, activeTrip, inspectionToday } = data;
  const onShift = !!shift && !shift.endedAt;
  const needShift = phase.atLeast('golive') && !onShift;
  const firstName = L(driver.name).split(' ')[0];

  const shiftAction = async (action) => {
    try {
      await run(action);
      toast(t(action === 'startShift' ? 'ph.shift.started' : 'ph.shift.ended'), 'success');
      refresh();
    } catch {
      toast(t('ph.err.offline'), 'error');
    }
  };

  return (
    <Screen
      title={
        <div className="home-hello">
          <div>{t('ph.home.hello', { name: firstName })}</div>
          <div className="home-truck">
            <CarOutlined /> {truck.plate} · {truck.model}
          </div>
        </div>
      }
      extra={
        <Popconfirm title={t('ph.home.logout.confirm')} okText={t('common.yes')} cancelText={t('common.no')} onConfirm={() => run('logoutDriver').then(() => nav.reset('login'))}>
          <Button type="text" shape="circle" icon={<LogoutOutlined />} />
        </Popconfirm>
      }
    >
      {phase.visible('golive') ? (
        <div className={`card shift-card${onShift ? ' on' : ''}`}>
          <div className="card-head">
            <span>{t('ph.shift.title')}</span>
            <PhaseBadge phase="golive" short />
          </div>
          {onShift ? (
            <>
              <div className="shift-status">
                <span className="dot-live" /> {t('ph.shift.on', { time: fmtTime(shift.startedAt) })}
                <span className="shift-dur">{fmtMin(dayjs().diff(shift.startedAt, 'minute'))}</span>
              </div>
              <div className="card-note">
                <EnvironmentOutlined /> {t('ph.shift.tracking')}
              </div>
              <Button block icon={<StopOutlined />} disabled={!!activeTrip} onClick={() => shiftAction('endShift')}>
                {t('ph.shift.end')}
              </Button>
            </>
          ) : (
            <>
              <div className="card-note">{t('ph.shift.off')}</div>
              <Button type="primary" block icon={<PlayCircleOutlined />} onClick={() => shiftAction('startShift')}>
                {t('ph.shift.start')}
              </Button>
            </>
          )}
        </div>
      ) : null}

      {phase.visible('pilot') ? (
        <button className="card row-card" onClick={() => nav.go('inspection')}>
          <SafetyCertificateOutlined className="row-icon" style={{ color: inspectionToday ? '#52C41A' : '#FA8C16' }} />
          <div className="row-main">
            <div className="row-title">
              {t('ph.inspection.title')} <PhaseBadge phase="pilot" short />
            </div>
            <div className="row-sub">
              {inspectionToday
                ? t('ph.inspection.done', { time: fmtTime(inspectionToday.at), n: Object.values(inspectionToday.answers).filter((v) => !v).length })
                : t('ph.inspection.todo')}
            </div>
          </div>
          <Chevron className="row-chevron" />
        </button>
      ) : null}

      {activeTrip ? (
        <div className="card trip-card">
          <div className="card-head">
            <span>{t('ph.home.activeTrip')}</span>
            <Tag color="processing">{t('ph.status.active')}</Tag>
          </div>
          <div className="trip-card-line">{activeTrip.customers.map(L).join(' → ')}</div>
          <Progress percent={Math.round((activeTrip.stopsDone / activeTrip.stops.length) * 100)} size="small" format={() => `${activeTrip.stopsDone}/${activeTrip.stops.length}`} />
          <Button type="primary" block onClick={() => nav.go('trip')}>
            {t('ph.home.continue')}
          </Button>
        </div>
      ) : (
        <div className="scan-cta">
          <button className="scan-btn" disabled={needShift} onClick={() => nav.go('capture', { kind: 'bol' })}>
            <CameraOutlined />
            <span>{t('ph.home.scan')}</span>
          </button>
          <div className="scan-hint">{needShift ? t('ph.home.needShift') : t('ph.home.scanHint')}</div>
          <PhaseBadge phase="p1" />
        </div>
      )}

      {phase.visible('pilot') ? (
        <button className="card row-card" onClick={() => nav.go('history')}>
          <HistoryOutlined className="row-icon" />
          <div className="row-main">
            <div className="row-title">
              {t('ph.history.title')} <PhaseBadge phase="pilot" short />
            </div>
            <div className="row-sub">{t('ph.history.sub')}</div>
          </div>
          <Chevron className="row-chevron" />
        </button>
      ) : null}
    </Screen>
  );
}
