import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProblemForm } from '@/components/problem-form'
import { getViewer } from '@/lib/auth'
import { repo } from '@/lib/data'
import { aiStatus } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export default async function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [viewer, problem] = await Promise.all([getViewer(), repo.getProblem(id)])
  if (!problem) notFound()

  if (!viewer.user || viewer.user.id !== problem.owner_id) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-lg bg-amber-50 text-warning">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="text-[16px] font-semibold text-foreground">Only the owner can edit this problem</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {viewer.user
            ? 'You can still take part in the discussion or offer to collaborate.'
            : 'Sign in with the account that published this problem to edit it.'}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/problems/${problem.id}`}>Back to the problem</Link>
          </Button>
          {!viewer.user ? (
            <Button asChild variant="gradient">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[12px] font-semibold uppercase tracking-wider text-primary">Edit problem</p>
        <h1 className="mt-1 text-[1.6rem] font-semibold tracking-tight text-foreground">{problem.title}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Changes are saved to the problem immediately. The stored AI analysis is not regenerated.
        </p>
      </header>
      <ProblemForm
        mode="edit"
        problem={problem}
        aiConfigured={aiStatus().configured}
        owner={{
          id: viewer.user.id,
          name: viewer.profile?.display_name ?? viewer.user.displayName,
          avatarUrl: viewer.profile?.avatar_url ?? null,
        }}
      />
    </div>
  )
}
