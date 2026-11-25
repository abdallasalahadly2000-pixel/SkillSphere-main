import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Flame,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { ProblemCard } from '@/components/problem-card'
import { ExpertCard } from '@/components/expert-card'
import { HomeComposer } from '@/components/home-composer'
import { EmptyState } from '@/components/empty-state'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getViewer } from '@/lib/auth'
import { repo, isSupabaseConfigured } from '@/lib/data'
import { rankContributors } from '@/lib/matching'
import { categoryLabel, statusLabel } from '@/lib/constants'
import { truncate } from '@/lib/utils'
import type { ConnectionState } from '@/lib/data/repository'
import type { Contribution, Problem } from '@/lib/types'

export const dynamic = 'force-dynamic'

const STORY_TONES = [
  'from-[#1877F2] to-[#0B4F9E]',
  'from-[#0E7490] to-[#0B4F6C]',
  'from-[#5B3FD4] to-[#3A2A9E]',
  'from-[#1E88E5] to-[#0D47A1]',
  'from-[#00897B] to-[#00574F]',
]

const STATUS_TABS = [
  { label: 'For you', href: '/home', active: true },
  { label: 'Open', href: '/problems?status=open' },
  { label: 'In progress', href: '/problems?status=in_progress' },
  { label: 'Solved', href: '/problems?status=solved' },
]

