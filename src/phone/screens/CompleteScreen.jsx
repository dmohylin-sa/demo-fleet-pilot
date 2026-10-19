import { Button } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useI18n } from '../../i18n/index.js';
import { fmtNum, fmtMin } from '../../shared/format.js';
import { Screen } from '../ui.jsx';

export default function CompleteScreen({ nav, params }) {
  const { t } = useI18n();
  const s = params.summary;
  return (
    <Screen
      footer={
        <Button type="primary" size="large" block onClick={() => nav.reset('home')}>
          {t('ph.complete.home')}
        </Button>
      }
    >
      <div className="center-col done-col">
        <CheckCircleFilled className="done-icon" />
        <div className="big-msg">{t('ph.complete.title')}</div>
        <div className="muted">{s.id}</div>
        <div className="route-summary">
          <div>
            <b>{s.stops.length}</b>
            <span>{t('ph.complete.deliveries')}</span>
          </div>
          <div>
            <b>{fmtNum(s.km)}</b>
            <span>{t('unit.km')}</span>
          </div>
          <div>
            <b>{fmtMin(s.durationMin)}</b>
            <span>{t('ph.complete.duration')}</span>
          </div>
        </div>
        <div className="muted small center">{t('ph.complete.note')}</div>
      </div>
    </Screen>
  );
}
