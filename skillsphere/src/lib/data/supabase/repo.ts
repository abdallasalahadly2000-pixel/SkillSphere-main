import { createSupabaseServerClient } from '@/lib/supabase/server'
import type {
  ConnectionEntry,
  ConnectionState,
  Repository,
  SettingsInput,
  SolutionWriteInput,
} from '../repository'
import type {
  AiAnalysis,
  Comment,
  Contribution,
  Contributor,
  NewsItem,
  Problem,
  ProblemFilters,
  Profile,
  ProfileLite,
  Resource,
  SessionUser,
  Task,
} from '@/lib/types'
import type { ProblemStatus, TaskStatus } from '@/lib/constants'

type Row = Record<string, any>

const PROBLEM_FIELDS = `id, owner_id, title, description, category, help_type, status, tags, required_skills,
  ai_analysis, attachment_url, cover_url, is_demo, created_at, updated_at`

const PROFILE_FIELDS = `id, display_name, username, avatar_url, bio, profession, location, onboarding_complete,
  profile_visibility, show_email, notify_connections, notify_comments, notify_tasks, is_demo, created_at,
  user_skills(name, kind)`

function mapProfile(row: Row): Profile {
  return {
    id: row.id,
    display_name: row.display_name,
    username: row.username ?? null,
    avatar_url: row.avatar_url ?? null,
    bio: row.bio ?? null,
    profession: row.profession ?? null,
    location: row.location ?? null,
    onboarding_complete: Boolean(row.onboarding_complete),
    profile_visibility: row.profile_visibility === 'connections' ? 'connections' : 'public',
    show_email: Boolean(row.show_email),
    notify_connections: Boolean(row.notify_connections),
    notify_comments: Boolean(row.notify_comments),
    notify_tasks: Boolean(row.notify_tasks),
    is_demo: Boolean(row.is_demo),
    created_at: row.created_at,
    skills: (row.user_skills ?? []).map((skill: Row) => ({ name: skill.name, kind: skill.kind })),
  }
}

function lite(row: Row | null | undefined, fallbackId = ''): ProfileLite {
  return {
    id: row?.id ?? fallbackId,
    display_name: row?.display_name ?? 'Member',
    avatar_url: row?.avatar_url ?? null,
    profession: row?.profession ?? null,
    is_demo: Boolean(row?.is_demo),
  }
}

function mapProblem(row: Row): Problem {
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    description: row.description,
    category: row.category,
    help_type: row.help_type,
    status: row.status,
    tags: row.tags ?? [],
    required_skills: row.required_skills ?? [],
    ai_analysis: (row.ai_analysis as AiAnalysis | null) ?? null,
    attachment_url: row.attachment_url ?? null,
    cover_url: row.cover_url ?? null,
    is_demo: Boolean(row.is_demo),
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner: lite(row.owner, row.owner_id),
    comment_count: row.comments?.[0]?.count ?? 0,
    contributor_count: row.contributors?.[0]?.count ?? 0,
  }
}

function fail(message: string, error?: unknown) {
  if (error) console.error('[skillsphere]', message, error)
  return { ok: false as const, error: message }
}

function searchTerm(value: string): string {
  return value.replace(/[(),%*]/g, ' ').trim()
}

async function isWorkspaceMember(problemId: string, userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data: problem } = await supabase
    .from('problems')
    .select('owner_id')
    .eq('id', problemId)
    .maybeSingle()
  if (problem?.owner_id === userId) return true
  const { data: contributor } = await supabase
    .from('problem_contributors')
    .select('user_id')
    .eq('problem_id', problemId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(contributor)
}

async function connectionRows(userId: string, mode: 'accepted' | 'incoming' | 'outgoing') {
  const supabase = await createSupabaseServerClient()
  let query = supabase.from('connections').select('*')
  if (mode === 'accepted') {
    query = query
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  } else if (mode === 'incoming') {
    query = query.eq('addressee_id', userId).eq('status', 'pending')
  } else {
    query = query.eq('requester_id', userId).eq('status', 'pending')
  }
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error || !data) return []
  const otherIds = data.map((row: Row) => (row.requester_id === userId ? row.addressee_id : row.requester_id))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, profession, is_demo')
    .in('id', otherIds.length ? otherIds : ['00000000-0000-0000-0000-000000000000'])
  const byId = new Map<string, Row>((profiles ?? []).map((p: Row) => [p.id, p]))
  return data.map<ConnectionEntry>((row: Row) => {
    const otherId = row.requester_id === userId ? row.addressee_id : row.requester_id
    return {
      id: row.id,
      requester_id: row.requester_id,
      addressee_id: row.addressee_id,
      status: row.status,
      created_at: row.created_at,
      profile: lite(byId.get(otherId), otherId),
    }
  })
}

