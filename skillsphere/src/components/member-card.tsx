import Link from 'next/link'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ConnectButton } from '@/components/connect-button'
import type { ConnectionState } from '@/lib/data/repository'
import type { Profile } from '@/lib/types'

export function MemberCard({
  profile,
  signedIn,
  connection,
}: {
  profile: Profile
  signedIn: boolean
  connection: ConnectionState
}) {
  const expertise = profile.skills.filter((skill) => skill.kind === 'expertise').slice(0, 4)
  return (
    <div className="surface flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <Link href={`/u/${profile.id}`}>
          <Avatar name={profile.display_name} src={profile.avatar_url} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/u/${profile.id}`}
            className="block truncate text-[14px] font-semibold text-foreground hover:text-primary"
          >
            {profile.display_name}
          </Link>
          <p className="truncate text-[12px] text-muted-foreground">{profile.profession ?? 'Member'}</p>
          {profile.location ? <p className="truncate text-[11px] text-muted-foreground">{profile.location}</p> : null}
        </div>
        {profile.is_demo ? <Badge variant="demo">Demo</Badge> : null}
      </div>
      {expertise.length ? (
        <div className="flex flex-wrap gap-1.5">
          {expertise.map((skill) => (
            <span
              key={skill.name}
              className="rounded-md border border-border bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {skill.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
        <Link href={`/u/${profile.id}`} className="text-[11.5px] font-medium text-primary hover:underline">
          View profile
        </Link>
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
