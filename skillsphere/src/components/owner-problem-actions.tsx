'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteProblemAction, setProblemStatusAction } from '@/actions/problems'
import { PROBLEM_STATUSES } from '@/lib/constants'

export function OwnerProblemActions({
  problemId,
  status,
}: {
  problemId: string
  status: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Problem status"
        value={status}
        disabled={pending}
        onChange={(event) => {
          setError(null)
          startTransition(async () => {
            const result = await setProblemStatusAction({ problemId, status: event.target.value })
            if (!result.ok) {
              setError(result.error)
              return
            }
            router.refresh()
          })
        }}
        className="h-9 w-40 text-[12.5px]"
      >
        {PROBLEM_STATUSES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Button asChild variant="outline" size="sm">
        <Link href={`/problems/${problemId}/edit`}>
          <Pencil /> Edit
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-danger hover:bg-red-50"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 /> Delete
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this problem?</DialogTitle>
            <DialogDescription>
              The problem, its discussion, workspace tasks and any recorded outcome will be removed. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setError(null)
                startTransition(async () => {
                  const result = await deleteProblemAction(problemId)
                  if (!result.ok) {
                    setError(result.error)
                    return
                  }
                  setConfirmOpen(false)
                  router.push('/problems')
                  router.refresh()
                })
              }}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete problem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
