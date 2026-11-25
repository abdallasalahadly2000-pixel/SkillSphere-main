import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  ListChecks,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/ui/motion'
import { CategoryIcon } from '@/components/category-icon'
import { StatusBadge } from '@/components/status-badge'
import { repo, isSupabaseConfigured } from '@/lib/data'
import { DEMO_ACCOUNT } from '@/lib/data/demo/db'
import { getCurrentUser } from '@/lib/auth'
import { categoryLabel } from '@/lib/constants'
import { truncate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STEPS = [
  { title: 'Publish', body: 'Describe the problem in your own words.' },
  { title: 'Understand', body: 'AI surfaces skills, gaps and next directions.' },
  { title: 'Discover', body: 'See related problems and people, with reasons.' },
  { title: 'Collaborate', body: 'Organise tasks and references in a workspace.' },
  { title: 'Document', body: 'Record the outcome and confirmed contributions.' },
]

export default async function WelcomePage() {
  const user = await getCurrentUser()
  if (user) redirect('/home')

  const [stats, problems, roboticsProblems] = await Promise.all([
    repo.getStats(),
    repo.listProblems({ limit: 4 }),
    repo.listProblems({ category: 'engineering-robotics', limit: 1 }),
  ])
  const demoMode = !isSupabaseConfigured()
  const spotlight = roboticsProblems[0] ?? problems[0]

  return (
    <div className="page-glow min-h-dvh">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo size={34} />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="gradient" size="sm">
            <Link href="/sign-up">
              Get started <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <section className="grid items-center gap-12 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <FadeIn>
            <Badge variant="primary" className="mb-5 px-3 py-1">
              <Sparkles className="size-3.5" /> AI-powered collaborative problem solving
            </Badge>
            <h1 className="text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[3.4rem]">
              Connect. Collaborate.
              <br />
              <span className="gradient-text">Solve.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-muted-foreground">
              Turn human knowledge into collective solutions. SkillSphere reads a problem, finds the
              expertise it needs, and gives the people working on it a place to organise the work and
              document what actually happened.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="gradient">
                <Link href="/sign-up">
                  Sign up <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-muted-foreground">
                <Link href="/home">
                  Continue as guest <ArrowRight />
                </Link>
              </Button>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border/80 pt-6">
              {[
                { label: 'Active problems', value: stats.openProblems },
                { label: 'Members', value: stats.members },
                { label: 'Confirmed contributions', value: stats.contributions },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd className="mt-0.5 text-[22px] font-semibold text-foreground">{stat.value}</dd>
                </div>
              ))}
            </dl>

            {demoMode ? (
              <p className="mt-6 max-w-lg rounded-lg border border-dashed border-border bg-surface/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
                Running on the local demo database. Sign in with{' '}
                <span className="font-semibold text-foreground">{DEMO_ACCOUNT.email}</span> /{' '}
                <span className="font-semibold text-foreground">{DEMO_ACCOUNT.password}</span> to explore the seeded
                robotics scenario, or create your own account.
              </p>
            ) : null}
          </FadeIn>

          <FadeIn delay={0.12} className="relative">
            <div className="relative mx-auto w-full max-w-[460px]">
              <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_65%_18%,#e2eeff_0%,rgba(255,255,255,0)_68%)]" />

              <div className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-[0_34px_70px_-36px_rgba(15,23,42,0.45)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
                    <LogoMark size={20} /> Problem workspace
                  </span>
                  <span className="rounded-md bg-ai px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Open
                  </span>
                </div>

                <div className="px-5 pb-5 pt-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Engineering · Robotics
                  </p>
                  <p className="mt-1.5 text-[15px] font-semibold leading-snug text-foreground">
                    Robot loses localisation after the second docking cycle
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {['Localisation', 'ROS2', 'Sensor fusion'].map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg border border-border bg-ai p-3.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      <Sparkles className="size-3.5" /> AI analysis · suggested
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                      Likely drift in the fused IMU and odometry estimate. Suggested next step: compare
                      pose error before and after docking.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <Avatar name="Omar Khaled" size={26} className="ring-2 ring-surface" />
                        <Avatar name="Mona Hassan" size={26} className="ring-2 ring-surface" />
                        <Avatar name="Sarah Ahmed" size={26} className="ring-2 ring-surface" />
                      </div>
                      <span className="text-[11.5px] text-muted-foreground">3 contributors matched</span>
                    </div>
                    <span className="flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground">
                      <CheckCircle2 className="size-3.5 text-emerald-500" /> Evidence shown
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-11 left-6 hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-lg sm:flex">
                <span className="flex size-7 items-center justify-center rounded-md bg-ai text-primary">
                  <CheckCircle2 className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-foreground">Outcome documented</p>
                  <p className="text-[10.5px] text-muted-foreground">Confirmed on 3 profiles</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: BrainCircuit,
              title: 'AI reads the problem',
              body: 'Skills, keywords, missing information and investigation directions — labelled as suggestions, always reviewed by the author.',
            },
            {
              icon: Users,
              title: 'Matching you can audit',
              body: 'Contributors are ranked by skill overlap, interests and contribution history. Every recommendation shows its evidence.',
            },
            {
              icon: ListChecks,
              title: 'From problem to outcome',
              body: 'Tasks, shared references and a discussion stay attached to the problem, and confirmed contributions land on profiles.',
            },
          ].map((feature) => (
            <div key={feature.title} className="surface p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-ai text-primary">
                <feature.icon className="size-5" />
              </div>
              <h3 className="text-[14.5px] font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              One workflow, end to end
            </h2>
          </div>
          <ol className="mt-4 grid gap-3 sm:grid-cols-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-lg border border-border bg-surface/70 p-4">
                <span className="text-[11px] font-semibold text-primary">0{index + 1}</span>
                <p className="mt-1 text-[13.5px] font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {spotlight ? (
          <section className="mt-14 overflow-hidden rounded-lg border border-border bg-surface p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <Badge variant="primary" className="mb-3">
                  <CategoryIcon category={spotlight.category} className="size-3" />
                  Demo scenario · {categoryLabel(spotlight.category)}
                </Badge>
                <h2 className="text-[22px] font-semibold leading-snug tracking-tight text-foreground">
                  {spotlight.title}
                </h2>
                <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
                  {truncate(spotlight.description, 240)}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <StatusBadge status={spotlight.status} />
                  <span className="text-[12.5px] text-muted-foreground">
                    {spotlight.comment_count} comments · {spotlight.contributor_count} contributors
                  </span>
                  <Button asChild size="sm" variant="gradient" className="ml-auto">
                    <Link href={`/problems/${spotlight.id}`}>
                      See it in action <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
              </div>
              <ul className="space-y-2.5 rounded-lg border border-border bg-muted/60 p-4">
                {[
                  'AI analysis of the localisation failure',
                  'Related problems found by shared tags and skills',
                  'Contributors matched with evidence',
                  'Tasks, references and a documented outcome',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-border/70 bg-surface/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-8 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span>· Turn human knowledge into collective solutions.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/problems" className="hover:text-primary">
              Explore problems
            </Link>
            <Link href="/news" className="hover:text-primary">
              Community updates
            </Link>
            <Link href="/sign-up" className="hover:text-primary">
              Create an account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
