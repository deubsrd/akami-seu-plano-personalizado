export function AkamiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" className={className} aria-label="Akami">
      <circle cx="26" cy="26" r="21" fill="none" stroke="var(--secondary)" strokeWidth="6" />
      <circle
        cx="26" cy="26" r="21" fill="none"
        stroke="var(--primary)" strokeWidth="6"
        strokeDasharray="132" strokeDashoffset="40" strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="32" textAnchor="middle" fontFamily="'Noto Serif JP', serif" fontSize="18" fill="var(--foreground)">
        赤
      </text>
    </svg>
  );
}
