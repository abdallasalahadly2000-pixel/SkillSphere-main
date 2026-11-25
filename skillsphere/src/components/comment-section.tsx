'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Pencil, Send, ThumbsUp, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { AuthPrompt } from '@/components/auth-prompt'
import {
  addCommentAction,
  deleteCommentAction,
  toggleHelpfulAction,
  updateCommentAction,
} from '@/actions/problems'
import { timeAgo } from '@/lib/utils'
import type { Comment } from '@/lib/types'

export function CommentSection({
  problemId,
  comments,
  viewerId,
  signedIn,
}: {
  problemId: string
  comments: Comment[]
  viewerId: string | null
  signedIn: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState('')

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <MessageSquare className="size-4 text-primary" /> Discussion
          <Badge variant="muted">{comments.length}</Badge>
        </h2>
      </div>

      {signedIn ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (draft.trim().length < 2) return
            run(
              () => addCommentAction({ problemId, body: draft }),
              () => setDraft(''),
            )
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Share an approach, ask a question, or point to something useful…"
            className="min-h-20 flex-1"
            maxLength={4000}
          />
          <Button type="submit" variant="default" disabled={pending || draft.trim().length < 2}>
            <Send /> {pending ? 'Posting…' : 'Post'}
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-surface/60 p-4">
          <p className="text-[12.5px] text-muted-foreground">Guests can read the discussion but not post to it.</p>
          <AuthPrompt label="Sign in to comment" title="Join the discussion" />
        </div>
      )}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {comments.length ? (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const isAuthor = viewerId === comment.author_id
            return (
              <li key={comment.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={comment.author.display_name} src={comment.author.avatar_url} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">
                        {comment.author.display_name}
                      </span>
                      {comment.author.is_demo ? <Badge variant="demo">Demo</Badge> : null}
                      <span className="text-[11.5px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
                      {isAuthor ? <Badge variant="outline">You</Badge> : null}
                    </div>

                    {editingId === comment.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editingBody}
                          onChange={(event) => setEditingBody(event.target.value)}
                          className="min-h-20"
                          maxLength={4000}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () =>
                                  updateCommentAction({
                                    commentId: comment.id,
                                    problemId,
                                    body: editingBody,
                                  }),
                                () => setEditingId(null),
                              )
                            }
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                        {comment.body}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center gap-1.5">
                      {signedIn ? (
                        <Button
                          variant={comment.viewer_found_helpful ? 'soft' : 'ghost'}
                          size="sm"
                          disabled={pending}
                          onClick={() => run(() => toggleHelpfulAction({ commentId: comment.id, problemId }))}
                        >
                          <ThumbsUp /> Helpful · {comment.helpful_count}
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-muted-foreground">
                          <ThumbsUp className="size-3.5" /> Helpful · {comment.helpful_count}
                        </span>
                      )}
                      {isAuthor ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(comment.id)
                              setEditingBody(comment.body)
                            }}
                          >
                            <Pencil /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger hover:bg-red-50"
                            disabled={pending}
                            onClick={() => {
                              if (!window.confirm('Delete this comment? This cannot be undone.')) return
                              run(() => deleteCommentAction({ commentId: comment.id, problemId }))
                            }}
                          >
                            <Trash2 /> Delete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface/60 p-5 text-center text-[12.5px] text-muted-foreground">
          No comments yet. The first useful question is often the most valuable contribution.
        </p>
      )}
    </div>
  )
}