export default async function HomePage() {
  const viewer = await getViewer()
  if (viewer.user && viewer.profile && !viewer.profile.onboarding_complete) redirect('/onboarding')

  const [feed, profiles, skills] = await Promise.all([
    repo.listProblems({ limit: 12 }),
    repo.listProfiles({ excludeId: viewer.user?.id, limit: 10 }),
    repo.listPopularSkills(10),
  ])

  const focusProblem =
    (viewer.profile
      ? feed.find((problem) =>
          problem.required_skills.some((skill) =>
            viewer.profile!.skills.some((entry) => entry.name.toLowerCase() === skill.toLowerCase()),
          ),
        )
      : undefined) ??
    feed.find((problem) => problem.category === 'engineering-robotics') ??
    feed.find((problem) => problem.status === 'open' || problem.status === 'in_progress') ??
    feed[0]

  const contributionsByUser = new Map<string, Contribution[]>()
  if (focusProblem) {
    await Promise.all(
      profiles.slice(0, 6).map(async (profile) => {
        contributionsByUser.set(profile.id, await repo.listContributions(profile.id))
      }),
    )
  }

  const recommendations = focusProblem
    ? rankContributors({
        problem: focusProblem,
        candidates: profiles,
        contributionsByUser,
        excludeUserId: viewer.user?.id ?? null,
        limit: 3,
      })
    : []

  const connectionStates = new Map<string, ConnectionState>()
  if (viewer.user) {
    await Promise.all(
      recommendations.map(async (entry) => {
        connectionStates.set(entry.profile.id, await repo.getConnectionState(viewer.user!.id, entry.profile.id))
      }),
    )
  }

  const recommendedProblems = viewer.profile
    ? feed
        .filter((problem) => problem.owner_id !== viewer.user?.id)
        .map((problem) => {
          const mySkills = viewer.profile!.skills.filter(
            (s) => s.kind === 'expertise' || s.kind === 'help',
          )
          const matched = problem.required_skills.filter((skill) =>
            mySkills.some((entry) => entry.name.toLowerCase() === skill.toLowerCase()),
          )
          return { problem, matched }
        })
        .filter((entry) => entry.matched.length > 0)
        .sort((a, b) => b.matched.length - a.matched.length)
        .slice(0, 3)
    : []

  const outcomes = feed
    .filter((problem) => problem.status === 'solved' || problem.status === 'partially_solved')
    .slice(0, 2)

  const firstName = (viewer.profile?.display_name ?? viewer.user?.displayName ?? '').split(' ')[0] || null

  return (
    <div className="space-y-4">
      <section aria-label="Problem stories">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Link
            href="/problems/new"
            className="group relative flex h-[188px] w-[112px] shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface text-center shadow-card transition-colors hover:bg-muted"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-ai text-primary transition-transform group-hover:scale-105">
              <Plus className="size-5" />
            </span>
            <span className="px-1 text-[12.5px] font-semibold leading-tight text-foreground">
              Publish a problem
            </span>
          </Link>

          {feed.slice(0, 5).map((problem, index) => (
            <Story key={problem.id} problem={problem} tone={STORY_TONES[index % STORY_TONES.length]} />
          ))}
        </div>
      </section>

      <HomeComposer
        signedIn={Boolean(viewer.user)}
        name={firstName}
        avatarUrl={viewer.profile?.avatar_url ?? null}
      />

      <nav className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1" aria-label="Feed filters">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={
              tab.active
                ? 'shrink-0 rounded-md bg-primary px-3 py-1.5 text-[13px] font-semibold text-white'
                : 'shrink-0 rounded-md bg-surface px-3 py-1.5 text-[13px] font-semibold text-foreground shadow-card transition-colors hover:bg-hover'
            }
          >
            {tab.label}
          </Link>
        ))}
        <Link
          href="/problems"
          className="ml-auto shrink-0 text-[13px] font-semibold text-primary hover:underline"
        >
          See all
        </Link>
      </nav>

      {feed.length ? (
        <div className="space-y-3">
          {feed.slice(0, 6).map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Compass}
          title="No problems yet"
          description="Publish the first problem and SkillSphere will start matching people to it."
          action={
            <Button asChild size="sm">
              <Link href="/problems/new">Publish a problem</Link>
            </Button>
          }
        />
      )}

      {skills.length ? (
        <section className="surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
              <TrendingUp className="size-[18px] text-primary" /> Trending skills
            </h2>
            <span className="text-[12px] text-muted-foreground">Most requested</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <Link
                key={skill}
                href={`/problems?skill=${encodeURIComponent(skill)}`}
                className="rounded-md bg-muted px-2.5 py-1 text-[12.5px] font-medium text-foreground transition-colors hover:bg-hover"
              >
                {skill}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
            <Users className="size-[18px] text-primary" /> Suggested people
          </h2>
          <Link href="/friends" className="text-[13px] font-semibold text-primary hover:underline">
            See all
          </Link>
        </div>
        {focusProblem ? (
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
            Matched to “{focusProblem.title}” using skills, interests and contribution history.
          </p>
        ) : null}
        {recommendations.length ? (
          <div className="mt-2">
            {recommendations.map((entry) => (
              <ExpertCard
                key={entry.profile.id}
                recommendation={entry}
                signedIn={Boolean(viewer.user)}
                connection={connectionStates.get(entry.profile.id) ?? { status: 'none' }}
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-muted-foreground">
            Add skills to your profile to see people matched to your work.
          </p>
        )}
      </section>

      {outcomes.length ? (
        <section className="surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
              <CheckCircle2 className="size-[18px] text-success" /> Latest outcomes
            </h2>
            <Link
              href="/problems?status=solved"
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              See all
            </Link>
          </div>
          <ul className="mt-2">
            {outcomes.map((problem) => (
              <li key={problem.id} className="border-t border-border first:border-t-0">
                <Link
                  href={`/problems/${problem.id}`}
                  className="flex items-start gap-2.5 rounded-md px-1 py-2.5 transition-colors hover:bg-hover"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-success/12 text-success">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold leading-snug text-foreground">
                      {problem.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      {statusLabel(problem.status)} · reported by {problem.owner.display_name}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {viewer.profile ? (
        <section className="surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
              <Sparkles className="size-[18px] text-primary" /> Recommended for you
            </h2>
            <Link href="/problems" className="text-[13px] font-semibold text-primary hover:underline">
              See all
            </Link>
          </div>
          {recommendedProblems.length ? (
            <ul className="mt-2">
              {recommendedProblems.map(({ problem, matched }) => (
                <li key={problem.id} className="border-t border-border first:border-t-0">
                  <Link
                    href={`/problems/${problem.id}`}
                    className="block rounded-md px-1 py-2.5 transition-colors hover:bg-hover"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">{categoryLabel(problem.category)}</Badge>
                      <span className="ml-auto text-[11.5px] capitalize text-muted-foreground">
                        {problem.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-[14px] font-semibold leading-snug text-foreground">
                      {problem.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-primary">
                      Your {matched.slice(0, 2).join(' + ')}{' '}
                      {matched.length > 1 ? 'skills match' : 'skill matches'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              No problems match your listed skills yet. Add more skills, or publish a problem of your
              own.
            </p>
          )}
        </section>
      ) : null}

      {!viewer.user ? (
        <section className="surface p-4">
          <h2 className="text-[16px] font-semibold text-foreground">You are browsing as a guest</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            You can read problems, discussions and public profiles. Publishing, commenting and
            connecting need an account.
          </p>
          <div className="mt-3 flex gap-2">
            <Button asChild size="sm">
              <Link href="/sign-up">Create account</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {!isSupabaseConfigured() ? (
        <section className="surface p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            <Flame className="size-3.5" /> Demo mode
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            This instance uses the local SQLite demo database. Records marked{' '}
            <span className="font-semibold">Demo data</span> are seed content; anything you create is
            stored separately.
          </p>
          <Link
            href="/news"
            className="mt-1.5 inline-block text-[12.5px] font-semibold text-primary hover:underline"
          >
            About this dataset
          </Link>
        </section>
      ) : null}

      <Button asChild variant="outline" className="w-full">
        <Link href="/problems">
          See more problems <ArrowRight />
        </Link>
      </Button>
    </div>
  )
}

function Story({ problem, tone }: { problem: Problem; tone: string }) {
  return (
    <Link
      href={`/problems/${problem.id}`}
      className={`group relative flex h-[188px] w-[112px] shrink-0 flex-col justify-between overflow-hidden rounded-lg bg-gradient-to-br p-2.5 text-white shadow-card ${tone}`}
    >
      {problem.cover_url ? (
        <img
          src={problem.cover_url}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <span className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent" />
      <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-surface/95 p-0.5">
        <Avatar name={problem.owner.display_name} src={problem.owner.avatar_url} size={28} />
      </span>
      <span className="relative">
        <span className="line-clamp-3 text-[12px] font-semibold leading-snug">
          {truncate(problem.title, 58)}
        </span>
        <span className="mt-0.5 block truncate text-[10.5px] text-white/75">
          {problem.owner.display_name.split(' ')[0]} · {categoryLabel(problem.category)}
        </span>
      </span>
    </Link>
  )
}
