// The TrafixCT mark (same drawing as the demo header) for the console sider and sign-in card.
export default function BrandMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden style={{ flex: 'none', display: 'block' }}>
      <rect width="32" height="32" rx="8" fill="#1677FF" />
      <path d="M6 20h14v-8h4l3 4v4h-2" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
      <circle cx="11" cy="22" r="2.4" fill="#fff" />
      <circle cx="23" cy="22" r="2.4" fill="#fff" />
    </svg>
  );
}
