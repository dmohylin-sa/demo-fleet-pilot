import { PhaseBadge } from '../../demo/phase.jsx';

// Every console page opens with its title, the phase it belongs to and one line on what it is in the pilot.
export default function PageHeader({ title, phase, desc, extra }) {
  return (
    <div className="page-head">
      <div className="page-head-text">
        <h2 className="section-title">
          {title} <PhaseBadge phase={phase} style={{ verticalAlign: 3, marginInlineStart: 6 }} />
        </h2>
        {desc ? <p className="section-desc">{desc}</p> : null}
      </div>
      {extra ? <div className="page-head-extra">{extra}</div> : null}
    </div>
  );
}
