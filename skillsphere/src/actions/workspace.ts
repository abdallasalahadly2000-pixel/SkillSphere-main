'use server'

import { revalidatePath } from 'next/cache'
import { repo } from '@/lib/data'
import { resourceSchema, solutionSchema, taskSchema } from '@/lib/validation'
import type { SolutionInput } from '@/lib/validation'
import type { ActionResult } from '@/lib/types'
import { TASK_STATUS_VALUES, type TaskStatus } from '@/lib/constants'

async function currentUserId(): Promise<string | null> {
  const user = await repo.getSessionUser()
  return user?.id ?? null
}

const authError = { ok: false as const, error: 'Sign in to work in this workspace.', needsAuth: true }

export async function createTaskAction(input: {
  problemId: string
  title: string
  description?: string
  assigneeId?: string
}): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the task.' }
  const userId = await currentUserId()
  if (!userId) return authError
  try {
    const result = await repo.createTask(parsed.data.problemId, userId, {
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      assigneeId: parsed.data.assigneeId || undefined,
    })
    if (result.ok) revalidatePath(`/problems/${parsed.data.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:createTask]', error)
    return { ok: false, error: 'Could not create the task. Please try again.' }
  }
}

export async function setTaskStatusAction(input: {
  taskId: string
  problemId: string
  status: string
}): Promise<ActionResult> {
  if (!TASK_STATUS_VALUES.includes(input.status as TaskStatus)) {
    return { ok: false, error: 'Unknown task status.' }
  }
  const userId = await currentUserId()
  if (!userId) return authError
  try {
    const result = await repo.updateTaskStatus(input.taskId, userId, input.status as TaskStatus)
    if (result.ok) revalidatePath(`/problems/${input.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:taskStatus]', error)
    return { ok: false, error: 'Could not update the task. Please try again.' }
  }
}

export async function deleteTaskAction(input: {
  taskId: string
  problemId: string
}): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return authError
  try {
    const result = await repo.deleteTask(input.taskId, userId)
    if (result.ok) revalidatePath(`/problems/${input.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:deleteTask]', error)
    return { ok: false, error: 'Could not delete the task. Please try again.' }
  }
}

export async function addResourceAction(input: {
  problemId: string
  title: string
  url: string
  description?: string
}): Promise<ActionResult> {
  const parsed = resourceSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the link.' }
  const userId = await currentUserId()
  if (!userId) return authError
  try {
    const result = await repo.addResource(parsed.data.problemId, userId, {
      title: parsed.data.title,
      url: parsed.data.url,
      description: parsed.data.description || undefined,
    })
    if (result.ok) revalidatePath(`/problems/${parsed.data.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:addResource]', error)
    return { ok: false, error: 'Could not share the resource. Please try again.' }
  }
}

export async function deleteResourceAction(input: {
  resourceId: string
  problemId: string
}): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return authError
  try {
    const result = await repo.deleteResource(input.resourceId, userId)
    if (result.ok) revalidatePath(`/problems/${input.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:deleteResource]', error)
    return { ok: false, error: 'Could not remove the resource. Please try again.' }
  }
}

export async function addContributorAction(input: {
  problemId: string
  userId: string
  role: string
}): Promise<ActionResult> {
  const ownerId = await currentUserId()
  if (!ownerId) return authError
  try {
    const result = await repo.addContributor(input.problemId, ownerId, input.userId, input.role)
    if (result.ok) revalidatePath(`/problems/${input.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:addContributor]', error)
    return { ok: false, error: 'Could not add the contributor. Please try again.' }
  }
}

export async function removeContributorAction(input: {
  problemId: string
  userId: string
}): Promise<ActionResult> {
  const ownerId = await currentUserId()
  if (!ownerId) return authError
  try {
    const result = await repo.removeContributor(input.problemId, ownerId, input.userId)
    if (result.ok) revalidatePath(`/problems/${input.problemId}`)
    return result
  } catch (error) {
    console.error('[skillsphere:removeContributor]', error)
    return { ok: false, error: 'Could not remove the contributor. Please try again.' }
  }
}

export async function reportSolutionAction(input: SolutionInput): Promise<ActionResult> {
  const parsed = solutionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the outcome report.' }
  const ownerId = await currentUserId()
  if (!ownerId) return authError
  try {
    const result = await repo.reportSolution(parsed.data.problemId, ownerId, {
      outcomeStatus: parsed.data.outcomeStatus,
      outcomeDescription: parsed.data.outcomeDescription,
      attempted: parsed.data.attempted,
      worked: parsed.data.worked,
      evidence: parsed.data.evidence || undefined,
      contributorIds: parsed.data.contributorIds,
    })
    if (result.ok) {
      revalidatePath(`/problems/${parsed.data.problemId}`)
      revalidatePath('/news')
      revalidatePath('/profile')
      revalidatePath('/home')
    }
    return result
  } catch (error) {
    console.error('[skillsphere:reportSolution]', error)
    return { ok: false, error: 'Could not save the outcome. Please try again.' }
  }
}
