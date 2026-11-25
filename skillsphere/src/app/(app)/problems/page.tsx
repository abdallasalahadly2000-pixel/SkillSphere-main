import Link from 'next/link'
import { Compass, Plus } from 'lucide-react'
import { ProblemCard } from '@/components/problem-card'
import { ProblemFilters } from '@/components/problem-filters'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { getViewer } from '@/lib/auth'
import { repo } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const pick = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : undefined)

  const filters = {
    q: pick('q'),
    category: pick('category'),
    status: pick('status'),
    skill: pick('skill'),
    limit: 60,
  }

  const [viewer, problems, skills] = await Promise.all([
    getViewer(),
    repo.listProblems(filters),
    repo.listPopularSkills(12),
  ])

  return (
    <div className="space-y-5">
      <header className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-semibold text-foreground">Explore problems</h1>
          <p className="mt-0.5 max-w-2xl text-[12.5px] leading-snug text-muted-foreground">
            Search by keyword, then narrow by category, status or the skills involved.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/problems/new">
            <Plus /> Publish a problem
          </Link>
        </Button>
      </header>

      <ProblemFilters skills={skills} />

      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-muted-foreground">
          {problems.length} problem{problems.length === 1 ? '' : 's'}
          {filters.q ? ` matching “${filters.q}”` : ''}
        </p>
        {viewer.user ? (
          <Link href="/profile" className="text-[12px] font-medium text-primary hover:underline">
            Your published problems →
          </Link>
        ) : null}
      </div>

      {problems.length ? (
        <div className="space-y-3">
          {problems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Compass}
          title="No problems match these filters"
          description="Try a broader search, or clear the filters to see everything."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/problems">Clear filters</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
