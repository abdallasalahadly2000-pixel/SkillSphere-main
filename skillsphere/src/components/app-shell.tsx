'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Bookmark,
  CheckCircle2,
  Compass,
  Home,
  MessageSquare,
  Newspaper,
  Plus,
  Settings,
  UserRound,
  Users,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export type RailViewer = {
  id: string
  name: string
  avatarUrl: string | null
  profession: string | null
} | null

export type RailMember = {
  id: string
  display_name: string
  avatar_url: string | null
  profession: string | null
}

const PRIMARY_NAV = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/problems', label: 'Explore problems', icon: Compass },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/news', label: 'News & updates', icon: Newspaper },
  { href: '/profile', label: 'My profile', icon: UserRound },
  { href: '/settings', label: 'Settings & privacy', icon: Settings },
]

export const RAIL_STORAGE_KEY = 'ss-rail-open'

export function AppShell({
  viewer,
  stats,
  members,
  problemCount,
  children,
}: {
  viewer: RailViewer
  stats: { openProblems: number; members: number; contributions: number }
  members: RailMember[]
  problemCount: number
  children: React.ReactNode
}) {
  const [railOpen, setRailOpen] = useState(true)

  useEffect(() => {
    const sync = () => setRailOpen(localStorage.getItem(RAIL_STORAGE_KEY) !== '0')
    sync()
    window.addEventListener('ss-rail-change', sync)
    return () => window.removeEventListener('ss-rail-change', sync)
  }, [])

  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 px-2 pt-[72px] transition-[grid-template-columns] sm:px-4 lg:gap-5',
        railOpen
          ? 'lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,614px)_304px] xl:justify-center xl:gap-6'
          : 'lg:grid-cols-1 xl:grid-cols-[minmax(0,614px)_304px] xl:justify-center',
      )}
    >
      {railOpen ? <LeftRail viewer={viewer} problemCount={problemCount} /> : null}
      <main className="mx-auto w-full min-w-0 max-w-[680px] pb-20">{children}</main>
      <RightRail viewer={viewer} stats={stats} members={members} />
    </div>
  )
}

export function LeftRail({ viewer, problemCount }: { viewer: RailViewer; problemCount: number }) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:block">
      <div className="rail-scroll sticky top-[72px] max-h-[calc(100vh-72px)] overflow-y-auto pb-6">
        {viewer ? (
          <Link
            href="/profile"
            className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-hover"
          >
            <Avatar name={viewer.name} src={viewer.avatarUrl} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-foreground">
                {viewer.name}
              </span>
              <span className="block truncate text-[12px] text-muted-foreground">
                {viewer.profession ?? 'Member'}
              </span>
            </span>
            <span className="rounded-md bg-surface px-2 py-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View
            </span>
          </Link>
        ) : (
          <Link
            href="/sign-in"
            className="flex items-center gap-3 rounded-lg bg-surface p-3 shadow-card transition-colors hover:bg-hover"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-ai text-primary">
              <UserRound className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold text-foreground">
                Sign in to SkillSphere
              </span>
              <span className="block text-[12px] text-muted-foreground">Publish, comment and connect</span>
            </span>
          </Link>
        )}

        <nav className="mt-3" aria-label="Menu">
          <p className="mb-1 px-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Menu
          </p>
          {PRIMARY_NAV.map((item) => {
            const active =
              item.href === '/home' ? pathname === '/home' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[14.5px] font-medium transition-colors',
                  active ? 'bg-ai text-primary' : 'text-foreground hover:bg-hover',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md',
                    active ? 'bg-primary text-white' : 'bg-hover text-foreground',
                  )}
                >
                  <item.icon className="size-5" />
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="my-2 h-px bg-border" />

        <p className="mb-1 px-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Your space
        </p>
        <Link
          href="/problems/new"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[14.5px] font-medium text-foreground transition-colors hover:bg-hover"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-hover">
            <Plus className="size-5" />
          </span>
          Publish a problem
        </Link>
        <Link
          href="/problems?status=open"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[14.5px] font-medium text-foreground transition-colors hover:bg-hover"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-hover">
            <Bookmark className="size-5" />
          </span>
          Open problems
          <span className="ml-auto rounded-md bg-hover px-1.5 py-0.5 text-[11.5px] font-semibold text-muted-foreground">
            {problemCount}
          </span>
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[14.5px] font-medium text-foreground transition-colors hover:bg-hover"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-hover">
            <CheckCircle2 className="size-5" />
          </span>
          Contributions
        </Link>
        <Link
          href="/problems"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[14.5px] font-medium text-foreground transition-colors hover:bg-hover"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-hover">
            <MessageSquare className="size-5" />
          </span>
          Discussions
        </Link>

        <div className="mt-3 rounded-lg bg-ai p-3">
          <p className="text-[12.5px] font-semibold text-primary">Better matches start with skills</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
            Add what you know to your profile and people will be matched to your work.
          </p>
          <Link
            href="/profile"
            className="mt-1.5 inline-block text-[12px] font-semibold text-primary hover:underline"
          >
            Update profile
          </Link>
        </div>
      </div>
    </aside>
  )
}

