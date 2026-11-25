import { redirect } from 'next/navigation'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function SignUpPage() {
  const user = await getCurrentUser()
  if (user) redirect('/home')
  return <SignUpForm />
}
