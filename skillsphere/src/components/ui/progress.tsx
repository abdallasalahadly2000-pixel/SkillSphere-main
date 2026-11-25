import { cn } from '@/lib/utils'

export function Progress({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-md bg-[linear-gradient(90deg,#1877F2,#38BDF8)] transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
