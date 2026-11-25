import {
  Bot,
  Brain,
  Briefcase,
  Code2,
  FlaskConical,
  GraduationCap,
  Palette,
  Sigma,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = {
  programming: Code2,
  'ai-ml': Brain,
  mathematics: Sigma,
  'science-research': FlaskConical,
  'engineering-robotics': Bot,
  'design-creativity': Palette,
  business: Briefcase,
  education: GraduationCap,
  general: Sparkles,
}

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = ICONS[category] ?? Sparkles
  return <Icon className={cn('size-4', className)} />
}
