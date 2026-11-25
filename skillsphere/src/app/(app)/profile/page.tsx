import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2, Compass, MapPin, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/empty-state'
import { ProblemCard } from '@/components/problem-card'
import { ProfileEditor } from '@/components/profile-editor'
import { StatusBadge } from '@/components/status-badge'
import { getViewer } from '@/lib/auth'
import { repo } from '@/lib/data'
import { formatDate } from '@/lib/utils'
import { SKILL_KINDS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function MyProfilePage() {
  const viewer = await getViewer()

  if (!viewer.user) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <h1 className="text-[17px] font-semibold text-foreground">Your profile lives here</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Sign in to see your problems, contributions and the people you have worked with.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild variant="gradient">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-up">Create account</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!viewer.profile) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <h1 className="text-[17px] font-semibold text-foreground">Finish your profile</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Add your name and skills so matching can work.
        </p>
        <Button asChild variant="gradient" className="mt-5">
          <Link href="/onboarding">Complete setup</Link>
        </Button>
      </div>
    )
  }

  const profile = viewer.profile
  const [problems, contributions, connections] = await Promise.all([
    repo.listProblems({ ownerId: profile.id, limit: 50 }),
    repo.listContributions(profile.id),
    repo.listConnections(profile.id),
  ])

  const confirmed = contributions.filter((entry) => entry.confirmed)

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="h-28 bg-[linear-gradient(110deg,#1877F2_0%,#0B5FCE_55%,#38BDF8_100%)] sm:h-32" />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            <div className="rounded-full border-4 border-surface">
              <Avatar name={profile.display_name} src={profile.avatar_url} size={88} />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[1.4rem] font-semibold tracking-tight text-foreground">
                  {profile.display_name}
                </h1>
                {profile.is_demo ? <Badge variant="demo">Demo profile</Badge> : null}
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
            <div className="flex items-center gap-2 pb-1">
              <ProfileEditor profile={profile} />
            </div>
          </div>

          {profile.bio ? (
            <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">{profile.bio}</p>
          ) : (
            <p className="mt-4 text-[13px] text-muted-foreground">
              No bio yet. A sentence about what you work on makes connecting easier.
            </p>
          )}

          <dl className="mt-5 grid max-w-md grid-cols-3 gap-3 border-t border-border pt-4">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Problems</dt>
              <dd className="text-[18px] font-semibold text-foreground">{problems.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Contributions</dt>
              <dd className="text-[18px] font-semibold text-foreground">{confirmed.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Connections</dt>
              <dd className="text-[18px] font-semibold text-foreground">{connections.length}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Tabs defaultValue="about">
          <div className="px-5 pt-3">
            <TabsList>
              <TabsTrigger value="about">About & skills</TabsTrigger>
              <TabsTrigger value="problems">Problems ({problems.length})</TabsTrigger>
              <TabsTrigger value="contributions">Contributions ({confirmed.length})</TabsTrigger>
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
                      <p className="mt-1 text-[12px] text-muted-foreground">Nothing listed yet.</p>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Joined {formatDate(profile.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" /> {connections.length} connections
              </span>
              <Link href="/settings" className="ml-auto font-medium text-primary hover:underline">
                Privacy & preferences →
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="problems" className="mt-0 space-y-3 p-5">
            {problems.length ? (
              problems.map((problem) => <ProblemCard key={problem.id} problem={problem} />)
            ) : (
              <EmptyState
                icon={Compass}
                title="You have not published a problem yet"
                description="Describe something you are stuck on and SkillSphere will suggest skills, related work and people."
                action={
                  <Button asChild variant="gradient" size="sm">
                    <Link href="/problems/new">
                      Publish a problem <ArrowRight />
                    </Link>
                  </Button>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="contributions" className="mt-0 p-5">
            {confirmed.length ? (
              <ul className="space-y-2.5">
                {confirmed.map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-border p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="success">
                        <CheckCircle2 className="size-3" /> Confirmed
                      </Badge>
                      {entry.problem ? <StatusBadge status={entry.problem.status} /> : null}
                      <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(entry.created_at)}</span>
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
              <EmptyState
                icon={CheckCircle2}
                title="No confirmed contributions yet"
                description="When a problem owner confirms your help on a recorded outcome, it appears here. Contributions are always confirmed by the owner, never self-reported."
              />
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