export function RightRail({
  viewer,
  stats,
  members,
}: {
  viewer: RailViewer
  stats: { openProblems: number; members: number; contributions: number }
  members: RailMember[]
}) {
  return (
    <aside className="hidden xl:block">
      <div className="rail-scroll sticky top-[72px] max-h-[calc(100vh-72px)] space-y-4 overflow-y-auto pb-6">
        <section className="surface p-4">
          <h2 className="text-[16px] font-semibold text-foreground">Your activity</h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {viewer ? `Signed in as ${viewer.name}` : 'Browsing as a guest'}
          </p>
          <dl className="mt-3 space-y-2">
            {[
              { label: 'Active problems', value: stats.openProblems },
              { label: 'Members', value: stats.members },
              { label: 'Confirmed contributions', value: stats.contributions },
            ].map((entry) => (
              <div key={entry.label} className="flex items-center justify-between gap-2">
                <dt className="text-[13.5px] text-muted-foreground">{entry.label}</dt>
                <dd className="text-[13.5px] font-semibold text-foreground">{entry.value}</dd>
              </div>
            ))}
          </dl>
          <div className="my-3 h-px bg-border" />
          <Link
            href="/problems/new"
            className="flex h-9 items-center justify-center rounded-md bg-primary text-[14px] font-semibold text-white hover:bg-primary-hover"
          >
            Create a problem
          </Link>
        </section>

        <section className="surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-foreground">Newest members</h2>
            <Link href="/friends" className="text-[12.5px] font-semibold text-primary hover:underline">
              See all
            </Link>
          </div>
          <ul className="mt-2 space-y-1">
            {members.map((member) => (
              <li key={member.id}>
                <Link
                  href={`/u/${member.id}`}
                  className="-mx-1 flex items-center gap-2.5 rounded-md p-1 transition-colors hover:bg-hover"
                >
                  <Avatar name={member.display_name} src={member.avatar_url} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-foreground">
                      {member.display_name}
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {member.profession ?? 'Member'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {!members.length ? (
              <li className="py-2 text-[12.5px] text-muted-foreground">No other members yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="px-2 text-[11.5px] leading-relaxed text-muted-foreground/70">
          <p className="font-semibold text-muted-foreground">SkillSphere · Connect. Collaborate. Solve.</p>
          <p className="mt-1">
            AI analysis and matching are suggestions, shown with their reasons. Nothing is presented as
            verified fact.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/problems" className="hover:underline">
              Explore
            </Link>
            <Link href="/news" className="hover:underline">
              Updates
            </Link>
            <Link href="/settings" className="hover:underline">
              Settings
            </Link>
            <Link href="/profile" className="hover:underline">
              Profile
            </Link>
          </div>
          <p className="mt-2">© {new Date().getFullYear()} SkillSphere</p>
        </section>
      </div>
    </aside>
  )
}
