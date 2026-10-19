// A drawn stand-in for a photographed Hebrew bill of lading or delivery note.
// Printed fields use a sans font; handwritten ones a cursive font and a blue "pen" color.
import dayjs from 'dayjs';

const INK = '#1f2937';
const PEN = '#1d4ed8';
const HAND = '"Segoe Script","Bradley Hand","Comic Sans MS",cursive';

function Row({ y, label, value, hand, small }) {
  return (
    <g>
      <text x="282" y={y} textAnchor="end" fontSize="9" fill="#6b7280">
        {label}
      </text>
      <text x="200" y={y} textAnchor="end" fontSize={small ? 9.5 : 10.5} fill={hand ? PEN : INK} fontFamily={hand ? HAND : undefined} fontWeight={hand ? 400 : 600}>
        {value}
      </text>
      <line x1="18" x2="282" y1={y + 5} y2={y + 5} stroke="#e5e7eb" strokeWidth="0.8" />
    </g>
  );
}

export default function DocumentImage({ kind = 'bol', docNo, bolRef, shipper = 'הפצה נמל אשדוד', drops = [], plate = '214-55-301', quantity, consignee, width = '100%', tilt = 0 }) {
  const date = dayjs().format('DD/MM/YYYY');
  const isBol = kind === 'bol';
  return (
    <svg viewBox="0 0 300 400" width={width} style={{ display: 'block', transform: `rotate(${tilt}deg)`, filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.25))' }}>
      <rect x="0" y="0" width="300" height="400" rx="4" fill="#fbfaf6" />
      <rect x="0" y="0" width="300" height="400" rx="4" fill="url(#paper)" opacity="0.5" />
      <defs>
        <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#ece7da" />
        </linearGradient>
      </defs>
      <text x="282" y="30" textAnchor="end" fontSize="15" fontWeight="800" fill={INK}>
        {isBol ? 'שטר מטען' : 'תעודת משלוח'}
      </text>
      <text x="18" y="30" fontSize="8.5" fill="#6b7280">
        {isBol ? 'BILL OF LADING' : 'DELIVERY NOTE'}
      </text>
      <text x="18" y="44" fontSize="11" fontWeight="700" fill={INK}>
        {docNo}
      </text>
      <line x1="18" x2="282" y1="52" y2="52" stroke={INK} strokeWidth="1.4" />
      {isBol ? (
        <>
          <Row y={70} label="תאריך" value={date} />
          <Row y={88} label="שולח" value={shipper} />
          <Row y={106} label="רכב" value={plate} />
          <text x="282" y="130" textAnchor="end" fontSize="10" fontWeight="800" fill={INK}>
            נקודות פריקה
          </text>
          {drops.map((d, i) => {
            const y = 148 + i * 62;
            return (
              <g key={i}>
                <rect x="18" y={y - 12} width="264" height="54" rx="3" fill="none" stroke="#d1d5db" />
                <text x="276" y={y + 2} textAnchor="end" fontSize="10" fontWeight="700" fill={INK}>
                  {`${i + 1}. ${d.name}`}
                </text>
                <text x="276" y={y + 18} textAnchor="end" fontSize="9.5" fill={d.ambiguous ? PEN : INK} fontFamily={d.ambiguous ? HAND : undefined}>
                  {d.address}
                </text>
                <text x="276" y={y + 34} textAnchor="end" fontSize="9" fill="#6b7280">
                  משטחים:
                </text>
                <text x="222" y={y + 35} textAnchor="end" fontSize={d.handwritten ? 14 : 10} fill={d.handwritten ? PEN : INK} fontFamily={d.handwritten ? HAND : undefined}>
                  {d.pallets}
                </text>
                <text x="120" y={y + 34} textAnchor="end" fontSize="9" fill="#6b7280">
                  {`משקל: ${d.weightKg} ק"ג`}
                </text>
              </g>
            );
          })}
          <text x="282" y="356" textAnchor="end" fontSize="9" fill="#6b7280">
            חתימת נהג
          </text>
          <path d="M150 352 q12 -14 22 0 t20 -2 t18 4" stroke={PEN} fill="none" strokeWidth="1.3" />
        </>
      ) : (
        <>
          <Row y={74} label="תאריך" value={date} />
          <Row y={96} label="אסמכתא" value={bolRef} />
          <Row y={118} label="לקוח" value={consignee} />
          <Row y={140} label="כמות משטחים" value={quantity} hand />
          <rect x="18" y="168" width="264" height="120" rx="3" fill="none" stroke="#d1d5db" />
          <text x="276" y="186" textAnchor="end" fontSize="9" fill="#6b7280">
            פירוט פריטים
          </text>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1="28" x2="272" y1={206 + i * 20} y2={206 + i * 20} stroke="#eef0f2" />
          ))}
          <text x="282" y="330" textAnchor="end" fontSize="9" fill="#6b7280">
            חתימת מקבל
          </text>
          <path d="M120 326 q10 -16 20 -2 t24 0 t16 -6" stroke={PEN} fill="none" strokeWidth="1.3" />
        </>
      )}
    </svg>
  );
}
