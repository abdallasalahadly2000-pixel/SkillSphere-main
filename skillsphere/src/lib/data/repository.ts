import type {
  Comment,
  Connection,
  Contribution,
  NewsItem,
  Problem,
  ProblemFilters,
  Profile,
  ProfileLite,
  Resource,
  SessionUser,
  SolutionReport,
  Task,
  Contributor,
  ActionResult,
  AiAnalysis,
} from '@/lib/types'
import type { OnboardingInput, ProblemInput, ProfileInput } from '@/lib/validation'
import type { ProblemStatus, TaskStatus } from '@/lib/constants'

export type SettingsInput = {
  profileVisibility: 'public' | 'connections'
  showEmail: boolean
  notifyConnections: boolean
  notifyComments: boolean
  notifyTasks: boolean
}

export type ProblemWriteInput = ProblemInput & { aiAnalysis?: AiAnalysis | null }

export type SolutionWriteInput = {
  outcomeStatus: 'solved' | 'partially_solved' | 'unable_to_verify'
  outcomeDescription: string
  attempted: string
  worked: string
  evidence?: string
  contributorIds: string[]
}

export type ConnectionEntry = Connection & { profile: ProfileLite }

export type ConnectionState = {
  status: 'none' | 'pending_out' | 'pending_in' | 'accepted'
  id?: string
}

export type WorkspaceTask = Task
export type Stats = {
  openProblems: number
  members: number
  solved: number
  contributions: number
}

/**
 * One interface, two backends: Supabase (production, RLS enforced) and the
 * local SQLite demo. The UI never talks to either directly.
 */
export type Repository = {
  mode: 'supabase' | 'demo'

  getSessionUser(): Promise<SessionUser | null>
  signUp(input: { fullName: string; email: string; password: string }): Promise<
    ActionResult<{ needsConfirmation: boolean }>
  >
  signIn(input: { email: string; password: string }): Promise<ActionResult>
  signOut(): Promise<ActionResult>

  getProfile(id: string): Promise<Profile | null>
  listProfiles(opts: { q?: string; excludeId?: string; limit?: number }): Promise<Profile[]>
  updateProfile(id: string, input: ProfileInput): Promise<ActionResult>
  completeOnboarding(id: string, input: OnboardingInput): Promise<ActionResult>
  updateSettings(id: string, input: SettingsInput): Promise<ActionResult>

  listProblems(filters: ProblemFilters): Promise<Problem[]>
  getProblem(id: string): Promise<Problem | null>
  createProblem(ownerId: string, input: ProblemWriteInput): Promise<ActionResult<{ id: string }>>
  updateProblem(id: string, ownerId: string, input: ProblemWriteInput): Promise<ActionResult>
  deleteProblem(id: string, ownerId: string): Promise<ActionResult>
  updateProblemStatus(id: string, ownerId: string, status: ProblemStatus): Promise<ActionResult>

  listComments(problemId: string, viewerId?: string | null): Promise<Comment[]>
  addComment(problemId: string, authorId: string, body: string): Promise<ActionResult>
  updateComment(commentId: string, authorId: string, body: string): Promise<ActionResult>
  deleteComment(commentId: string, authorId: string): Promise<ActionResult>
  toggleCommentHelpful(commentId: string, userId: string): Promise<ActionResult<{ helpful: boolean }>>

  listConnections(userId: string): Promise<ConnectionEntry[]>
  listIncomingRequests(userId: string): Promise<ConnectionEntry[]>
  listOutgoingRequests(userId: string): Promise<ConnectionEntry[]>
  sendConnectionRequest(requesterId: string, addresseeId: string): Promise<ActionResult>
  respondToRequest(connectionId: string, userId: string, accept: boolean): Promise<ActionResult>
  removeConnection(connectionId: string, userId: string): Promise<ActionResult>
  getConnectionState(a: string, b: string): Promise<ConnectionState>

  listTasks(problemId: string): Promise<Task[]>
  createTask(
    problemId: string,
    userId: string,
    input: { title: string; description?: string; assigneeId?: string },
  ): Promise<ActionResult>
  updateTaskStatus(taskId: string, userId: string, status: TaskStatus): Promise<ActionResult>
  deleteTask(taskId: string, userId: string): Promise<ActionResult>

  listResources(problemId: string): Promise<Resource[]>
  addResource(
    problemId: string,
    userId: string,
    input: { title: string; url: string; description?: string },
  ): Promise<ActionResult>
  deleteResource(resourceId: string, userId: string): Promise<ActionResult>

  listContributors(problemId: string): Promise<Contributor[]>
  addContributor(problemId: string, ownerId: string, userId: string, role: string): Promise<ActionResult>
  removeContributor(problemId: string, ownerId: string, userId: string): Promise<ActionResult>

  getSolution(problemId: string): Promise<
    (SolutionReport & { contributions: Array<Contribution & { profile: ProfileLite }> }) | null
  >
  reportSolution(problemId: string, ownerId: string, input: SolutionWriteInput): Promise<ActionResult>

  listContributions(userId: string): Promise<Contribution[]>
  listNews(limit?: number): Promise<NewsItem[]>
  getStats(): Promise<Stats>
  listPopularSkills(limit?: number): Promise<string[]>
  canManageWorkspace(problemId: string, userId: string): Promise<boolean>
}
