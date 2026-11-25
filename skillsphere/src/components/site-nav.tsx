'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import {
  Compass,
  Home,
  LogOut,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  UserRound,
  Users,
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutAction } from '@/actions/auth'
import { cn } from '@/lib/utils'

export type NavViewer = { id: string; name: string; avatarUrl: string | null } | null

const LINKS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/problems', label: 'Explore', short: 'Explore', icon: Compass },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/profile', label: 'Profile', icon: UserRound },
]

export function SiteNav({ viewer, demoMode }: { viewer: NavViewer; demoMode: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [railOpen, setRailOpen] = useState(true)

  useEffect(() => {
    setRailOpen(localStorage.getItem('ss-rail-open') !== '0')
  }, [])

  function toggleRail() {
    const next = !railOpen
    setRailOpen(next)
    localStorage.setItem('ss-rail-open', next ? '1' : '0')
    window.dispatchEvent(new Event('ss-rail-change'))
  }

  const isActive = (href: string) =>
    href === '/home' ? pathname === '/home' : pathname === href || pathname.startsWith(`${href}/`)

  function signOut() {
    startTransition(async () => {
      await signOutAction()
      router.push('/')
      router.refresh()
    })
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-1 px-2 sm:px-4">
        <Link
          href={viewer ? '/home' : '/'}
          className="flex shrink-0 items-center md:pr-2"
          aria-label="SkillSphere home"
        >
          <span className="md:hidden">
            <LogoMark size={40} />
          </span>
          <span className="hidden md:inline-flex">
            <Logo size={40} />
          </span>
          {demoMode ? (
            <span className="ml-2 hidden rounded-md bg-warning/15 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-warning lg:inline">
              Demo
            </span>
          ) : null}
        </Link>

        <button
          type="button"
          onClick={toggleRail}
          aria-label={railOpen ? 'Hide menu' : 'Show menu'}
          aria-pressed={!railOpen}
          title={railOpen ? 'Hide menu' : 'Show menu'}
          className="ml-1 hidden size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-hover lg:flex"
        >
          {railOpen ? <PanelLeftClose className="size-[18px]" /> : <PanelLeftOpen className="size-[18px]" />}
        </button>

        <form
          action="/problems"
          role="search"
          className="relative ml-1 hidden w-[240px] shrink-0 md:block"
        >
          <label htmlFor="nav-search" className="sr-only">
            Search SkillSphere
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="nav-search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search SkillSphere"
            className="h-10 w-full rounded-md bg-muted pl-9 pr-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:bg-surface focus:ring-1 focus:ring-primary/40"
          />
        </form>

        <nav className="flex flex-1 items-center justify-center gap-0.5 sm:gap-1" aria-label="Main">
          {LINKS.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex h-14 w-full max-w-[92px] items-center justify-center border-b-[3px] transition-colors sm:max-w-[110px]',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:bg-hover',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <link.icon className="size-[24px]" strokeWidth={active ? 2.4 : 2} />
                <span className="sr-only">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
          <Link
            href="/problems"
            aria-label="Search problems"
            className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-hover md:hidden"
          >
            <Search className="size-[18px]" />
          </Link>

          <ThemeToggle />

          {viewer ? (
            <>
              <Link
                href="/problems/new"
                aria-label="Create a problem"
                className="hidden size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-hover sm:flex"
              >
                <Plus className="size-5" />
              </Link>
              <Link
                href="/settings"
                aria-label="Settings"
                className="hidden size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-hover sm:flex"
              >
                <Settings className="size-[18px]" />
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full ring-offset-2 transition hover:ring-2 hover:ring-primary/30"
                    aria-label={`${viewer.name} account menu`}
                  >
                    <Avatar name={viewer.name} src={viewer.avatarUrl} size={36} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
                    <Avatar name={viewer.name} src={viewer.avatarUrl} size={36} />
                    <span className="text-[15px] font-semibold text-foreground">{viewer.name}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile`}>
                      <UserRound className="size-4 text-muted-foreground" /> Your profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/problems/new">
                      <Plus className="size-4 text-muted-foreground" /> Create a problem
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="size-4 text-muted-foreground" /> Settings & privacy
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={signOut} disabled={pending}>
                    <LogOut className="size-4 text-muted-foreground" /> {pending ? 'Signing out…' : 'Log out'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/sign-in"
                className="hidden h-9 items-center rounded-md px-3 text-[14px] font-semibold text-primary hover:bg-hover sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-[14px] font-semibold text-white hover:bg-primary-hover"
              >
                Join
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
