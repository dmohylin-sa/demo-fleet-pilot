import { Card, theme } from 'antd';

// Compact dashboard metric tile: label, big value, optional sub line + icon chip.
// Color is theme-driven: tone="primary" follows AntD `colorPrimary`; tone="neutral"
// is ink/gray. No hardcoded brand colors.
export default function MetricCard({ label, value, sub, icon, tone = 'neutral' }) {
  const { token } = theme.useToken();
  const isPrimary = tone === 'primary';
  const accent = isPrimary ? token.colorPrimary : token.colorTextHeading;
  const chipBg = isPrimary ? token.colorPrimaryBg : '#EEF0F2';

  return (
    <Card styles={{ body: { padding: 18 } }}>
      <div className="metric-row">
        <div style={{ minWidth: 0 }}>
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ color: accent }}>
            {value}
          </div>
          {sub ? <div className="metric-sub">{sub}</div> : null}
        </div>
        {icon ? (
          <span className="metric-chip" style={{ color: accent, background: chipBg }}>
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
