'use server'

import { revalidatePath } from 'next/cache'
import { repo } from '@/lib/data'
import { onboardingSchema, profileSchema, settingsSchema } from '@/lib/validation'
import type { OnboardingInput, ProfileInput } from '@/lib/validation'
import type { ActionResult } from '@/lib/types'

async function currentUserId(): Promise<string | null> {
  const user = await repo.getSessionUser()
  return user?.id ?? null
}

export async function saveOnboardingAction(input: OnboardingInput): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your details.' }
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to save your profile.', needsAuth: true }
  try {
    const result = await repo.completeOnboarding(userId, parsed.data)
    if (result.ok) revalidatePath('/', 'layout')
    return result
  } catch (error) {
    console.error('[skillsphere:onboarding]', error)
    return { ok: false, error: 'Could not save your profile. Please try again.' }
  }
}

export async function saveProfileAction(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your details.' }
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to edit your profile.', needsAuth: true }
  try {
    const result = await repo.updateProfile(userId, parsed.data)
    if (result.ok) {
      revalidatePath('/profile')
      revalidatePath('/', 'layout')
    }
    return result
  } catch (error) {
    console.error('[skillsphere:profile]', error)
    return { ok: false, error: 'Could not save your profile. Please try again.' }
  }
}

export async function saveSkillsAction(input: {
  expertise: string[]
  interest: string[]
  learning: string[]
  help: string[]
}): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to edit your skills.', needsAuth: true }
  const profile = await repo.getProfile(userId)
  if (!profile) return { ok: false, error: 'Profile not found.' }
  try {
    const result = await repo.completeOnboarding(userId, {
      displayName: profile.display_name,
      profession: profile.profession ?? '',
      location: profile.location ?? '',
      bio: profile.bio ?? '',
      avatarUrl: profile.avatar_url ?? '',
      skills: input,
    })
    if (result.ok) revalidatePath('/', 'layout')
    return result
  } catch (error) {
    console.error('[skillsphere:skills]', error)
    return { ok: false, error: 'Could not save your skills. Please try again.' }
  }
}

export async function saveSettingsAction(input: {
  profileVisibility: 'public' | 'connections'
  showEmail: boolean
  notifyConnections: boolean
  notifyComments: boolean
  notifyTasks: boolean
}): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Check your settings and try again.' }
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Sign in to change settings.', needsAuth: true }
  try {
    const result = await repo.updateSettings(userId, parsed.data)
    if (result.ok) revalidatePath('/settings')
    return result
  } catch (error) {
    console.error('[skillsphere:settings]', error)
    return { ok: false, error: 'Could not save your settings. Please try again.' }
  }
}
