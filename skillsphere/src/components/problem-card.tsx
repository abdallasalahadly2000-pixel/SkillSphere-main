import Link from 'next/link'
import { ArrowUpRight, MessageSquare, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CategoryIcon } from '@/components/category-icon'
import { StatusBadge } from '@/components/status-badge'
import { categoryLabel } from '@/lib/constants'
import { timeAgo, truncate } from '@/lib/utils'
import type { Problem } from '@/lib/types'

export function ProblemCard({ problem, compact = false }: { problem: Problem; compact?: boolean }) {
  return (
    <article className="surface overflow-hidden">
      <header className="flex items-start gap-2.5 px-4 pt-3">
        <Link href={`/u/${problem.owner_id}`} aria-label={problem.owner.display_name}>
          <Avatar name={problem.owner.display_name} src={problem.owner.avatar_url} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <Link
              href={`/u/${problem.owner_id}`}
              className="text-[14.5px] font-semibold text-foreground hover:underline"
            >
              {problem.owner.display_name}
            </Link>
            <span className="text-[12.5px] text-muted-foreground">· {timeAgo(problem.created_at)}</span>
            {problem.is_demo ? (
              <span className="text-[11px] font-medium text-muted-foreground/70">· Demo data</span>
            ) : null}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CategoryIcon category={problem.category} className="size-3" />
              {categoryLabel(problem.category)}
            </span>
            <span aria-hidden="true">·</span>
            <StatusBadge status={problem.status} />
          </p>
        </div>
        <Link
          href={`/problems/${problem.id}`}
          aria-label="Open problem"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-hover"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </header>

      <div className="px-4 pb-3 pt-2">
        <h3 className="text-[16.5px] font-semibold leading-snug text-foreground">
          <Link href={`/problems/${problem.id}`} className="hover:underline">
            {problem.title}
          </Link>
        </h3>

        {!compact ? (
          <p className="mt-1 text-[14px] leading-[1.45] text-foreground">
            {truncate(problem.description, 210)}
          </p>
        ) : null}

        {problem.required_skills.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {problem.required_skills.slice(0, 4).map((skill) => (
              <Link
                key={skill}
                href={`/problems?skill=${encodeURIComponent(skill)}`}
                className="rounded-md bg-muted px-2 py-1 text-[12px] font-medium text-foreground hover:bg-hover"
              >
                {skill}
              </Link>
            ))}
            {problem.required_skills.length > 4 ? (
              <span className="px-1 py-1 text-[12px] text-muted-foreground">
                +{problem.required_skills.length - 4} more
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {problem.cover_url ? (
        <div className="mt-2.5 border-y border-border bg-muted">
          <img
            src={problem.cover_url}
            alt=""
            loading="lazy"
            className="max-h-[360px] w-full object-cover"
          />
        </div>
      ) : null}

      <div className="mx-4 h-px bg-border" />

      <div className="flex items-center gap-1 px-2 py-1">
        <Link
          href={`/problems/${problem.id}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:bg-hover"
        >
          <ArrowUpRight className="size-[18px]" />
          <span className="hidden sm:inline">Open problem</span>
        </Link>
        <Link
          href={`/problems/${problem.id}#discussion`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:bg-hover"
        >
          <MessageSquare className="size-[18px]" /> {problem.comment_count}
        </Link>
        <Link
          href={`/problems/${problem.id}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:bg-hover"
        >
          <Users className="size-[18px]" /> {problem.contributor_count}
        </Link>
      </div>
    </article>
  )
}
