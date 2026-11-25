import Link from 'next/link'
import { Inbox, Search, UserRoundPlus, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/empty-state'
import { MemberCard } from '@/components/member-card'
import { RequestActions } from '@/components/request-actions'
import { getViewer } from '@/lib/auth'
import { repo } from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import type { ConnectionState } from '@/lib/data/repository'

export const dynamic = 'force-dynamic'

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q : undefined
  const viewer = await getViewer()

  const profiles = await repo.listProfiles({ q, excludeId: viewer.user?.id, limit: 24 })

  const [connections, incoming, outgoing] = viewer.user
    ? await Promise.all([
        repo.listConnections(viewer.user.id),
        repo.listIncomingRequests(viewer.user.id),
        repo.listOutgoingRequests(viewer.user.id),
      ])
    : [[], [], []]

  const states = new Map<string, ConnectionState>()
  if (viewer.user) {
    await Promise.all(
      profiles.map(async (profile) => {
        states.set(profile.id, await repo.getConnectionState(viewer.user!.id, profile.id))
      }),
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-primary">Network</p>
          <h1 className="mt-1 text-[1.8rem] font-semibold tracking-tight text-foreground">Friends</h1>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            A simple connection system: send a request, accept or decline, and keep the people you have worked
            with. Connection counts are not used to rank anyone.
          </p>
        </div>
        <form action="/friends" className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ''} placeholder="Search members…" className="pl-10" />
        </form>
      </header>

      {!viewer.user ? (
        <div className="rounded-lg border border-border bg-ai/70 p-4 text-[13px] text-muted-foreground">
          You are browsing as a guest. You can view public profiles, but requests need an account.{' '}
          <Link href="/sign-up" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
          .
        </div>
      ) : null}

      {viewer.user ? (
        <div className="grid gap-3">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <Inbox className="size-4 text-primary" /> Requests
              {incoming.length ? <Badge variant="warning">{incoming.length}</Badge> : null}
            </h2>
            <ul className="mt-3 space-y-2.5">
              {incoming.map((request) => (
                <li key={request.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={request.profile.display_name} src={request.profile.avatar_url} size={30} />
                    <div className="min-w-0">
                      <Link href={`/u/${request.profile.id}`} className="block truncate text-[12.5px] font-medium text-foreground hover:text-primary">
                        {request.profile.display_name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{timeAgo(request.created_at)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <RequestActions connectionId={request.id} mode="incoming" />
                  </div>
                </li>
              ))}
              {!incoming.length ? (
                <li className="rounded-lg border border-dashed border-border p-3 text-center text-[12px] text-muted-foreground">
                  No pending requests.
                </li>
              ) : null}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <Users className="size-4 text-primary" /> Connections
              <Badge variant="muted">{connections.length}</Badge>
            </h2>
            <ul className="mt-3 space-y-2.5">
              {connections.map((connection) => (
                <li key={connection.id} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
                  <Avatar name={connection.profile.display_name} src={connection.profile.avatar_url} size={30} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${connection.profile.id}`} className="block truncate text-[12.5px] font-medium text-foreground hover:text-primary">
                      {connection.profile.display_name}
                    </Link>
                    <p className="truncate text-[11px] text-muted-foreground">{connection.profile.profession ?? 'Member'}</p>
                  </div>
                  <RequestActions connectionId={connection.id} mode="connected" />
                </li>
              ))}
              {!connections.length ? (
                <li className="rounded-lg border border-dashed border-border p-3 text-center text-[12px] text-muted-foreground">
                  No connections yet. Discover people below.
                </li>
              ) : null}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <UserRoundPlus className="size-4 text-primary" /> Sent requests
              <Badge variant="muted">{outgoing.length}</Badge>
            </h2>
            <ul className="mt-3 space-y-2.5">
              {outgoing.map((request) => (
                <li key={request.id} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
                  <Avatar name={request.profile.display_name} src={request.profile.avatar_url} size={30} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${request.profile.id}`} className="block truncate text-[12.5px] font-medium text-foreground hover:text-primary">
                      {request.profile.display_name}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">Sent {timeAgo(request.created_at)}</p>
                  </div>
                  <RequestActions connectionId={request.id} mode="outgoing" />
                </li>
              ))}
              {!outgoing.length ? (
                <li className="rounded-lg border border-dashed border-border p-3 text-center text-[12px] text-muted-foreground">
                  Nothing pending.
                </li>
              ) : null}
            </ul>
          </Card>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-foreground">
            {q ? `Members matching “${q}”` : 'Discover members'}
          </h2>
          {q ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/friends">Clear search</Link>
            </Button>
          ) : null}
        </div>
        {profiles.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {profiles.map((profile) => (
              <MemberCard
                key={profile.id}
                profile={profile}
                signedIn={Boolean(viewer.user)}
                connection={states.get(profile.id) ?? { status: 'none' }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No members found"
            description="Try a different search, or invite someone to join SkillSphere."
          />
        )}
      </section>
    </div>
  )
}
