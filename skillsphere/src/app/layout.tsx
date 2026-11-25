import type { Metadata } from 'next'
import '@fontsource-variable/inter'
import './globals.css'

export const metadata: Metadata = {
  title: 'SkillSphere — Connect. Collaborate. Solve.',
  description:
    'SkillSphere turns real-world problems into organised collaboration: AI problem analysis, explainable expert matching, shared workspaces and documented outcomes.',
}

// Applies the saved theme before first paint so a dark reload never flashes white.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('ss-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
