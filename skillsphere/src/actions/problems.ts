'use server'

import { revalidatePath } from 'next/cache'
import { repo } from '@/lib/data'
import { commentSchema, problemSchema, statusSchema } from '@/lib/validation'
import type { ProblemInput } from '@/lib/validation'
import type { ActionResult, AiAnalysis } from '@/lib/types'

async function currentUserId(): Promise<string | null> {
  const user = await repo.getSessionUser()
  return user?.id ?? null
}

export async function createProblemAction(
  input: ProblemInput & { aiAnalysis?: AiAnalysis | null },
): Promise<ActionResult<{ id: string }>> {
  const parsed = problemSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the problem details.' }
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to publish a problem.', needsAuth: true }
  try {
    const result = await repo.createProblem(userId, { ...parsed.data, aiAnalysis: input.aiAnalysis ?? null })
    if (result.ok) {
      revalidatePath('/home')
      revalidatePath('/problems')
      revalidatePath('/news')
      revalidatePath('/profile')
    }
    return result
  } catch (error) {
    console.error('[skillsphere:createProblem]', error)
    return { ok: false, error: 'Could not publish the problem. Please try again.' }
  }
}

export async function updateProblemAction(
  id: string,
  input: ProblemInput,
): Promise<ActionResult> {
  const parsed = problemSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the problem details.' }
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to edit this problem.', needsAuth: true }
  try {
    const result = await repo.updateProblem(id, userId, parsed.data)
    if (result.ok) {
      revalidatePath(`/problems/${id}`)
      revalidatePath('/problems')
      revalidatePath('/home')
    }
    return result
  } catch (error) {
    console.error('[skillsphere:updateProblem]', error)
    return { ok: false, error: 'Could not update the problem. Please try again.' }
  }
}

export async function deleteProblemAction(id: string): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to manage this problem.', needsAuth: true }
  try {
    const result = await repo.deleteProblem(id, userId)
    if (result.ok) {
      revalidatePath('/problems')
      revalidatePath('/home')
    }
    return result
  } catch (error) {
    console.error('[skillsphere:deleteProblem]', error)
    return { ok: false, error: 'Could not delete the problem. Please try again.' }
  }
}

export async function setProblemStatusAction(input: {
  problemId: string
  status: string
}): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Unknown status.' }
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to change the status.', needsAuth: true }
  try {
    const result = await repo.updateProblemStatus(parsed.data.problemId, userId, parsed.data.status)
    if (result.ok) {
      revalidatePath(`/problems/${parsed.data.problemId}`)
      revalidatePath('/problems')
    }
    return result
  } catch (error) {
    console.error('[skillsphere:status]', error)
    return { ok: false, error: 'Could not change the status. Please try again.' }
  }
}

export async function addCommentAction(input: { problemId: string; body: string }): Promise<ActionResult> {
  const parsed = commentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Write a comment first.' }
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to join the discussion.', needsAuth: true }
  try {
    const result = await repo.addComment(parsed.data.problemId, userId, parsed.data.body)
    if (result.ok) revalidatePath(`/problems/${parsed.data.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:addComment]', error)
    return { ok: false, error: 'Could not post your comment. Please try again.' }
  }
}

export async function updateCommentAction(input: {
  commentId: string
  problemId: string
  body: string
}): Promise<ActionResult> {
  if (input.body.trim().length < 2) return { ok: false, error: 'Write a comment first.' }
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to edit your comment.', needsAuth: true }
  try {
    const result = await repo.updateComment(input.commentId, userId, input.body)
    if (result.ok) revalidatePath(`/problems/${input.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:updateComment]', error)
    return { ok: false, error: 'Could not update the comment. Please try again.' }
  }
}

export async function deleteCommentAction(input: {
  commentId: string
  problemId: string
}): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to delete your comment.', needsAuth: true }
  try {
    const result = await repo.deleteComment(input.commentId, userId)
    if (result.ok) revalidatePath(`/problems/${input.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:deleteComment]', error)
    return { ok: false, error: 'Could not delete the comment. Please try again.' }
  }
}

export async function toggleHelpfulAction(input: {
  commentId: string
  problemId: string
}): Promise<ActionResult<{ helpful: boolean }>> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to mark a comment as helpful.', needsAuth: true }
  try {
    const result = await repo.toggleCommentHelpful(input.commentId, userId)
    if (result.ok) revalidatePath(`/problems/${input.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:helpful]', error)
    return { ok: false, error: 'Could not update the helpful mark. Please try again.' }
  }
}