export const supabaseRepository: Repository = {
  mode: 'supabase',

  async getSessionUser(): Promise<SessionUser | null> {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      displayName: (data.user.user_metadata?.full_name as string) ?? data.user.email?.split('@')[0] ?? 'Member',
    }
  },

  async signUp(input) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.fullName } },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, data: { needsConfirmation: !data.session } }
  },

  async signIn(input) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  },

  async signOut() {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signOut()
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  },

  async getProfile(id) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', id).maybeSingle()
    if (error || !data) return null
    return mapProfile(data)
  },

  async listProfiles({ q, excludeId, limit = 24 }) {
    const supabase = await createSupabaseServerClient()
    let query = supabase.from('profiles').select(PROFILE_FIELDS)
    if (excludeId) query = query.neq('id', excludeId)
    if (q) {
      const term = searchTerm(q)
      if (term) query = query.or(`display_name.ilike.%${term}%,profession.ilike.%${term}%,bio.ilike.%${term}%`)
    }
    const { data, error } = await query.order('created_at', { ascending: true }).limit(limit)
    if (error || !data) return []
    return data.map(mapProfile)
  },

  async updateProfile(id, input) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: input.displayName.trim(),
        profession: input.profession?.trim() || null,
        location: input.location?.trim() || null,
        bio: input.bio?.trim() || null,
        avatar_url: input.avatarUrl?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) return fail('Could not save your profile.', error)
    return { ok: true }
  },

  async completeOnboarding(id, input) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: input.displayName.trim(),
        profession: input.profession?.trim() || null,
        location: input.location?.trim() || null,
        bio: input.bio?.trim() || null,
        avatar_url: input.avatarUrl?.trim() || null,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) return fail('Could not save your profile.', error)

    await supabase.from('user_skills').delete().eq('user_id', id)
    const rows: Array<{ user_id: string; name: string; kind: string }> = []
    for (const kind of ['expertise', 'interest', 'learning', 'help'] as const) {
      for (const name of input.skills[kind] ?? []) {
        if (name.trim()) rows.push({ user_id: id, name: name.trim(), kind })
      }
    }
    if (rows.length) {
      const { error: skillError } = await supabase.from('user_skills').insert(rows)
      if (skillError) return fail('Profile saved, but skills could not be updated.', skillError)
    }
    return { ok: true }
  },

  async updateSettings(id, input: SettingsInput) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        profile_visibility: input.profileVisibility,
        show_email: input.showEmail,
        notify_connections: input.notifyConnections,
        notify_comments: input.notifyComments,
        notify_tasks: input.notifyTasks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) return fail('Could not save your settings.', error)
    return { ok: true }
  },

  async listProblems(filters: ProblemFilters) {
    const supabase = await createSupabaseServerClient()
    let query = supabase
      .from('problems')
      .select(PROBLEM_FIELDS)
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 50)
    if (filters.q) {
      const term = searchTerm(filters.q)
      if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
    }
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.ownerId) query = query.eq('owner_id', filters.ownerId)
    if (filters.skill) query = query.contains('required_skills', [filters.skill])
    const { data, error } = await query
    if (error || !data) return []
    return data.map(mapProblem)
  },

  async getProblem(id) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.from('problems').select(PROBLEM_FIELDS).eq('id', id).maybeSingle()
    if (error || !data) return null
    return mapProblem(data)
  },

  async createProblem(ownerId, input) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('problems')
      .insert({
        owner_id: ownerId,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        help_type: input.helpType,
        tags: input.tags ?? [],
        required_skills: input.requiredSkills ?? [],
        ai_analysis: input.aiAnalysis ?? null,
        attachment_url: input.attachmentUrl?.trim() || null,
      })
      .select('id')
      .single()
    if (error || !data) return fail('Could not publish the problem.', error)
    return { ok: true, data: { id: data.id } }
  },

  async updateProblem(id, ownerId, input) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('problems')
      .update({
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        help_type: input.helpType,
        tags: input.tags ?? [],
        required_skills: input.requiredSkills ?? [],
        attachment_url: input.attachmentUrl?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('id')
    if (error) return fail('Could not update the problem.', error)
    if (!data?.length) return { ok: false, error: 'Only the problem owner can edit this problem.' }
    return { ok: true }
  },

  async deleteProblem(id, ownerId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.from('problems').delete().eq('id', id).eq('owner_id', ownerId).select('id')
    if (error) return fail('Could not delete the problem.', error)
    if (!data?.length) return { ok: false, error: 'Only the problem owner can delete this problem.' }
    return { ok: true }
  },

  async updateProblemStatus(id, ownerId, status: ProblemStatus) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('problems')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('id')
    if (error) return fail('Could not change the status.', error)
    if (!data?.length) return { ok: false, error: 'Only the problem owner can change the status.' }
    return { ok: true }
  },

  async listComments(problemId, viewerId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('comments')
      .select(
        `id, problem_id, author_id, body, created_at, updated_at,
         author:profiles!comments_author_id_fkey(id, display_name, avatar_url, profession, is_demo),
         comment_helpful(user_id)`,
      )
      .eq('problem_id', problemId)
      .order('created_at', { ascending: true })
    if (error || !data) return []
    return data.map<Comment>((row: Row) => {
      const helpful: Row[] = row.comment_helpful ?? []
      return {
        id: row.id,
        problem_id: row.problem_id,
        author_id: row.author_id,
        body: row.body,
        created_at: row.created_at,
        updated_at: row.updated_at,
        helpful_count: helpful.length,
        viewer_found_helpful: Boolean(viewerId && helpful.some((h) => h.user_id === viewerId)),
        author: lite(row.author, row.author_id),
      }
    })
  },

  async addComment(problemId, authorId, body) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('comments').insert({ problem_id: problemId, author_id: authorId, body: body.trim() })
    if (error) return fail('Could not post your comment.', error)
    return { ok: true }
  },

  async updateComment(commentId, authorId, body) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('comments')
      .update({ body: body.trim(), updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('author_id', authorId)
      .select('id')
    if (error) return fail('Could not update the comment.', error)
    if (!data?.length) return { ok: false, error: 'You can only edit your own comments.' }
    return { ok: true }
  },

  async deleteComment(commentId, authorId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', authorId)
      .select('id')
    if (error) return fail('Could not delete the comment.', error)
    if (!data?.length) return { ok: false, error: 'You can only delete your own comments.' }
    return { ok: true }
  },

  async toggleCommentHelpful(commentId, userId) {
    const supabase = await createSupabaseServerClient()
    const { data: existing } = await supabase
      .from('comment_helpful')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle()
    if (existing) {
      const { error } = await supabase
        .from('comment_helpful')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)
      if (error) return fail('Could not update the helpful mark.', error)
      return { ok: true, data: { helpful: false } }
    }
    const { error } = await supabase.from('comment_helpful').insert({ comment_id: commentId, user_id: userId })
    if (error) return fail('Could not update the helpful mark.', error)
    return { ok: true, data: { helpful: true } }
  },

  async listConnections(userId) {
    return connectionRows(userId, 'accepted')
  },

  async listIncomingRequests(userId) {
    return connectionRows(userId, 'incoming')
  },

  async listOutgoingRequests(userId) {
    return connectionRows(userId, 'outgoing')
  },

  async sendConnectionRequest(requesterId, addresseeId) {
    if (requesterId === addresseeId) return { ok: false, error: 'You cannot connect with yourself.' }
    const supabase = await createSupabaseServerClient()
    const { data: existing } = await supabase
      .from('connections')
      .select('id, requester_id, status')
      .or(
        `and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`,
      )
      .maybeSingle()
    if (existing) {
      if (existing.status === 'accepted') return { ok: false, error: 'You are already connected.' }
      if (existing.status === 'pending') {
        return {
          ok: false,
          error:
            existing.requester_id === requesterId
              ? 'Request already sent.'
              : 'They already sent you a request — accept it from Friends.',
        }
      }
      await supabase.from('connections').delete().eq('id', existing.id)
    }
    const { error } = await supabase
      .from('connections')
      .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
    if (error) return fail('Could not send the request.', error)
    return { ok: true }
  },

  async respondToRequest(connectionId, userId, accept) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('connections')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', connectionId)
      .eq('addressee_id', userId)
      .select('id')
    if (error) return fail('Could not answer the request.', error)
    if (!data?.length) return { ok: false, error: 'This request is not yours to answer.' }
    return { ok: true }
  },

  async removeConnection(connectionId, userId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .select('id')
    if (error) return fail('Could not remove the connection.', error)
    if (!data?.length) return { ok: false, error: 'You can only remove your own connections.' }
    return { ok: true }
  },

  async getConnectionState(a, b): Promise<ConnectionState> {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('connections')
      .select('id, requester_id, status')
      .or(
        `and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`,
      )
      .maybeSingle()
    if (!data) return { status: 'none' }
    if (data.status === 'accepted') return { status: 'accepted', id: data.id }
    if (data.status === 'pending') {
      return { status: data.requester_id === a ? 'pending_out' : 'pending_in', id: data.id }
    }
    return { status: 'none' }
  },

  async listTasks(problemId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('collaboration_tasks')
      .select(
        'id, problem_id, title, description, assignee_id, status, created_by, created_at, assignee:profiles!collaboration_tasks_assignee_id_fkey(id, display_name, avatar_url, profession, is_demo)',
      )
      .eq('problem_id', problemId)
      .order('created_at', { ascending: true })
    if (error || !data) return []
    return data.map<Task>((row: Row) => ({
      id: row.id,
      problem_id: row.problem_id,
      title: row.title,
      description: row.description ?? null,
      assignee_id: row.assignee_id ?? null,
      status: row.status as TaskStatus,
      created_by: row.created_by,
      created_at: row.created_at,
      assignee: row.assignee ? lite(row.assignee, row.assignee_id) : null,
    }))
  },

  async createTask(problemId, userId, input) {
    if (!(await isWorkspaceMember(problemId, userId))) {
      return { ok: false, error: 'Only the owner and contributors can add tasks.' }
    }
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('collaboration_tasks').insert({
      problem_id: problemId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      assignee_id: input.assigneeId || null,
      created_by: userId,
      status: 'todo',
    })
    if (error) return fail('Could not create the task.', error)
    return { ok: true }
  },

  async updateTaskStatus(taskId, userId, status) {
    const supabase = await createSupabaseServerClient()
    const { data: task } = await supabase
      .from('collaboration_tasks')
      .select('problem_id')
      .eq('id', taskId)
      .maybeSingle()
    if (!task) return { ok: false, error: 'Task not found.' }
    if (!(await isWorkspaceMember(task.problem_id, userId))) {
      return { ok: false, error: 'Only the owner and contributors can update tasks.' }
    }
    const { error } = await supabase.from('collaboration_tasks').update({ status }).eq('id', taskId)
    if (error) return fail('Could not update the task.', error)
    return { ok: true }
  },

  async deleteTask(taskId, userId) {
    const supabase = await createSupabaseServerClient()
    const { data: task } = await supabase
      .from('collaboration_tasks')
      .select('problem_id, created_by')
      .eq('id', taskId)
      .maybeSingle()
    if (!task) return { ok: false, error: 'Task not found.' }
    const { data: problem } = await supabase
      .from('problems')
      .select('owner_id')
      .eq('id', task.problem_id)
      .maybeSingle()
    if (problem?.owner_id !== userId && task.created_by !== userId) {
      return { ok: false, error: 'Only the problem owner or the task creator can delete a task.' }
    }
    const { error } = await supabase.from('collaboration_tasks').delete().eq('id', taskId)
    if (error) return fail('Could not delete the task.', error)
    return { ok: true }
  },

  async listResources(problemId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('shared_resources')
      .select(
        'id, problem_id, title, url, description, added_by, created_at, author:profiles!shared_resources_added_by_fkey(id, display_name, avatar_url, profession, is_demo)',
      )
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map<Resource>((row: Row) => ({
      id: row.id,
      problem_id: row.problem_id,
      title: row.title,
      url: row.url,
      description: row.description ?? null,
      added_by: row.added_by,
      created_at: row.created_at,
      author: row.author ? lite(row.author, row.added_by) : null,
    }))
  },

  async addResource(problemId, userId, input) {
    if (!(await isWorkspaceMember(problemId, userId))) {
      return { ok: false, error: 'Only the owner and contributors can share resources.' }
    }
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('shared_resources').insert({
      problem_id: problemId,
      title: input.title.trim(),
      url: input.url.trim(),
      description: input.description?.trim() || null,
      added_by: userId,
    })
    if (error) return fail('Could not share the resource.', error)
    return { ok: true }
  },

  async deleteResource(resourceId, userId) {
    const supabase = await createSupabaseServerClient()
    const { data: resource } = await supabase
      .from('shared_resources')
      .select('problem_id, added_by')
      .eq('id', resourceId)
      .maybeSingle()
    if (!resource) return { ok: false, error: 'Resource not found.' }
    const { data: problem } = await supabase
      .from('problems')
      .select('owner_id')
      .eq('id', resource.problem_id)
      .maybeSingle()
    if (problem?.owner_id !== userId && resource.added_by !== userId) {
      return { ok: false, error: 'Only the problem owner or the person who shared it can remove it.' }
    }
    const { error } = await supabase.from('shared_resources').delete().eq('id', resourceId)
    if (error) return fail('Could not remove the resource.', error)
    return { ok: true }
  },

  async listContributors(problemId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('problem_contributors')
      .select(
        'problem_id, user_id, role, created_at, profile:profiles!problem_contributors_user_id_fkey(id, display_name, avatar_url, profession, is_demo)',
      )
      .eq('problem_id', problemId)
      .order('created_at', { ascending: true })
    if (error || !data) return []
    return data.map<Contributor>((row: Row) => ({
      problem_id: row.problem_id,
      user_id: row.user_id,
      role: row.role ?? null,
      created_at: row.created_at,
      profile: lite(row.profile, row.user_id),
    }))
  },

  async addContributor(problemId, ownerId, userId, role) {
    const supabase = await createSupabaseServerClient()
    const { data: problem } = await supabase
      .from('problems')
      .select('owner_id')
      .eq('id', problemId)
      .maybeSingle()
    if (problem?.owner_id !== ownerId) return { ok: false, error: 'Only the problem owner can manage contributors.' }
    if (userId === ownerId) return { ok: false, error: 'You already own this problem.' }
    const { error } = await supabase
      .from('problem_contributors')
      .upsert({ problem_id: problemId, user_id: userId, role: role.trim() || 'Contributor' })
    if (error) return fail('Could not add the contributor.', error)
    return { ok: true }
  },

  async removeContributor(problemId, ownerId, userId) {
    const supabase = await createSupabaseServerClient()
    const { data: problem } = await supabase
      .from('problems')
      .select('owner_id')
      .eq('id', problemId)
      .maybeSingle()
    if (problem?.owner_id !== ownerId) return { ok: false, error: 'Only the problem owner can manage contributors.' }
    const { error } = await supabase
      .from('problem_contributors')
      .delete()
      .eq('problem_id', problemId)
      .eq('user_id', userId)
    if (error) return fail('Could not remove the contributor.', error)
    return { ok: true }
  },

  async getSolution(problemId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('solution_reports')
      .select(
        'id, problem_id, author_id, outcome_status, outcome_description, attempted, worked, evidence, created_at, contributions(id, user_id, problem_id, solution_id, summary, confirmed, created_at, profile:profiles!contributions_user_id_fkey(id, display_name, avatar_url, profession, is_demo))',
      )
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) return null
    return {
      id: data.id,
      problem_id: data.problem_id,
      author_id: data.author_id,
      outcome_status: data.outcome_status,
      outcome_description: data.outcome_description,
      attempted: data.attempted,
      worked: data.worked,
      evidence: data.evidence ?? null,
      created_at: data.created_at,
      contributions: (data.contributions ?? []).map((row: Row) => ({
        id: row.id,
        user_id: row.user_id,
        problem_id: row.problem_id,
        solution_id: row.solution_id,
        summary: row.summary,
        confirmed: Boolean(row.confirmed),
        created_at: row.created_at,
        profile: lite(row.profile, row.user_id),
      })),
    }
  },

  async reportSolution(problemId, ownerId, input: SolutionWriteInput) {
    const supabase = await createSupabaseServerClient()
    const { data: problem } = await supabase
      .from('problems')
      .select('owner_id, title')
      .eq('id', problemId)
      .maybeSingle()
    if (!problem) return { ok: false, error: 'Problem not found.' }
    if (problem.owner_id !== ownerId) return { ok: false, error: 'Only the problem owner can report an outcome.' }

    const { data: solution, error } = await supabase
      .from('solution_reports')
      .insert({
        problem_id: problemId,
        author_id: ownerId,
        outcome_status: input.outcomeStatus,
        outcome_description: input.outcomeDescription.trim(),
        attempted: input.attempted.trim(),
        worked: input.worked.trim(),
        evidence: input.evidence?.trim() || null,
      })
      .select('id')
      .single()
    if (error || !solution) return fail('Could not save the outcome.', error)

    await supabase
      .from('problems')
      .update({ status: input.outcomeStatus, updated_at: new Date().toISOString() })
      .eq('id', problemId)
      .eq('owner_id', ownerId)

    const { data: contributors } = await supabase
      .from('problem_contributors')
      .select('user_id')
      .eq('problem_id', problemId)
    const allowed = new Set((contributors ?? []).map((row: Row) => row.user_id))
    const rows = input.contributorIds
      .filter((id) => id !== ownerId && allowed.has(id))
      .map((id) => ({
        user_id: id,
        problem_id: problemId,
        solution_id: solution.id,
        summary: `Contributed to “${problem.title}” — confirmed by the problem owner.`,
        confirmed: true,
      }))
    if (rows.length) {
      const { error: contributionError } = await supabase.from('contributions').insert(rows)
      if (contributionError) return fail('Outcome saved, but contributions could not be recorded.', contributionError)
    }
    return { ok: true }
  },

  async listContributions(userId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('contributions')
      .select('id, user_id, problem_id, solution_id, summary, confirmed, created_at, problem:problems(id, title, status, category, tags)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map<Contribution>((row: Row) => ({
      id: row.id,
      user_id: row.user_id,
      problem_id: row.problem_id,
      solution_id: row.solution_id ?? null,
      summary: row.summary,
      confirmed: Boolean(row.confirmed),
      created_at: row.created_at,
      problem: row.problem ?? null,
    }))
  },

  async listNews(limit = 12) {
    const supabase = await createSupabaseServerClient()
    const [problems, solutions, announcements] = await Promise.all([
      supabase
        .from('problems')
        .select('id, title, category, created_at, owner:profiles!problems_owner_id_fkey(id, display_name, avatar_url, profession, is_demo)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('solution_reports')
        .select(
          'id, problem_id, outcome_description, created_at, problem:problems(title), author:profiles!solution_reports_author_id_fkey(id, display_name, avatar_url, profession, is_demo)',
        )
        .order('created_at', { ascending: false })
        .limit(4),
      supabase.from('announcements').select('id, title, body, created_at').order('created_at', { ascending: false }).limit(4),
    ])

    const items: NewsItem[] = []
    for (const row of problems.data ?? []) {
      items.push({
        id: `problem-${row.id}`,
        kind: 'problem',
        title: `New problem: ${row.title}`,
        body: `Published in ${row.category} and open for contributors.`,
        href: `/problems/${row.id}`,
        created_at: row.created_at,
        actor: lite(row.owner),
      })
    }
    for (const row of solutions.data ?? []) {
      const related = Array.isArray(row.problem) ? row.problem[0] : row.problem
      items.push({
        id: `solution-${row.id}`,
        kind: 'solution',
        title: `Outcome reported: ${related?.title ?? 'a problem'}`,
        body: String(row.outcome_description).slice(0, 220),
        href: `/problems/${row.problem_id}`,
        created_at: row.created_at,
        actor: lite(row.author),
      })
    }
    for (const row of announcements.data ?? []) {
      items.push({
        id: `announcement-${row.id}`,
        kind: 'announcement',
        title: row.title,
        body: row.body,
        href: '/news',
        created_at: row.created_at,
      })
    }
    return items
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  },

  async getStats() {
    const supabase = await createSupabaseServerClient()
    const [open, members, solved, contributions] = await Promise.all([
      supabase.from('problems').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('problems').select('id', { count: 'exact', head: true }).eq('status', 'solved'),
      supabase.from('contributions').select('id', { count: 'exact', head: true }).eq('confirmed', true),
    ])
    return {
      openProblems: open.count ?? 0,
      members: members.count ?? 0,
      solved: solved.count ?? 0,
      contributions: contributions.count ?? 0,
    }
  },

  async listPopularSkills(limit = 12) {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('user_skills')
      .select('name')
      .in('kind', ['expertise', 'interest'])
      .limit(500)
    const counts = new Map<string, number>()
    for (const row of data ?? []) counts.set(row.name, (counts.get(row.name) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([name]) => name)
  },

  async canManageWorkspace(problemId, userId) {
    return isWorkspaceMember(problemId, userId)
  },
}
