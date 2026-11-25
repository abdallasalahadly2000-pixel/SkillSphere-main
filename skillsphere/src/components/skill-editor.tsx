'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { FieldHint, Label } from '@/components/ui/label'

export function SkillEditor({
  label,
  hint,
  value,
  onChange,
  placeholder,
  suggestions = [],
  max = 20,
}: {
  label: string
  hint?: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  suggestions?: string[]
  max?: number
}) {
  const [draft, setDraft] = useState('')

  function add(raw: string) {
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    for (const part of parts) {
      if (!next.some((item) => item.toLowerCase() === part.toLowerCase()) && next.length < max) next.push(part)
    }
    onChange(next)
    setDraft('')
  }

  const available = suggestions.filter(
    (suggestion) => !value.some((item) => item.toLowerCase() === suggestion.toLowerCase()),
  )

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface p-2 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-md bg-ai px-2 py-1 text-[12px] font-medium text-primary"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(value.filter((entry) => entry !== item))}
              className="rounded p-0.5 hover:bg-primary/10"
              aria-label={`Remove ${item}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(event) => {
            if (event.target.value.endsWith(',')) add(event.target.value)
            else setDraft(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add(draft)
            }
            if (event.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length ? 'Add another…' : placeholder}
          className="h-8 min-w-32 flex-1 border-0 px-1.5 shadow-none focus:ring-0"
        />
      </div>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      {available.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {available.slice(0, 8).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-0.5 text-[11.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Plus className="size-3" /> {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
