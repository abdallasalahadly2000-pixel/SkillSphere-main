import { redirect } from 'next/navigation'
import { SignInForm } from '@/components/auth/sign-in-form'
import { getCurrentUser } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/data'
import { DEMO_ACCOUNT } from '@/lib/data/demo/db'

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  const user = await getCurrentUser()
  if (user) redirect('/home')

  return <SignInForm demo={isSupabaseConfigured() ? null : DEMO_ACCOUNT} />
}
