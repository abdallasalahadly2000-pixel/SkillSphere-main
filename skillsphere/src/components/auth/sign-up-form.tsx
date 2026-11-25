'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldError, Label } from '@/components/ui/label'
import { signUpAction } from '@/actions/auth'
import { signUpSchema, type SignUpInput } from '@/lib/validation'

export function SignUpForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) })

  async function onSubmit(values: SignUpInput) {
    setServerError(null)
    const result = await signUpAction(values)
    if (!result.ok) {
      setServerError(result.error)
      return
    }
    if (result.data.needsConfirmation) {
      setNeedsConfirmation(true)
      return
    }
    router.push('/onboarding')
    router.refresh()
  }

  if (needsConfirmation) {
    return (
      <div className="surface p-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-lg bg-ai text-primary">
          <MailCheck className="size-6" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Confirm your email</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Your account was created. Supabase sent a confirmation link — open it, then sign in to finish your
          profile.
        </p>
        <Button asChild variant="gradient" className="mt-5 w-full">
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-[1.6rem] font-semibold tracking-tight text-foreground">Create your account</h1>
      <p className="mt-1.5 text-[13.5px] text-muted-foreground">
        One short profile, then you can publish a problem and find the people who can help.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Ahmed Hassan"
            className="mt-1.5"
            {...register('fullName')}
          />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-1.5"
            {...register('email')}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="mt-1.5"
            {...register('password')}
          />
          <FieldError message={errors.password?.message} />
        </div>

        {serverError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
            {serverError}
          </p>
        ) : null}

        <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {isSubmitting ? 'Creating account…' : 'Create account'}
          {!isSubmitting ? <ArrowRight /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
