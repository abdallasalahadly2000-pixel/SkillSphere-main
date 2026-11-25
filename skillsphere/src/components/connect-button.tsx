'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthPrompt } from '@/components/auth-prompt'
import {
  removeConnectionAction,
  respondToRequestAction,
  sendConnectionRequestAction,
} from '@/actions/social'
import type { ConnectionState } from '@/lib/data/repository'

export function ConnectButton({
  targetId,
  targetName,
  state,
  signedIn,
  size = 'sm',
  className,
}: {
  targetId: string
  targetName: string
  state: ConnectionState
  signedIn: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<ConnectionState>(state)

  if (!signedIn) {
    return (
      <AuthPrompt
        label="Connect"
        title={`Sign in to connect with ${targetName}`}
        description="Connection requests are stored in your account. Guests can view profiles but cannot send requests."
        size={size}
        variant="soft"
        className={className}
      />
    )
  }

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

  let control: React.ReactNode
  if (current.status === 'accepted') {
    control = (
      <Button
        variant="outline"
        size={size}
        disabled={pending}
        onClick={() => {
          if (!current.id) return
          run(async () => {
            const result = await removeConnectionAction(current.id!)
            if (result.ok) setCurrent({ status: 'none' })
            return result
          })
        }}
        className={className}
        title="Remove connection"
      >
        <Check /> Connected
      </Button>
    )
  } else if (current.status === 'pending_out') {
    control = (
      <Button variant="secondary" size={size} disabled className={className}>
        <Clock /> Request sent
      </Button>
    )
  } else if (current.status === 'pending_in') {
    control = (
      <Button
        size={size}
        variant="gradient"
        disabled={pending || !current.id}
        onClick={() => {
          if (!current.id) return
          run(async () => {
            const result = await respondToRequestAction(current.id!, true)
            if (result.ok) setCurrent({ status: 'accepted', id: current.id })
            return result
          })
        }}
        className={className}
      >
        <Check /> Accept request
      </Button>
    )
  } else {
    control = (
      <Button
        size={size}
        variant="soft"
        disabled={pending}
        onClick={() =>
          run(async () => {
            const result = await sendConnectionRequestAction(targetId)
            if (result.ok) setCurrent({ status: 'pending_out' })
            return result
          })
        }
        className={className}
      >
        <UserPlus /> {pending ? 'Sending…' : 'Connect'}
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {control}
      {error ? <span className="text-[11.5px] font-medium text-danger">{error}</span> : null}
    </div>
  )
}
