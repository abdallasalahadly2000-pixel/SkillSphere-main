import { repo } from './data'
import type { Profile, SessionUser } from './types'

export type Viewer = {
  user: SessionUser | null
  profile: Profile | null
}

export async function getViewer(): Promise<Viewer> {
  const user = await repo.getSessionUser()
  if (!user) return { user: null, profile: null }
  const profile = await repo.getProfile(user.id)
  return { user, profile }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return repo.getSessionUser()
}

export function viewerLabel(viewer: Viewer): string {
  return viewer.profile?.display_name ?? viewer.user?.displayName ?? 'Guest'
}
