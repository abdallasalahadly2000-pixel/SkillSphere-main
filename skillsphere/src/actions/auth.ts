'use server'

import { revalidatePath } from 'next/cache'
import { repo } from '@/lib/data'
import { signInSchema, signUpSchema } from '@/lib/validation'
import type { SignInInput, SignUpInput } from '@/lib/validation'
import type { ActionResult } from '@/lib/types'

export async function signInAction(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your details.' }
  try {
    const result = await repo.signIn(parsed.data)
    if (result.ok) revalidatePath('/', 'layout')
    return result
  } catch (error) {
    console.error('[skillsphere:signIn]', error)
    return { ok: false, error: 'Could not sign in right now. Please try again.' }
  }
}

export async function signUpAction(
  input: SignUpInput,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your details.' }
  try {
    const result = await repo.signUp(parsed.data)
    if (result.ok) revalidatePath('/', 'layout')
    return result
  } catch (error) {
    console.error('[skillsphere:signUp]', error)
    return { ok: false, error: 'Could not create the account right now. Please try again.' }
  }
}

export async function signOutAction(): Promise<ActionResult> {
  try {
    await repo.signOut()
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (error) {
    console.error('[skillsphere:signOut]', error)
    return { ok: false, error: 'Could not sign out. Please try again.' }
  }
}
