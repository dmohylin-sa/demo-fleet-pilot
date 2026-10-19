import { useState } from 'react';
import { Button, Empty, Skeleton } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { listNotifications, markNotificationsRead } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import PageHeader from '../components/PageHeader.jsx';
import TripDetailDrawer from '../components/TripDetailDrawer.jsx';
import { NotificationRow } from '../components/Notify.jsx';

// Phase 2 go-live: notification list of delays, harsh events and documents waiting for review.
export default function Notifications() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tripId, setTripId] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, refresh } = usePoll(listNotifications, [], 3000);
  const list = data || [];
  const unread = list.filter((n) => !n.read).length;

  const markAll = async () => {
    setBusy(true);
    await markNotificationsRead();
    await refresh();
    setBusy(false);
  };
  const open = (n) => {
    if (n.type === 'review' || n.type === 'mismatch') navigate('/console/review');
    else if (n.tripId) setTripId(n.tripId);
  };

  return (
    <div className="page">
      <PageHeader
        title={t('console.nav.notifications')}
        phase="golive"
        desc={t('console.notifications.desc')}
        extra={
          <Button icon={<CheckOutlined />} onClick={markAll} loading={busy} disabled={!unread}>
            {t('console.notifications.markAll')}
          </Button>
        }
      />
      <p className="caption">{t('console.notifications.caption')}</p>
      <div className="panel">
        {!data ? (
          <Skeleton active />
        ) : list.length ? (
          list.map((n) => <NotificationRow key={n.id} n={n} onClick={() => open(n)} />)
        ) : (
          <Empty description={t('console.notifications.empty')} />
        )}
      </div>
      <TripDetailDrawer tripId={tripId} onClose={() => setTripId(null)} />
    </div>
  );
}
