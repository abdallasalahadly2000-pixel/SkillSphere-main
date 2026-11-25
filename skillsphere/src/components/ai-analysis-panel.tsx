import { Compass, HelpCircle, Search, Sparkles, Target, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { categoryLabel } from '@/lib/constants'
import type { AiAnalysis } from '@/lib/types'

export function AiAnalysisPanel({ analysis }: { analysis: AiAnalysis }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-ai/70">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-[13.5px] font-semibold text-primary">AI problem analysis</h2>
        <Badge variant="outline" className="ml-auto border-border bg-surface/70 text-[10.5px] text-primary">
          Suggestion · not verified
        </Badge>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Main problem</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-foreground">{analysis.main_problem}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Target className="size-3.5" /> Objective
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-foreground">{analysis.objective}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Wrench className="size-3.5" /> Skills suggested
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {analysis.required_skills.map((skill) => (
              <span
                key={skill}
                className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11.5px] font-medium text-primary"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Search className="size-3.5" /> Keywords
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {analysis.keywords.map((keyword) => (
              <span key={keyword} className="rounded-md bg-surface/80 px-2 py-0.5 text-[11.5px] text-muted-foreground">
                {keyword}
              </span>
            ))}
          </div>
        </div>
        {analysis.missing_information.length ? (
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <HelpCircle className="size-3.5" /> Missing information
            </p>
            <ul className="mt-2 space-y-1.5">
              {analysis.missing_information.map((item) => (
                <li key={item} className="flex gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {analysis.investigation_directions.length ? (
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Compass className="size-3.5" /> Directions to explore
            </p>
            <ul className="mt-2 space-y-1.5">
              {analysis.investigation_directions.map((item) => (
                <li key={item} className="flex gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <p className="border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
        Suggested category: {categoryLabel(analysis.category)} · Generated from the problem text, reviewed by the
        author before publishing.
      </p>
    </section>
  )
}
