'use client'

import Link from 'next/link'
import { LockKeyhole } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function AuthPrompt({
  label = 'Sign in to continue',
  title = 'Create an account to take part',
  description = 'Guests can read problems, discussions and public profiles. Publishing, commenting, connecting and collaborating need a free account.',
  variant = 'soft',
  size = 'sm',
  className,
  icon = true,
}: {
  label?: string
  title?: string
  description?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
  icon?: boolean
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {icon ? <LockKeyhole /> : null}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted/60 p-3 text-[12.5px] text-muted-foreground">
          Nothing you did was saved. Guests are read-only on SkillSphere.
        </div>
        <DialogFooter>
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="gradient">
            <Link href="/sign-up">Create account</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
