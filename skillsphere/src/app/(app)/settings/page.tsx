import Link from 'next/link'
import { Database, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SettingsForm } from '@/components/settings-form'
import { getViewer } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/data'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const viewer = await getViewer()

  if (!viewer.user || !viewer.profile) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <h1 className="text-[17px] font-semibold text-foreground">Settings need an account</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Sign in to manage your profile preferences and privacy.
        </p>
        <Button asChild variant="gradient" className="mt-5">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    )
  }

  const supabase = isSupabaseConfigured()

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[12px] font-semibold uppercase tracking-wider text-primary">Account</p>
        <h1 className="mt-1 text-[1.7rem] font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Account information, privacy and basic notification preferences.
        </p>
      </header>

      <div className="surface p-5">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
          <UserRound className="size-4 text-primary" /> Account
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/60 p-3.5">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Mail className="size-3" /> Email
            </dt>
            <dd className="mt-1 truncate text-[13px] text-foreground">{viewer.user.email}</dd>
          </div>
          <div className="rounded-lg bg-muted/60 p-3.5">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="size-3" /> Member since
            </dt>
            <dd className="mt-1 text-[13px] text-foreground">{formatDate(viewer.profile.created_at)}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
          <Database className="size-3.5" />
          {supabase ? (
            <>
              Data is stored in Supabase Postgres with Row Level Security.
              <Badge variant="success">Supabase</Badge>
            </>
          ) : (
            <>
              Running on the local demo database (SQLite). Configure Supabase to use the hosted backend.
              <Badge variant="demo">Demo backend</Badge>
            </>
          )}
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/profile">Edit profile details and skills</Link>
          </Button>
        </div>
      </div>

      <SettingsForm profile={viewer.profile} />
    </div>
  )
}
