import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-glow grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#0B5FCE_0%,#1877F2_50%,#38BDF8_100%)] p-10 text-white lg:flex">
        <Link href="/" className="relative z-10 inline-flex items-center gap-2.5">
          <Logo size={34} showWordmark={false} />
          <span className="text-[1.1rem] font-semibold">SkillSphere</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="text-[2rem] font-semibold leading-tight tracking-tight">
            Turn a difficult problem into organised collaboration.
          </h2>
          <ul className="mt-7 space-y-3.5">
            {[
              'AI analysis that names the skills a problem needs',
              'Explainable contributor matching, with evidence',
              'A workspace for tasks, references and discussion',
              'Outcomes and confirmed contributions on profiles',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-white/85">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[12px] text-white/70">
          Connect. Collaborate. Solve.
        </p>

        <div className="pointer-events-none absolute -right-24 top-1/4 size-[26rem] rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -right-10 top-[18%] size-[34rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-cyan-400/20 blur-3xl" />
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex lg:hidden">
            <Logo size={32} />
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
