import { CheckOutlined } from '@ant-design/icons';

// Custom horizontal workflow rail - a cleaner alternative to AntD <Steps> when you
// have many stages: it renders full labels without truncation and shows a colored
// progress track (driven by the .rail* rules in styles.css, which use the accent).
//
// Props:
//   stages:  [{ key, label }]   ordered list of stages
//   current: number             index of the active stage (0-based)
//   error:   boolean            render the current dot in the error/declined state
export default function StageRail({ stages, current = 0, error = false }) {
  return (
    <div className="rail">
      {stages.map((s, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        const dotClass = isCurrent ? (error ? 'error' : 'current') : isDone ? 'done' : '';
        return (
          <div className={`rail-step${i <= current ? ' on' : ''}`} key={s.key ?? i}>
            <div className={`rail-dot ${dotClass}`}>{isDone ? <CheckOutlined /> : i + 1}</div>
            <div className={`rail-label${isCurrent ? ' active' : ''}`}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}
