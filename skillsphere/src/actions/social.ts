'use server'

import { revalidatePath } from 'next/cache'
import { repo } from '@/lib/data'
import type { ActionResult } from '@/lib/types'

async function currentUserId(): Promise<string | null> {
  const user = await repo.getSessionUser()
  return user?.id ?? null
}

function refresh(paths: string[]) {
  for (const path of paths) revalidatePath(path)
}

export async function sendConnectionRequestAction(targetId: string): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to connect with people.', needsAuth: true }
  try {
    const result = await repo.sendConnectionRequest(userId, targetId)
    if (result.ok) refresh(['/friends', '/home', '/u', '/profile'])
    return result
  } catch (error) {
    console.error('[skillsphere:connect]', error)
    return { ok: false, error: 'Could not send the request. Please try again.' }
  }
}

export async function respondToRequestAction(
  connectionId: string,
  accept: boolean,
): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to manage requests.', needsAuth: true }
  try {
    const result = await repo.respondToRequest(connectionId, userId, accept)
    if (result.ok) refresh(['/friends', '/home', '/profile'])
    return result
  } catch (error) {
    console.error('[skillsphere:respond]', error)
    return { ok: false, error: 'Could not answer the request. Please try again.' }
  }
}

export async function removeConnectionAction(connectionId: string): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to manage connections.', needsAuth: true }
  try {
    const result = await repo.removeConnection(connectionId, userId)
    if (result.ok) refresh(['/friends', '/home', '/profile', '/u'])
    return result
  } catch (error) {
    console.error('[skillsphere:removeConnection]', error)
    return { ok: false, error: 'Could not remove the connection. Please try again.' }
  }
}
