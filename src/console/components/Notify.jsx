import dayjs from 'dayjs';
import {
  BellOutlined, ClockCircleOutlined, DashboardOutlined, ExceptionOutlined, FileSearchOutlined, ThunderboltOutlined, WarningOutlined,
} from '@ant-design/icons';
import { driver } from '../../mock-backend/api.js';
import { useI18n } from '../../i18n/index.js';

// AntD palette colors, the same ones MapView uses for the event markers.
const TYPES = {
  delay: { icon: <ClockCircleOutlined />, color: '#FA8C16', bg: '#FFF7E6' },
  harsh_braking: { icon: <WarningOutlined />, color: '#F5222D', bg: '#FFF1F0' },
  harsh_acceleration: { icon: <ThunderboltOutlined />, color: '#FA8C16', bg: '#FFF7E6' },
  speeding: { icon: <DashboardOutlined />, color: '#722ED1', bg: '#F9F0FF' },
  review: { icon: <FileSearchOutlined />, color: '#1677FF', bg: '#E6F4FF' },
  mismatch: { icon: <ExceptionOutlined />, color: '#F5222D', bg: '#FFF1F0' },
};
const FALLBACK = { icon: <BellOutlined />, color: '#8C8C8C', bg: '#F5F5F5' };

// Localized notification text built from the notification's params.
export function notifText(t, L, n) {
  const name = L(n.driverName || driver(n.driverId)?.name) || '';
  const text = t(`console.notif.${n.type}`, { driver: name, min: n.delayMin, trip: n.tripId, value: n.value, doc: n.docNo });
  return n.type.startsWith('harsh') && n.value ? `${text} (${n.value} ${t('unit.g')})` : text;
}

export function NotificationRow({ n, onClick, compact = false }) {
  const { t, L, lang } = useI18n();
  const ty = TYPES[n.type] || FALLBACK;
  const cls = ['notif-row', n.read ? '' : 'unread', onClick ? 'clickable' : '', compact ? 'compact' : ''].filter(Boolean).join(' ');
  return (
    <div className={cls} onClick={onClick} role={onClick ? 'button' : undefined}>
      <span className="notif-icon" style={{ color: ty.color, background: ty.bg }}>
        {ty.icon}
      </span>
      <div className="notif-body">
        <div className="notif-text">{notifText(t, L, n)}</div>
        <div className="notif-time">{dayjs(n.at).locale(lang).fromNow()}</div>
      </div>
      {!n.read ? <span className="notif-dot" aria-label={t('console.notif.unread')} /> : null}
    </div>
  );
}
