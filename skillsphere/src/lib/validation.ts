import { z } from 'zod'
import {
  CATEGORY_VALUES,
  HELP_TYPE_VALUES,
  MAX_SKILLS_PER_PROBLEM,
  MAX_TAGS,
  OUTCOME_STATUS_VALUES,
  PROBLEM_STATUS_VALUES,
  TASK_STATUS_VALUES,
} from './constants'

const cleanList = (values: string[]) =>
  Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)))

export const signInSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Tell us your name').max(80),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name is required').max(60),
  profession: z.string().trim().max(80).optional().or(z.literal('')),
  location: z.string().trim().max(80).optional().or(z.literal('')),
  bio: z.string().trim().max(500, 'Keep your bio under 500 characters').optional().or(z.literal('')),
  avatarUrl: z.string().trim().max(400_000).optional().or(z.literal('')),
})

export const skillsSchema = z.object({
  expertise: z.array(z.string().trim().max(40)).max(20).default([]),
  interest: z.array(z.string().trim().max(40)).max(20).default([]),
  learning: z.array(z.string().trim().max(40)).max(20).default([]),
  help: z.array(z.string().trim().max(40)).max(20).default([]),
})

export const onboardingSchema = profileSchema.extend({
  skills: skillsSchema,
})

export const problemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(8, 'Give the problem a clear title (8+ characters)')
    .max(160, 'Keep the title under 160 characters'),
  description: z
    .string()
    .trim()
    .min(30, 'Describe the problem in at least 30 characters')
    .max(8000, 'Keep the description under 8000 characters'),
  category: z.enum(CATEGORY_VALUES),
  helpType: z.enum(HELP_TYPE_VALUES),
  tags: z.array(z.string().trim().min(1).max(30)).max(MAX_TAGS).default([]),
  requiredSkills: z
    .array(z.string().trim().min(1).max(40))
    .max(MAX_SKILLS_PER_PROBLEM)
    .default([]),
  attachmentUrl: z.string().trim().max(400_000).optional().or(z.literal('')),
})

// The create/edit form keeps tags and skills in separate chip editors, so the
// form schema validates only the fields bound to inputs.
export const problemFormSchema = problemSchema.omit({ tags: true, requiredSkills: true })

export const commentSchema = z.object({
  problemId: z.string().min(1),
  body: z.string().trim().min(2, 'Write a comment first').max(4000, 'Keep comments under 4000 characters'),
})

export const taskSchema = z.object({
  problemId: z.string().min(1),
  title: z.string().trim().min(3, 'Task title is required').max(120),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  assigneeId: z.string().uuid().optional().or(z.literal('')),
})

export const taskUpdateSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(TASK_STATUS_VALUES),
})

export const resourceSchema = z.object({
  problemId: z.string().min(1),
  title: z.string().trim().min(3, 'Add a short title').max(120),
  url: z.url('Enter a valid link, including https://'),
  description: z.string().trim().max(300).optional().or(z.literal('')),
})

export const solutionSchema = z.object({
  problemId: z.string().min(1),
  outcomeStatus: z.enum(OUTCOME_STATUS_VALUES),
  outcomeDescription: z
    .string()
    .trim()
    .min(20, 'Describe the outcome in at least 20 characters')
    .max(4000),
  attempted: z.string().trim().min(10, 'Describe what was attempted').max(4000),
  worked: z.string().trim().min(10, 'Describe what worked').max(4000),
  evidence: z.string().trim().max(2000).optional().or(z.literal('')),
  contributorIds: z.array(z.string().uuid()).max(20).default([]),
})

export const settingsSchema = z.object({
  profileVisibility: z.enum(['public', 'connections']),
  showEmail: z.boolean(),
  notifyConnections: z.boolean(),
  notifyComments: z.boolean(),
  notifyTasks: z.boolean(),
})

export const statusSchema = z.object({
  problemId: z.string().min(1),
  status: z.enum(PROBLEM_STATUS_VALUES),
})

export { cleanList }

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
export type ProblemInput = z.infer<typeof problemSchema>
export type ProblemFormInput = z.infer<typeof problemFormSchema>
export type SolutionInput = z.infer<typeof solutionSchema>
