import { Badge } from '@/components/ui/badge'
import { statusLabel } from '@/lib/constants'

const VARIANT: Record<string, 'primary' | 'warning' | 'success' | 'secondary' | 'muted'> = {
  open: 'primary',
  in_progress: 'warning',
  solved: 'success',
  partially_solved: 'secondary',
  unable_to_verify: 'muted',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? 'muted'}>{statusLabel(status)}</Badge>
}
