// Phase tagging. Every screen and console page belongs to one phase of the estimate:
//   p1      Phase 1 - the demo (bill of lading to optimized route)
//   golive  Phase 2 go-live (rows 1-18)
//   pilot   Phase 2 during the pilot (rows 19-28)
// The header filter shows Phase 1 only, Phase 1 + go-live, or everything.
import { Tag, Tooltip } from 'antd';
import { useStore } from '../mock-backend/store.js';
import { useI18n } from '../i18n/index.js';

export const PHASES = {
  p1: { rank: 1, color: 'blue' },
  golive: { rank: 2, color: 'purple' },
  pilot: { rank: 3, color: 'gold' },
};

const FILTER_RANK = { p1: 1, golive: 2, all: 3 };

export function usePhase() {
  const filter = useStore((s) => s.demo.phase);
  const max = FILTER_RANK[filter];
  return { filter, max, visible: (p) => PHASES[p].rank <= max, atLeast: (p) => max >= PHASES[p].rank };
}

export function PhaseBadge({ phase, short = false, style }) {
  const { t } = useI18n();
  return (
    <Tooltip title={t(`phase.${phase}.long`)}>
      <Tag color={PHASES[phase].color} style={{ marginInlineEnd: 0, fontSize: 10.5, lineHeight: '18px', paddingInline: 7, ...style }}>
        {t(short ? `phase.${phase}.short` : `phase.${phase}`)}
      </Tag>
    </Tooltip>
  );
}
