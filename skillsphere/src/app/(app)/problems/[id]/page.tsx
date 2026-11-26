
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Layers,
  Lightbulb,
  Lock,
  MessageSquare,
  Users,
  Wrench,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoryIcon } from '@/components/category-icon'
import { CommentSection } from '@/components/comment-section'
import { ExpertCard } from '@/components/expert-card'
import { OwnerProblemActions } from '@/components/owner-problem-actions'
import { SolutionPanel } from '@/components/solution-panel'
import { StatusBadge } from '@/components/status-badge'
import { WorkspacePanel } from '@/components/workspace-panel'
import { getViewer } from '@/lib/auth'
import { repo } from '@/lib/data'
import { rankContributors } from '@/lib/matching'
import { findSimilarProblems } from '@/lib/similarity'
import { categoryLabel, helpTypeLabel } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { ConnectionState } from '@/lib/data/repository'
import type { Contribution } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const viewer = await getViewer()
  const problem = await repo.getProblem(id)

  if (!problem) notFound()

  const isOwner = viewer.user?.id === problem.owner_id
  const canManage = viewer.user
    ? await repo.canManageWorkspace(id, viewer.user.id)
    : false

  const [
    comments,
    candidates,
    allProblems,
    contributors,
    solution,
    tasks,
    resources,
  ] = await Promise.all([
    repo.listComments(id, viewer.user?.id ?? null),
    repo.listProfiles({ excludeId: problem.owner_id, limit: 24 }),
    repo.listProblems({ limit: 80 }),
    repo.listContributors(id),
    repo.getSolution(id),
    canManage ? repo.listTasks(id) : Promise.resolve([]),
    canManage ? repo.listResources(id) : Promise.resolve([]),
  ])

  const similar = findSimilarProblems(problem, allProblems, 3)

  const contributionsByUser = new Map<string, Contribution[]>()

  await Promise.all(
    candidates.slice(0, 8).map(async (profile) => {
      contributionsByUser.set(
        profile.id,
        await repo.listContributions(profile.id),
      )
    }),
  )

  const recommendations = rankContributors({
    problem,
    candidates,
    contributionsByUser,
    excludeUserId: viewer.user?.id ?? null,
    limit: 3,
  })

  const connectionStates = new Map<string, ConnectionState>()

  if (viewer.user) {
    await Promise.all(
      recommendations.map(async (entry) => {
        connectionStates.set(
          entry.profile.id,
          await repo.getConnectionState(viewer.user!.id, entry.profile.id),
        )
      }),
    )
  }

  return (
    <div className="space-y-5">
      <Link
        href="/problems"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3.5" /> Back to explore
      </Link>

      <header className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">
            <CategoryIcon category={problem.category} className="size-3" />
            {categoryLabel(problem.category)}
          </Badge>

          <StatusBadge status={problem.status} />

          <Badge variant="outline">
            {helpTypeLabel(problem.help_type)}
          </Badge>

          {problem.is_demo ? (
            <Badge variant="demo">Demo data</Badge>
          ) : null}
        </div>

        <h1 className="mt-3 text-[1.6rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[1.9rem]">
          {problem.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link
            href={`/u/${problem.owner_id}`}
            className="flex items-center gap-2.5"
          >
            <Avatar
              name={problem.owner.display_name}
              src={problem.owner.avatar_url}
              size={36}
            />

            <span>
              <span className="block text-[12.5px] font-semibold text-foreground">
                {problem.owner.display_name}
              </span>

              <span className="block text-[11.5px] text-muted-foreground">
                {problem.owner.profession ?? 'Member'} · Owner
              </span>
            </span>
          </Link>

          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <CalendarDays className="size-3.5" />
            Published {formatDate(problem.created_at)}
          </span>

          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <MessageSquare className="size-3.5" />
            {problem.comment_count} comments
          </span>

          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Users className="size-3.5" />
            {problem.contributor_count} contributors
          </span>

          {isOwner ? (
            <div className="ml-auto">
              <OwnerProblemActions
                problemId={problem.id}
                status={problem.status}
              />
            </div>
          ) : null}
        </div>

        {problem.cover_url ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted">
            <img
              src={problem.cover_url}
              alt=""
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              The problem
            </h2>

            <p className="prose-problem mt-2 text-[13.5px]">
              {problem.description}
            </p>

            {problem.attachment_url ? (
              <a
                href={problem.attachment_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
              >
                <ArrowUpRight className="size-3.5" />
                Attachment shared by the owner
              </a>
            ) : null}
          </Card>

          <Card className="overflow-hidden">
            <Tabs defaultValue="discussion">
              <div className="px-5 pt-3">
                <TabsList>
                  <TabsTrigger value="discussion">
                    <MessageSquare className="size-3.5" />
                    Discussion
                  </TabsTrigger>

                  <TabsTrigger value="workspace">
                    <Layers className="size-3.5" />
                    Workspace
                  </TabsTrigger>

                  <TabsTrigger value="outcome">
                    <CheckCircle2 className="size-3.5" />
                    Outcome
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="discussion" className="mt-0 p-5">
                <CommentSection
                  problemId={problem.id}
                  comments={comments}
                  viewerId={viewer.user?.id ?? null}
                  signedIn={Boolean(viewer.user)}
                />
              </TabsContent>

              <TabsContent value="workspace" className="mt-0 p-5">
                {canManage ? (
                  <WorkspacePanel
                    problemId={problem.id}
                    tasks={tasks}
                    resources={resources}
                    contributors={contributors}
                    candidates={candidates}
                    isOwner={Boolean(isOwner)}
                    canManage
                    signedIn={Boolean(viewer.user)}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
                      <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-surface text-muted-foreground">
                        <Lock className="size-5" />
                      </div>

                      <p className="text-[13.5px] font-semibold text-foreground">
                        Workspace is members-only
                      </p>

                      <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                        Tasks and shared resources are visible to the problem owner and confirmed contributors.
                        The discussion stays public, so you can offer help there.
                      </p>

                      {!viewer.user ? (
                        <Button
                          asChild
                          size="sm"
                          variant="gradient"
                          className="mt-3"
                        >
                          <Link href="/sign-up">
                            Create an account to offer help
                          </Link>
                        </Button>
                      ) : null}
                    </div>

                    {contributors.length ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Contributors
                        </p>

                        <ul className="mt-2 space-y-2">
                          {contributors.map((entry) => (
                            <li
                              key={entry.user_id}
                              className="flex items-center gap-2.5 rounded-lg border border-border p-2.5"
                            >
                              <Avatar
                                name={entry.profile.display_name}
                                src={entry.profile.avatar_url}
                                size={28}
                              />

                              <Link
                                href={`/u/${entry.user_id}`}
                                className="text-[12.5px] font-medium text-foreground hover:text-primary"
                              >
                                {entry.profile.display_name}
                              </Link>

                              <span className="ml-auto text-[11px] text-muted-foreground">
                                {entry.role ?? 'Contributor'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="outcome" className="mt-0 p-5">
                <SolutionPanel
                  problemId={problem.id}
                  solution={solution}
                  contributors={contributors}
                  isOwner={Boolean(isOwner)}
                  signedIn={Boolean(viewer.user)}
                />
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <Lightbulb className="size-4 text-warning" />
              Related problems
            </h2>

            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Found by shared tags, required skills, category and keywords — not semantic embeddings.
            </p>

            {similar.length ? (
              <ul className="mt-3 space-y-2.5">
                {similar.map((entry) => (
                  <li
                    key={entry.problem.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted">
                        {categoryLabel(entry.problem.category)}
                      </Badge>

                      <StatusBadge status={entry.problem.status} />
                    </div>

                    <Link
                      href={`/problems/${entry.problem.id}`}
                      className="mt-1.5 block text-[13px] font-medium text-foreground hover:text-primary"
                    >
                      {entry.problem.title}
                    </Link>

                    <ul className="mt-1.5 space-y-1">
                      {entry.reasons.map((reason) => (
                        <li
                          key={reason}
                          className="text-[11.5px] text-muted-foreground"
                        >
                          · {reason}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                No related problems found yet. This one may be the first of its kind here.
              </p>
            )}
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
              <Wrench className="size-4 text-primary" />
              Skills needed
            </h2>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {problem.required_skills.length ? (
                problem.required_skills.map((skill) => (
                  <Link
                    key={skill}
                    href={`/problems?skill=${encodeURIComponent(skill)}`}
                    className="rounded-md border border-border bg-muted/70 px-2 py-1 text-[11.5px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    {skill}
                  </Link>
                ))
              ) : (
                <span className="text-[12px] text-muted-foreground">
                  No specific skills listed.
                </span>
              )}
            </div>

            {problem.tags.length ? (
              <>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags
                </p>

                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {problem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-ai px-2 py-0.5 text-[11px] font-medium text-primary"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
                <Users className="size-4 text-primary" />
                People who can help
              </h2>
            </div>

            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              Ranked on skill overlap, interests and contribution history. Evidence shown for each.
            </p>

            <div className="mt-3 space-y-2.5">
              {recommendations.length ? (
                recommendations.map((entry) => (
                  <ExpertCard
                    key={entry.profile.id}
                    recommendation={entry}
                    signedIn={Boolean(viewer.user)}
                    connection={
                      connectionStates.get(entry.profile.id) ?? { status: 'none' }
                    }
                  />
                ))
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  No strong matches yet. Members who add these skills will appear here.
                </p>
              )}
            </div>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mt-3 w-full"
            >
              <Link href="/friends">
                Browse all members <ArrowUpRight />
              </Link>
            </Button>
          </Card>

          {contributors.length ? (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
                <Users className="size-4 text-primary" />
                Working on this
              </h2>

              <ul className="mt-2.5 space-y-2">
                {contributors.map((entry) => (
                  <li
                    key={entry.user_id}
                    className="flex items-center gap-2.5"
                  >
                    <Avatar
                      name={entry.profile.display_name}
                      src={entry.profile.avatar_url}
                      size={28}
                    />

                    <Link
                      href={`/u/${entry.user_id}`}
                      className="text-[12.5px] font-medium text-foreground hover:text-primary"
                    >
                      {entry.profile.display_name}
                    </Link>

                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {entry.role ?? 'Contributor'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="rounded-lg border border-border bg-surface/70 p-4 text-[11.5px] leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">
              How matching works
            </p>

            <p className="mt-1">
              People are matched using their listed skills, interests and contribution history.
              These matches are recommendations, not verified assessments of ability.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
