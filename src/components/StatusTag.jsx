import { Tag } from 'antd';

// Generic status pill. Pass a `map` of status -> { label, color } where color is
// any AntD Tag color (semantic keyword like "success"/"processing"/"warning"/"error",
// a preset like "blue"/"green", or a hex). Pill shape comes from styles.css.
//
// Example map:
//   const STATUS = {
//     in_progress:  { label: 'In progress',  color: 'processing' },
//     awaiting:     { label: 'Awaiting info', color: 'warning' },
//     approved:     { label: 'Approved',      color: 'success' },
//     declined:     { label: 'Declined',      color: 'error' },
//   };
export default function StatusTag({ status, map = {} }) {
  const s = map[status] || { label: status, color: 'default' };
  return (
    <Tag color={s.color} style={{ fontWeight: 600, marginInlineEnd: 0 }}>
      {s.label}
    </Tag>
  );
}
