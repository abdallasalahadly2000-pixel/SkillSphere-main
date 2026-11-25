import type { Category, HelpType, ProblemStatus, SkillKind, TaskStatus } from './constants'

export type SkillLink = {
  name: string
  kind: SkillKind
}

export type Profile = {
  id: string
  display_name: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  profession: string | null
  location: string | null
  onboarding_complete: boolean
  profile_visibility: 'public' | 'connections'
  show_email: boolean
  notify_connections: boolean
  notify_comments: boolean
  notify_tasks: boolean
  is_demo: boolean
  created_at: string
  skills: SkillLink[]
}

export type ProfileLite = {
  id: string
  display_name: string
  avatar_url: string | null
  profession: string | null
  is_demo?: boolean
}

export type AiAnalysis = {
  main_problem: string
  objective: string
  required_skills: string[]
  keywords: string[]
  category: Category
  missing_information: string[]
  investigation_directions: string[]
}

export type Problem = {
  id: string
  owner_id: string
  title: string
  description: string
  category: Category
  help_type: HelpType
  status: ProblemStatus
  tags: string[]
  required_skills: string[]
  ai_analysis: AiAnalysis | null
  attachment_url: string | null
  cover_url: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
  owner: ProfileLite
  comment_count: number
  contributor_count: number
}

export type Comment = {
  id: string
  problem_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
  helpful_count: number
  viewer_found_helpful: boolean
  author: ProfileLite
}

export type Connection = {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export type Task = {
  id: string
  problem_id: string
  title: string
  description: string | null
  assignee_id: string | null
  status: TaskStatus
  created_by: string
  created_at: string
  assignee: ProfileLite | null
}

export type Resource = {
  id: string
  problem_id: string
  title: string
  url: string
  description: string | null
  added_by: string
  created_at: string
  author: ProfileLite | null
}

export type Contributor = {
  user_id: string
  problem_id: string
  role: string | null
  created_at: string
  profile: ProfileLite
}

export type SolutionReport = {
  id: string
  problem_id: string
  author_id: string
  outcome_status: 'solved' | 'partially_solved' | 'unable_to_verify'
  outcome_description: string
  attempted: string
  worked: string
  evidence: string | null
  created_at: string
}

export type Contribution = {
  id: string
  user_id: string
  problem_id: string
  solution_id: string | null
  summary: string
  confirmed: boolean
  created_at: string
  problem?: { id: string; title: string; status: ProblemStatus; category?: string; tags?: string[] } | null
}

export type ProblemFilters = {
  q?: string
  category?: string
  status?: string
  skill?: string
  ownerId?: string
  limit?: number
}

export type RecommendedUser = {
  profile: Profile
  score: number
  strength: 'strong' | 'good' | 'related'
  reasons: string[]
}

export type SimilarProblem = {
  problem: Problem
  score: number
  reasons: string[]
}

export type SessionUser = {
  id: string
  email: string
  displayName: string
}

export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; needsAuth?: boolean }

export type NewsItem = {
  id: string
  kind: 'problem' | 'solution' | 'announcement'
  title: string
  body: string
  href: string
  created_at: string
  actor?: ProfileLite | null
}
