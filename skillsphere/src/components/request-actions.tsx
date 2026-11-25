'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { removeConnectionAction, respondToRequestAction } from '@/actions/social'

export function RequestActions({
  connectionId,
  mode,
}: {
  connectionId: string
  mode: 'incoming' | 'outgoing' | 'connected'
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {mode === 'incoming' ? (
          <>
            <Button size="sm" variant="gradient" disabled={pending} onClick={() => run(() => respondToRequestAction(connectionId, true))}>
              <Check /> Accept
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => respondToRequestAction(connectionId, false))}>
              <X /> Decline
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => removeConnectionAction(connectionId))}>
            {mode === 'outgoing' ? 'Cancel request' : 'Remove connection'}
          </Button>
        )}
      </div>
      {error ? <span className="text-[11px] font-medium text-danger">{error}</span> : null}
    </div>
  )
}
