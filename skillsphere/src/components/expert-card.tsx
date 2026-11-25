import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ConnectButton } from '@/components/connect-button'
import type { ConnectionState } from '@/lib/data/repository'
import type { RecommendedUser } from '@/lib/types'

const STRENGTH_LABEL = {
  strong: 'Strong match',
  good: 'Good match',
  related: 'Related',
} as const

export function ExpertCard({
  recommendation,
  signedIn,
  connection,
}: {
  recommendation: RecommendedUser
  signedIn: boolean
  connection: ConnectionState
}) {
  const { profile, strength, reasons } = recommendation
  return (
    <div className="border-t border-border py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-2.5">
        <Link href={`/u/${profile.id}`}>
          <Avatar name={profile.display_name} src={profile.avatar_url} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/u/${profile.id}`}
              className="truncate text-[14.5px] font-semibold text-foreground hover:underline"
            >
              {profile.display_name}
            </Link>
            <Badge variant={strength === 'strong' ? 'success' : strength === 'good' ? 'primary' : 'muted'}>
              {STRENGTH_LABEL[strength]}
            </Badge>
          </div>
          <p className="truncate text-[12.5px] text-muted-foreground">
            {profile.profession ?? 'Member'}
            {profile.is_demo ? ' · demo profile' : ''}
          </p>
          <ul className="mt-1 space-y-0.5">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-1.5 text-[12px] leading-snug text-muted-foreground">
                <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
        <ConnectButton
          targetId={profile.id}
          targetName={profile.display_name}
          state={connection}
          signedIn={signedIn}
        />
      </div>
    </div>
  )
}
