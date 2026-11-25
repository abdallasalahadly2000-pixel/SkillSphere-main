'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Link2,
  ListChecks,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  addContributorAction,
  addResourceAction,
  createTaskAction,
  deleteResourceAction,
  deleteTaskAction,
  removeContributorAction,
  setTaskStatusAction,
} from '@/actions/workspace'
import { TASK_STATUSES } from '@/lib/constants'
import { timeAgo } from '@/lib/utils'
import type { Contributor, Profile, Resource, Task } from '@/lib/types'

export function WorkspacePanel({
  problemId,
  tasks,
  resources,
  contributors,
  candidates,
  isOwner,
  canManage,
  signedIn,
}: {
  problemId: string
  tasks: Task[]
  resources: Resource[]
  contributors: Contributor[]
  candidates: Profile[]
  isOwner: boolean
  canManage: boolean
  signedIn: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [taskTitle, setTaskTitle] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [resourceTitle, setResourceTitle] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')
  const [resourceDescription, setResourceDescription] = useState('')
  const [contributorId, setContributorId] = useState('')
  const [contributorRole, setContributorRole] = useState('')

  const done = tasks.filter((task) => task.status === 'done').length
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      after?.()
      router.refresh()
    })
  }

  const assignable = [
    ...contributors.map((entry) => ({ id: entry.user_id, name: entry.profile.display_name })),
  ]
  const addable = candidates.filter((profile) => !contributors.some((entry) => entry.user_id === profile.id))

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <section className="surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <ListChecks className="size-4 text-primary" /> Tasks
          </h3>
          <span className="text-[11.5px] text-muted-foreground">
            {done}/{tasks.length} done · {progress}%
          </span>
        </div>
        <Progress value={progress} className="mt-3" />

        <ul className="mt-4 space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  disabled={!canManage || pending}
                  aria-label={task.status === 'done' ? 'Mark as to do' : 'Mark as done'}
                  onClick={() =>
                    run(() =>
                      setTaskStatusAction({
                        taskId: task.id,
                        problemId,
                        status: task.status === 'done' ? 'todo' : 'done',
                      }),
                    )
                  }
                  className="mt-0.5 text-muted-foreground/60 transition-colors hover:text-primary disabled:cursor-default"
                >
                  {task.status === 'done' ? (
                    <CheckCircle2 className="size-5 text-success" />
                  ) : (
                    <Circle className="size-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[13px] font-medium ${
                      task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description ? (
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{task.description}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {task.assignee ? (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <Avatar name={task.assignee.display_name} src={task.assignee.avatar_url} size={18} />
                        {task.assignee.display_name}
                      </span>
                    ) : (
                      <span className="text-[11.5px] text-muted-foreground">Unassigned</span>
                    )}
                    {canManage ? (
                      <Select
                        aria-label="Task status"
                        value={task.status}
                        disabled={pending}
                        onChange={(event) =>
                          run(() =>
                            setTaskStatusAction({
                              taskId: task.id,
                              problemId,
                              status: event.target.value,
                            }),
                          )
                        }
                        className="ml-auto h-7 w-32 text-[11.5px]"
                      >
                        {TASK_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Badge variant="muted" className="ml-auto">
                        {TASK_STATUSES.find((s) => s.value === task.status)?.label}
                      </Badge>
                    )}
                    {canManage ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete task"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm('Delete this task?')) return
                          run(() => deleteTaskAction({ taskId: task.id, problemId }))
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
          {!tasks.length ? (
            <li className="rounded-lg border border-dashed border-border p-4 text-center text-[12.5px] text-muted-foreground">
              No tasks yet. Break the work into the next two or three concrete steps.
            </li>
          ) : null}
        </ul>

        {canManage ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (taskTitle.trim().length < 3) return
              run(
                () =>
                  createTaskAction({
                    problemId,
                    title: taskTitle,
                    assigneeId: taskAssignee || undefined,
                  }),
                () => {
                  setTaskTitle('')
                  setTaskAssignee('')
                },
              )
            }}
            className="mt-4 flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row"
          >
            <Input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Add a task…"
              className="h-10 flex-1 bg-surface"
              maxLength={120}
            />
            <Select
              value={taskAssignee}
              onChange={(event) => setTaskAssignee(event.target.value)}
              className="h-10 bg-surface sm:w-44"
              aria-label="Assign to"
            >
              <option value="">Unassigned</option>
              {assignable.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" className="h-10" disabled={pending || taskTitle.trim().length < 3}>
              {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add
            </Button>
          </form>
        ) : (
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            Only the owner and contributors can add or change tasks.
          </p>
        )}
      </section>

      <section className="surface p-5">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
          <Link2 className="size-4 text-primary" /> Shared resources
        </h3>
        <ul className="mt-3 space-y-2">
          {resources.map((resource) => (
            <li key={resource.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-ai text-primary">
                <ExternalLink className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[13px] font-medium text-foreground hover:text-primary"
                >
                  {resource.title}
                </a>
                {resource.description ? (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{resource.description}</p>
                ) : null}
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {resource.author?.display_name ?? 'Member'} · {timeAgo(resource.created_at)}
                </p>
              </div>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove resource"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm('Remove this resource?')) return
                    run(() => deleteResourceAction({ resourceId: resource.id, problemId }))
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
          {!resources.length ? (
            <li className="rounded-lg border border-dashed border-border p-4 text-center text-[12.5px] text-muted-foreground">
              No shared references yet.
            </li>
          ) : null}
        </ul>

        {canManage ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (resourceTitle.trim().length < 3 || !resourceUrl.trim()) return
              run(
                () =>
                  addResourceAction({
                    problemId,
                    title: resourceTitle,
                    url: resourceUrl,
                    description: resourceDescription,
                  }),
                () => {
                  setResourceTitle('')
                  setResourceUrl('')
                  setResourceDescription('')
                },
              )
            }}
            className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={resourceTitle}
                onChange={(event) => setResourceTitle(event.target.value)}
                placeholder="Title"
                className="h-10 bg-surface"
                maxLength={120}
              />
              <Input
                value={resourceUrl}
                onChange={(event) => setResourceUrl(event.target.value)}
                placeholder="https://…"
                className="h-10 bg-surface"
                type="url"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={resourceDescription}
                onChange={(event) => setResourceDescription(event.target.value)}
                placeholder="Why is this useful? (optional)"
                className="min-h-10 flex-1 bg-surface py-2"
                rows={1}
                maxLength={300}
              />
              <Button type="submit" size="sm" className="h-10" disabled={pending || !resourceUrl.trim()}>
                <Plus /> Share
              </Button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="surface p-5">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
          <Users className="size-4 text-primary" /> Contributors
        </h3>
        <ul className="mt-3 space-y-2">
          {contributors.map((entry) => (
            <li key={entry.user_id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <Avatar name={entry.profile.display_name} src={entry.profile.avatar_url} size={32} />
              <div className="min-w-0 flex-1">
                <Link href={`/u/${entry.user_id}`} className="text-[13px] font-medium text-foreground hover:text-primary">
                  {entry.profile.display_name}
                </Link>
                <p className="text-[11.5px] text-muted-foreground">
                  {entry.role ?? 'Contributor'} · joined {timeAgo(entry.created_at)}
                </p>
              </div>
              {isOwner ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => removeContributorAction({ problemId, userId: entry.user_id }))}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
          {!contributors.length ? (
            <li className="rounded-lg border border-dashed border-border p-4 text-center text-[12.5px] text-muted-foreground">
              No contributors yet. Add someone from the recommendations or the member list.
            </li>
          ) : null}
        </ul>

        {isOwner ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!contributorId) return
              run(
                () => addContributorAction({ problemId, userId: contributorId, role: contributorRole }),
                () => {
                  setContributorId('')
                  setContributorRole('')
                },
              )
            }}
            className="mt-4 flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row"
          >
            <Select
              value={contributorId}
              onChange={(event) => setContributorId(event.target.value)}
              className="h-10 bg-surface sm:flex-1"
              aria-label="Choose a contributor"
            >
              <option value="">Choose a member…</option>
              {addable.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.display_name} — {profile.profession ?? 'Member'}
                </option>
              ))}
            </Select>
            <Input
              value={contributorRole}
              onChange={(event) => setContributorRole(event.target.value)}
              placeholder="Role (e.g. reviewer)"
              className="h-10 bg-surface sm:w-48"
              maxLength={60}
            />
            <Button type="submit" size="sm" className="h-10" disabled={pending || !contributorId}>
              <UserPlus /> Add
            </Button>
          </form>
        ) : !signedIn ? (
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            <Link href="/sign-in" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>{' '}
            to request access to this workspace.
          </p>
        ) : (
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            Only the problem owner can add contributors.
          </p>
        )}
        {!signedIn ? (
          <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-[11.5px] text-muted-foreground">
            You are viewing the public summary. Tasks and resources are visible to workspace members only.
          </div>
        ) : null}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Workspace data is limited to the owner and contributors; the discussion stays public.
        </p>
      </section>
    </div>
  )
}
