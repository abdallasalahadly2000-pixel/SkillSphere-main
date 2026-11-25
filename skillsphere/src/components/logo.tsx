import { cn } from '@/lib/utils'

export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="sphere-fill" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2E8BF7" />
          <stop offset="0.55" stopColor="#1877F2" />
          <stop offset="1" stopColor="#0B5FCE" />
        </linearGradient>
        <radialGradient id="sphere-globe" cx="0.34" cy="0.26" r="0.85">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#EDF5FF" />
          <stop offset="1" stopColor="#C8DEF9" />
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill="url(#sphere-fill)" />
      <circle cx="24" cy="24" r="12.6" fill="url(#sphere-globe)" />
      <path
        d="M14.6 26.2C17 21.9 20.9 19 26.2 17.9"
        stroke="#1877F2"
        strokeOpacity="0.26"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M17.9 31.1C19.6 27.7 22.3 25.2 26.1 23.5"
        stroke="#1877F2"
        strokeOpacity="0.16"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({
  className,
  size = 34,
  showWordmark = true,
}: {
  className?: string
  size?: number
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span className="text-[19px] font-bold tracking-tight text-foreground">
          Skill<span className="text-primary">Sphere</span>
        </span>
      ) : null}
    </span>
  )
}
