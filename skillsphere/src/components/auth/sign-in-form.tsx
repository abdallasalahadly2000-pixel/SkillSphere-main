'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldError, Label } from '@/components/ui/label'
import { signInAction } from '@/actions/auth'
import { signInSchema, type SignInInput } from '@/lib/validation'

export function SignInForm({ demo }: { demo: { email: string; password: string } | null }) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) })

  async function onSubmit(values: SignInInput) {
    setServerError(null)
    const result = await signInAction(values)
    if (!result.ok) {
      setServerError(result.error)
      return
    }
    router.push('/home')
    router.refresh()
  }

  return (
    <div>
      <h1 className="text-[1.6rem] font-semibold tracking-tight text-foreground">Welcome back</h1>
      <p className="mt-1.5 text-[13.5px] text-muted-foreground">
        Sign in to publish problems, join discussions and collaborate.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
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
            autoComplete="current-password"
            placeholder="••••••••"
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
          {isSubmitting ? 'Signing in…' : 'Sign in'}
          {!isSubmitting ? <ArrowRight /> : null}
        </Button>
      </form>

      {demo ? (
        <div className="mt-5 rounded-lg border border-dashed border-border bg-surface/70 p-3.5">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">Demo account</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {demo.email} · {demo.password}
          </p>
          <Button
            type="button"
            variant="soft"
            size="sm"
            className="mt-2"
            onClick={() => {
              setValue('email', demo.email)
              setValue('password', demo.password)
            }}
          >
            Fill demo credentials
          </Button>
        </div>
      ) : null}

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        New to SkillSphere?{' '}
        <Link href="/sign-up" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-[12.5px] text-muted-foreground">
        <Link href="/home" className="hover:text-primary">
          Continue as a guest instead
        </Link>
      </p>
    </div>
  )
}
