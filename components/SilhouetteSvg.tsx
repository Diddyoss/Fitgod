/** Stylized mannequin outline the collage sits on. Stroke only — it should read
 * as a faint guide, never compete with the garment photos. */
export default function SilhouetteSvg({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 400"
      fill="none"
      aria-hidden
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <g stroke="var(--hairline)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="150" cy="42" r="24" />
        <path d="M150 66v18" />
        {/* shoulders and torso */}
        <path d="M150 84c-26 0-46 6-58 14l-10 44 20 8" />
        <path d="M150 84c26 0 46 6 58 14l10 44-20 8" />
        <path d="M102 150l6 84h84l6-84" />
        {/* legs */}
        <path d="M112 234l-6 118h30l10-118" />
        <path d="M188 234l6 118h-30l-10-118" />
        {/* feet */}
        <path d="M106 352h34M160 352h34" />
      </g>
    </svg>
  );
}
