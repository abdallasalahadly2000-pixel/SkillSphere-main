'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Compass, Sparkles, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { AuthPrompt } from '@/components/auth-prompt'

export function HomeComposer({
  signedIn,
  name,
  avatarUrl,
}: {
  signedIn: boolean
  name?: string | null
  avatarUrl?: string | null
}) {
  const router = useRouter()
  const [text, setText] = useState('')

  return (
    <div className="surface p-3">
      <div className="flex items-center gap-2.5">
        <Avatar name={name ?? 'Guest'} src={avatarUrl ?? null} size={40} />
        <label htmlFor="quick-problem" className="sr-only">
          Describe your problem
        </label>
        <input
          id="quick-problem"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              const params = new URLSearchParams()
              if (text.trim()) params.set('description', text.trim())
              router.push(`/problems/new${params.toString() ? `?${params.toString()}` : ''}`)
            }
          }}
          placeholder={
            name ? `What problem are you working on, ${name}?` : 'What problem are you working on?'
          }
          className="h-10 flex-1 rounded-md bg-muted px-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground transition-colors hover:bg-hover focus:bg-surface focus:ring-1 focus:ring-primary/40"
        />
      </div>

      <div className="my-2.5 h-px bg-border" />

      <div className="flex items-center justify-between gap-1">
        <Link action="/problems/new" label="Publish a problem" icon={Sparkles} />
        <Link action="/problems" label="Explore problems" icon={Compass} />
        <Link action="/friends" label="Find people" icon={Users} />
        {signedIn ? (
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            onClick={() => {
              const params = new URLSearchParams()
              if (text.trim()) params.set('description', text.trim())
              router.push(`/problems/new${params.toString() ? `?${params.toString()}` : ''}`)
            }}
          >
            Create <ArrowRight />
          </Button>
        ) : (
          <div className="ml-auto">
            <AuthPrompt label="Sign in to publish" title="Publish a problem to get help" size="sm" />
          </div>
        )}
      </div>
    </div>
  )
}

function Link({
  action,
  label,
  icon: Icon,
}: {
  action: string
  label: string
  icon: typeof Compass
}) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.push(action)}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
    >
      <Icon className="size-[18px]" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
