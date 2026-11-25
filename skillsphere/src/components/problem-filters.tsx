'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { CATEGORIES, PROBLEM_STATUSES } from '@/lib/constants'

export function ProblemFilters({ skills }: { skills: string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  function update(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    router.push(`/problems${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const active = ['category', 'status', 'skill'].filter((key) => searchParams.get(key))

  return (
    <div className="surface p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          update({ q: query.trim() || null })
        }}
        className="flex flex-col gap-2"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search problems, skills, keywords…"
            className="pl-9"
            aria-label="Search problems"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select
            aria-label="Category"
            value={searchParams.get('category') ?? ''}
            onChange={(event) => update({ category: event.target.value || null })}
            className="w-full"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Status"
            value={searchParams.get('status') ?? ''}
            onChange={(event) => update({ status: event.target.value || null })}
className="w-full"
          >
            <option value="">Any status</option>
            {PROBLEM_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Required skill"
            value={searchParams.get('skill') ?? ''}
            onChange={(event) => update({ skill: event.target.value || null })}
            className="w-full"
          >
            <option value="">Any skill</option>
            {skills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="default" className="h-10 w-full">
          <SlidersHorizontal /> Apply
        </Button>
      </form>

      {active.length || searchParams.get('q') ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
          <span className="text-[11.5px] font-medium text-muted-foreground">Active filters</span>
          {searchParams.get('q') ? (
            <FilterPill label={`“${searchParams.get('q')}”`} onRemove={() => update({ q: null })} />
          ) : null}
          {active.map((key) => (
            <FilterPill
              key={key}
              label={`${key}: ${searchParams.get(key)}`}
              onRemove={() => update({ [key]: null })}
            />
          ))}
          <button
            type="button"
            onClick={() => router.push('/problems')}
            className="text-[11.5px] font-semibold text-primary hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  )
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-ai px-2.5 py-0.5 text-[11.5px] font-medium text-primary">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded p-0.5 hover:bg-primary/10">
        <X className="size-3" />
      </button>
    </span>
  )
}
