import dayjs from 'dayjs';
import { useShallow } from 'zustand/react/shallow';
import StageRail from '../components/StageRail.jsx';
import { useStore } from '../mock-backend/store.js';
import { DEPOT } from '../mock-backend/seed.js';
import { useI18n } from '../i18n/index.js';

const STEPS = ['login', 'scan', 'confirm', 'drive', 'delay', 'deliver', 'complete', 'console'];

// The suggested walkthrough, ticked off from the demo state itself.
export default function ScenarioRail() {
  const { t } = useI18n();
  const flags = useStore(
    useShallow((s) => {
      const today = dayjs().format('YYYY-MM-DD');
      const trip = s.db.trips.filter((x) => x.driverId === '1001' && x.date === today).at(-1);
      const pos = s.db.livePositions?.t1;
      const moved = !!(trip && pos && (Math.abs(pos.lat - DEPOT.lat) > 0.002 || Math.abs(pos.lng - DEPOT.lng) > 0.002));
      const reviewed = !!trip && Object.values(s.db.reviews).some((r) => r.tripId === trip.id && r.status !== 'needs_review');
      return {
        login: !!s.phone.session,
        scan: !!s.phone.lastScannedDocId || !!trip,
        confirm: !!trip,
        drive: moved,
        delay: !!trip && (s.db.alerts || []).some((a) => a.tripId === trip.id && a.status !== 'pending'),
        deliver: !!trip && trip.stops.some((x) => x.status === 'done'),
        complete: trip?.status === 'completed',
        console: reviewed || (s.demo.phase === 'p1' && trip?.status === 'completed'),
      };
    }),
  );
  const current = STEPS.findIndex((k) => !flags[k]);
  return (
    <div>
      <div className="rail-head">
        <span>{t('rail.hint')}</span>
      </div>
      <StageRail stages={STEPS.map((k) => ({ key: k, label: t(`rail.${k}`) }))} current={current === -1 ? STEPS.length : current} />
    </div>
  );
}
