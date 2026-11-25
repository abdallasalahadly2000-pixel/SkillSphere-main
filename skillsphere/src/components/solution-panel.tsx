'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ExternalLink, FileCheck2, Loader2, ShieldQuestion } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/status-badge'
import { reportSolutionAction } from '@/actions/workspace'
import { OUTCOME_STATUSES, statusLabel, type OutcomeStatus } from '@/lib/constants'
import { formatDate, safeHttpUrl } from '@/lib/utils'
import type { Contribution, Contributor, ProfileLite, SolutionReport } from '@/lib/types'

type SolutionWithContributions = SolutionReport & {
  contributions: Array<Contribution & { profile: ProfileLite }>
}

export function SolutionPanel({
  problemId,
  solution,
  contributors,
  isOwner,
  signedIn,
}: {
  problemId: string
  solution: SolutionWithContributions | null
  contributors: Contributor[]
  isOwner: boolean
  signedIn: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{
    outcomeStatus: OutcomeStatus
    outcomeDescription: string
    attempted: string
    worked: string
    evidence: string
    contributorIds: string[]
  }>({
    outcomeStatus: 'solved',
    outcomeDescription: '',
    attempted: '',
    worked: '',
    evidence: '',
    contributorIds: [] as string[],
  })

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await reportSolutionAction({ problemId, ...form })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {solution ? (
        <article className="overflow-hidden rounded-lg border border-emerald-100 bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-emerald-100 bg-emerald-50/60 px-5 py-3">
            <FileCheck2 className="size-4 text-emerald-600" />
            <h2 className="text-[13.5px] font-semibold text-emerald-800">Reported outcome</h2>
            <StatusBadge status={solution.outcome_status} />
            <span className="ml-auto text-[11.5px] text-emerald-700/70">
              Reported {formatDate(solution.created_at)}
            </span>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What happened</p>
              <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">
                {solution.outcome_description}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/60 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What was attempted</p>
                <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground">
                  {solution.attempted}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50/70 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">What worked</p>
                <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground">
                  {solution.worked}
                </p>
              </div>
            </div>

            {safeHttpUrl(solution.evidence) ? (
              <a
                href={safeHttpUrl(solution.evidence) ?? '#'}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" /> Supporting evidence
              </a>
            ) : solution.evidence ? (
              <p className="text-[12.5px] text-muted-foreground">Evidence: {solution.evidence}</p>
            ) : null}

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Confirmed contributions
              </p>
              {solution.contributions.length ? (
                <ul className="mt-2 space-y-2">
                  {solution.contributions.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                      <Avatar name={entry.profile.display_name} src={entry.profile.avatar_url} size={26} />
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-foreground">{entry.profile.display_name}</p>
                        <p className="text-[11.5px] leading-relaxed text-muted-foreground">{entry.summary}</p>
                      </div>
                      <Badge variant="success" className="ml-auto shrink-0">
                        <CheckCircle2 className="size-3" /> Confirmed
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[12px] text-muted-foreground">No contributors were confirmed for this outcome.</p>
              )}
            </div>

            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-800">
              <ShieldQuestion className="mt-0.5 size-3.5 shrink-0" />
              This is an outcome reported by the problem owner. It has not been independently verified by
              SkillSphere. Contributions are recorded only when the owner confirms them.
            </p>
          </div>
        </article>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface/70 p-6 text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileCheck2 className="size-5" />
          </div>
          <p className="text-[13.5px] font-semibold text-foreground">No outcome recorded yet</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
            When the work reaches a conclusion, the problem owner records what was tried, what worked and who
            contributed. Confirmed contributions appear on the contributors&apos; profiles.
          </p>
        </div>
      )}

      {isOwner ? (
        open ? (
          <div className="surface p-5">
            <h3 className="text-[14px] font-semibold text-foreground">
              {solution ? 'Record a new outcome' : 'Report the outcome'}
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="outcomeStatus">Outcome</Label>
                <Select
                  id="outcomeStatus"
                  value={form.outcomeStatus}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, outcomeStatus: event.target.value as OutcomeStatus }))
                  }
                  className="mt-1.5"
                >
                  {OUTCOME_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  The problem status becomes “{statusLabel(form.outcomeStatus)}”.
                </p>
              </div>
              <div>
                <Label htmlFor="outcomeDescription">What happened</Label>
                <Textarea
                  id="outcomeDescription"
                  value={form.outcomeDescription}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, outcomeDescription: event.target.value }))
                  }
                  className="mt-1.5"
                  placeholder="The outcome in plain language, including what you could not resolve."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="attempted">What was attempted</Label>
                  <Textarea
                    id="attempted"
                    value={form.attempted}
                    onChange={(event) => setForm((prev) => ({ ...prev, attempted: event.target.value }))}
                    className="mt-1.5 min-h-24"
                  />
                </div>
                <div>
                  <Label htmlFor="worked">What worked</Label>
                  <Textarea
                    id="worked"
                    value={form.worked}
                    onChange={(event) => setForm((prev) => ({ ...prev, worked: event.target.value }))}
                    className="mt-1.5 min-h-24"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="evidence">Supporting evidence or link</Label>
                <Input
                  id="evidence"
                  value={form.evidence}
                  onChange={(event) => setForm((prev) => ({ ...prev, evidence: event.target.value }))}
                  placeholder="https://…"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Confirm participating contributors</Label>
                {contributors.length ? (
                  <div className="mt-2 space-y-1.5">
                    {contributors.map((entry) => (
                      <label
                        key={entry.user_id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border p-2.5 text-[12.5px] text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={form.contributorIds.includes(entry.user_id)}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              contributorIds: event.target.checked
                                ? [...prev.contributorIds, entry.user_id]
                                : prev.contributorIds.filter((id) => id !== entry.user_id),
                            }))
                          }
                          className="size-4 rounded border-border text-primary"
                        />
                        <Avatar name={entry.profile.display_name} src={entry.profile.avatar_url} size={22} />
                        {entry.profile.display_name}
                        <span className="ml-auto text-[11px] text-muted-foreground">{entry.role ?? 'Contributor'}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Add contributors in the workspace before reporting the outcome.
                  </p>
                )}
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button onClick={submit} disabled={pending} variant="gradient">
                  {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  {pending ? 'Saving…' : 'Save outcome'}
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <FileCheck2 /> {solution ? 'Record a new outcome' : 'Report the outcome'}
          </Button>
        )
      ) : !signedIn ? (
        <p className="text-[12px] text-muted-foreground">
          <a href="/sign-in" className="font-semibold text-primary hover:underline">
            Sign in
          </a>{' '}
          to follow this problem. Only the owner can report an outcome.
        </p>
      ) : null}
    </div>
  )
}
