
import Link from 'next/link'
import { LockKeyhole, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProblemForm } from '@/components/problem-form'
import { getViewer } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function NewProblemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const viewer = await getViewer()

  const title = typeof params.title === 'string' ? params.title.slice(0, 160) : ''
  const description = typeof params.description === 'string' ? params.description.slice(0, 8000) : ''

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[12px] font-semibold uppercase tracking-wider text-primary">New problem</p>
        <h1 className="mt-1 text-[1.8rem] font-semibold tracking-tight text-foreground">
          Create a new problem
        </h1>
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          Describe the problem clearly enough that people with relevant skills can
          understand it and decide whether they can help. Add required skills and tags
          to make your problem easier to discover.
        </p>
      </header>

      {viewer.user ? (
        <ProblemForm
          mode="create"
          defaults={{ title, description }}
          owner={{
            id: viewer.user.id,
            name: viewer.profile?.display_name ?? viewer.user.displayName,
            avatarUrl: viewer.profile?.avatar_url ?? null,
          }}
        />
      ) : (
        <div className="surface mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-lg bg-ai text-primary">
            <LockKeyhole className="size-6" />
          </div>
          <h2 className="text-[16px] font-semibold text-foreground">Publishing needs an account</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Guests can read every public problem. To publish your own and collaborate
            with other members, create a free account. Nothing has been saved.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild variant="gradient">
              <Link href="/sign-up">
                <Plus /> Create account
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
