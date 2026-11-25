'use client'

import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export const THEME_STORAGE_KEY = 'ss-theme'

/**
 * Switches between the light and dark palettes. The class lives on <html> so it
 * applies before hydration (see the inline script in app/layout.tsx) and is
 * shared by every page, including the welcome page.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    root.classList.toggle('dark', next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      // Private mode without storage: the choice lasts for this page view only.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      title="Switch theme"
      className={cn(
        'flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-hover',
        className,
      )}
    >
      <Sun className="hidden size-[18px] dark:block" />
      <Moon className="size-[18px] dark:hidden" />
    </button>
  )
}
