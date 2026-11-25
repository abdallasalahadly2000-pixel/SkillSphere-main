import { AppShell } from '@/components/app-shell'
import { SiteNav } from '@/components/site-nav'
import { getViewer } from '@/lib/auth'
import { isSupabaseConfigured, repo } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  const [stats, members] = await Promise.all([
    repo.getStats(),
    repo.listProfiles({ excludeId: viewer.user?.id, limit: 5 }),
  ])

  const railViewer = viewer.user
    ? {
        id: viewer.user.id,
        name: viewer.profile?.display_name ?? viewer.user.displayName,
        avatarUrl: viewer.profile?.avatar_url ?? null,
        profession: viewer.profile?.profession ?? null,
      }
    : null

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav
        viewer={
          viewer.user
            ? {
                id: viewer.user.id,
                name: viewer.profile?.display_name ?? viewer.user.displayName,
                avatarUrl: viewer.profile?.avatar_url ?? null,
              }
            : null
        }
        demoMode={!isSupabaseConfigured()}
      />

      <AppShell
        viewer={railViewer}
        stats={stats}
        problemCount={stats.openProblems}
        members={members.map((member) => ({
          id: member.id,
          display_name: member.display_name,
          avatar_url: member.avatar_url,
          profession: member.profession,
        }))}
      >
        {children}
      </AppShell>
    </div>
  )
}
