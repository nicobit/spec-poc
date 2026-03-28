type AdminPortalLogoProps = {
  className?: string;
};

const SEGMENTS = [
  { x: 20, y: 5, rotate: 0 },
  { x: 30.6, y: 9.4, rotate: 45 },
  { x: 35, y: 20, rotate: 90 },
  { x: 30.6, y: 30.6, rotate: 135 },
  { x: 20, y: 35, rotate: 180 },
  { x: 9.4, y: 30.6, rotate: 225 },
  { x: 5, y: 20, rotate: 270 },
  { x: 9.4, y: 9.4, rotate: 315 },
];

export default function AdminPortalLogo({ className = "h-7 w-7" }: AdminPortalLogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="20"
        cy="20"
        r="18.25"
        stroke="color-mix(in srgb, var(--accent-primary) 40%, var(--border-subtle))"
        strokeWidth="1.5"
      />

      {SEGMENTS.map((segment, index) => (
        <rect
          key={index}
          x={segment.x}
          y={segment.y}
          width="8.5"
          height="3.6"
          rx="1.8"
          transform={`rotate(${segment.rotate} ${segment.x} ${segment.y})`}
          fill={index % 2 === 0 ? "var(--text-primary)" : "color-mix(in srgb, var(--text-primary) 82%, var(--accent-primary))"}
          opacity={index % 2 === 0 ? "0.96" : "0.88"}
        />
      ))}

      <circle
        cx="20"
        cy="20"
        r="7.1"
        fill="color-mix(in srgb, var(--surface-panel) 88%, transparent)"
        stroke="color-mix(in srgb, var(--accent-primary) 22%, transparent)"
        strokeWidth="1.2"
      />
    </svg>
  );
}
