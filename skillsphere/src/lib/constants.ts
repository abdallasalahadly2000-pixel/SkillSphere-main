export const APP_NAME = 'SkillSphere'
export const APP_TAGLINE = 'Connect. Collaborate. Solve.'
export const APP_VISION = 'Turn Human Knowledge into Collective Solutions.'

export const CATEGORIES = [
  { value: 'programming', label: 'Programming & Software', icon: 'Code2' },
  { value: 'ai-ml', label: 'AI & Machine Learning', icon: 'Brain' },
  { value: 'mathematics', label: 'Mathematics', icon: 'Sigma' },
  { value: 'science-research', label: 'Science & Research', icon: 'FlaskConical' },
  { value: 'engineering-robotics', label: 'Engineering & Robotics', icon: 'Bot' },
  { value: 'design-creativity', label: 'Design & Creativity', icon: 'Palette' },
  { value: 'business', label: 'Business & Entrepreneurship', icon: 'Briefcase' },
  { value: 'education', label: 'Education', icon: 'GraduationCap' },
  { value: 'general', label: 'General', icon: 'Sparkles' },
] as const

export type Category = (typeof CATEGORIES)[number]['value']

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [Category, ...Category[]]

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? 'General'
}

export const PROBLEM_STATUSES = [
  { value: 'open', label: 'Open', tone: 'primary' },
  { value: 'in_progress', label: 'In Progress', tone: 'warning' },
  { value: 'solved', label: 'Solved', tone: 'success' },
  { value: 'partially_solved', label: 'Partially Solved', tone: 'secondary' },
  { value: 'unable_to_verify', label: 'Unable to Verify', tone: 'muted' },
] as const

export type ProblemStatus = (typeof PROBLEM_STATUSES)[number]['value']

export const PROBLEM_STATUS_VALUES = PROBLEM_STATUSES.map((s) => s.value) as [
  ProblemStatus,
  ...ProblemStatus[],
]

export function statusLabel(value: string): string {
  return PROBLEM_STATUSES.find((s) => s.value === value)?.label ?? value
}

export const HELP_TYPES = [
  { value: 'advice', label: 'Ideas & advice', description: 'Thinking through the approach together' },
  { value: 'collaboration', label: 'Collaboration', description: 'Working on the problem as a team' },
  { value: 'review', label: 'Technical review', description: 'Checking an existing approach or result' },
  { value: 'research', label: 'Research help', description: 'Finding and reading the right material' },
  { value: 'build', label: 'Hands-on build', description: 'Building or testing something concrete' },
] as const

export type HelpType = (typeof HELP_TYPES)[number]['value']
export const HELP_TYPE_VALUES = HELP_TYPES.map((h) => h.value) as [HelpType, ...HelpType[]]

export function helpTypeLabel(value: string): string {
  return HELP_TYPES.find((h) => h.value === value)?.label ?? value
}

export const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]['value']
export const TASK_STATUS_VALUES = TASK_STATUSES.map((t) => t.value) as [TaskStatus, ...TaskStatus[]]

export const SKILL_KINDS = [
  { value: 'expertise', label: 'Skills I have', hint: 'Used to match you to problems' },
  { value: 'interest', label: 'Areas of interest', hint: 'Fields you follow' },
  { value: 'learning', label: 'Skills I want to learn', hint: 'Shown on your profile' },
  { value: 'help', label: 'Where I can help others', hint: 'What you can offer collaborators' },
] as const

export type SkillKind = (typeof SKILL_KINDS)[number]['value']

export const OUTCOME_STATUSES = [
  { value: 'solved', label: 'Solved' },
  { value: 'partially_solved', label: 'Partially Solved' },
  { value: 'unable_to_verify', label: 'Unable to Verify' },
] as const

export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number]['value']
export const OUTCOME_STATUS_VALUES = OUTCOME_STATUSES.map((o) => o.value) as [
  OutcomeStatus,
  ...OutcomeStatus[],
]

export const SUGGESTED_SKILLS = [
  'Python',
  'TypeScript',
  'React',
  'Machine Learning',
  'Computer Vision',
  'Robotics',
  'ROS',
  'Data Science',
  'Mathematics',
  'Embedded Systems',
  'UI/UX Design',
  'Product Design',
  'Technical Writing',
  'Research Methods',
  'Business Strategy',
  'Teaching',
  'Statistics',
  'Cloud Infrastructure',
]

export const MAX_TAGS = 6
export const MAX_SKILLS_PER_PROBLEM = 8
