import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, CheckCircle2, Lock, MapPin } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConnectButton } from '@/components/connect-button'
import { ProblemCard } from '@/components/problem-card'
import { StatusBadge } from '@/components/status-badge'
import { getViewer } from '@/lib/auth'
import { repo } from '@/lib/data'
import { formatDate } from '@/lib/utils'
import { SKILL_KINDS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [viewer, profile] = await Promise.all([getViewer(), repo.getProfile(id)])
  if (!profile) notFound()

  const isSelf = viewer.user?.id === profile.id
  const connection = viewer.user ? await repo.getConnectionState(viewer.user.id, profile.id) : { status: 'none' as const }
  const canSeeFull =
    profile.profile_visibility === 'public' || isSelf || connection.status === 'accepted'

  const [problems, contributions] = canSeeFull
    ? await Promise.all([repo.listProblems({ ownerId: profile.id, limit: 20 }), repo.listContributions(profile.id)])
    : [[], []]

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="h-24 bg-[linear-gradient(110deg,#1877F2_0%,#0B5FCE_55%,#38BDF8_100%)] sm:h-28" />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-9 flex flex-wrap items-end gap-4">
            <div className="rounded-full border-4 border-surface">
              <Avatar name={profile.display_name} src={profile.avatar_url} size={82} />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[1.35rem] font-semibold tracking-tight text-foreground">
                  {profile.display_name}
                </h1>
                {profile.is_demo ? <Badge variant="demo">Demo profile</Badge> : null}
                {profile.onboarding_complete ? null : <Badge variant="muted">Setup incomplete</Badge>}
              </div>
              <p className="text-[13px] text-muted-foreground">
                {profile.profession ?? 'Member'}
                {profile.location ? (
                  <span className="inline-flex items-center gap-1">
                    {' '}
                    · <MapPin className="size-3" /> {profile.location}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="pb-1">
              {isSelf ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/profile">Edit your profile</Link>
                </Button>
              ) : (
                <ConnectButton
                  targetId={profile.id}
                  targetName={profile.display_name}
                  state={connection}
                  signedIn={Boolean(viewer.user)}
                  size="md"
                />
              )}
            </div>
          </div>

          {profile.bio ? (
            <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">{profile.bio}</p>
          ) : null}

          <p className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <CalendarDays className="size-3.5" /> Joined {formatDate(profile.created_at)}
            {profile.profile_visibility === 'connections' ? ' · Profile limited to connections' : ''}
          </p>
        </div>
      </Card>

      {!canSeeFull ? (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Lock className="size-5" />
          </div>
          <h2 className="text-[15px] font-semibold text-foreground">This profile is limited</h2>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
            {profile.display_name} shares their full profile with connections only. Their public skills are
            below; connect to see published problems and contributions.
          </p>
          <div className="mx-auto mt-4 grid max-w-md gap-4 text-left sm:grid-cols-2">
            {SKILL_KINDS.slice(0, 2).map((kind) => (
              <div key={kind.value}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kind.label}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {profile.skills
                    .filter((skill) => skill.kind === kind.value)
                    .map((skill) => (
                      <span
                        key={skill.name}
                        className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11.5px] text-muted-foreground"
                      >
                        {skill.name}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Tabs defaultValue="about">
            <div className="px-5 pt-3">
              <TabsList>
                <TabsTrigger value="about">About & skills</TabsTrigger>
                <TabsTrigger value="problems">Problems ({problems.length})</TabsTrigger>
                <TabsTrigger value="contributions">
                  Contributions ({contributions.filter((entry) => entry.confirmed).length})
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="about" className="mt-0 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {SKILL_KINDS.map((kind) => {
                  const items = profile.skills.filter((skill) => skill.kind === kind.value)
                  return (
                    <div key={kind.value}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {kind.label}
                      </p>
                      {items.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {items.map((skill) => (
                            <span
                              key={skill.name}
                              className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground"
                            >
                              {skill.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-[12px] text-muted-foreground">Nothing listed.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </TabsContent>
            <TabsContent value="problems" className="mt-0 space-y-3 p-5">
              {problems.length ? (
                problems.map((problem) => <ProblemCard key={problem.id} problem={problem} />)
              ) : (
                <p className="text-[12.5px] text-muted-foreground">No public problems published yet.</p>
              )}
            </TabsContent>
            <TabsContent value="contributions" className="mt-0 p-5">
              {contributions.filter((entry) => entry.confirmed).length ? (
                <ul className="space-y-2.5">
                  {contributions
                    .filter((entry) => entry.confirmed)
                    .map((entry) => (
                      <li key={entry.id} className="rounded-lg border border-border p-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="success">
                            <CheckCircle2 className="size-3" /> Confirmed
                          </Badge>
                          {entry.problem ? <StatusBadge status={entry.problem.status} /> : null}
                        </div>
                        {entry.problem ? (
                          <Link
                            href={`/problems/${entry.problem.id}`}
                            className="mt-1.5 block text-[13px] font-medium text-foreground hover:text-primary"
                          >
                            {entry.problem.title}
                          </Link>
                        ) : null}
                        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{entry.summary}</p>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-[12.5px] text-muted-foreground">No confirmed contributions yet.</p>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  )
}
