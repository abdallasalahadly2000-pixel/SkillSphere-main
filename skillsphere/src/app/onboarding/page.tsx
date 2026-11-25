import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/logo'
import { OnboardingForm } from '@/components/onboarding-form'
import { getViewer } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const viewer = await getViewer()
  if (!viewer.user) redirect('/sign-in')
  if (viewer.profile?.onboarding_complete) redirect('/home')

  return (
    <div className="page-glow min-h-dvh">
      <header className="mx-auto flex h-20 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <Logo size={32} />
        </Link>
        <Link href="/home" className="text-[12.5px] text-muted-foreground hover:text-primary">
          Skip for now
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        <div className="mb-6">
          <h1 className="text-[1.7rem] font-semibold tracking-tight text-foreground">
            Set up your profile
          </h1>
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
            SkillSphere matches people to problems using skills, interests and contribution history. A few
            details now make every recommendation better — you can change them at any time.
          </p>
        </div>
        <div className="surface p-5 sm:p-7">
          <OnboardingForm profile={viewer.profile} email={viewer.user.email} />
        </div>
      </main>
    </div>
  )
}
