import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { getDb, hashPassword, verifyPassword } from './db'
import type {
  ConnectionEntry,
  ConnectionState,
  Repository,
  SettingsInput,
  SolutionWriteInput,
} from '../repository'
import type {
  ActionResult,
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
  SolutionReport,
  Task,
} from '@/lib/types'
import type { OnboardingInput, ProblemInput, ProfileInput } from '@/lib/validation'
import type { ProblemStatus, TaskStatus } from '@/lib/constants'

const SESSION_COOKIE = 'ss_demo_session'
const SESSION_DAYS = 30

type Row = Record<string, any>

const PROBLEM_SELECT = `
  SELECT p.*,
    pr.display_name AS owner_name, pr.avatar_url AS owner_avatar,
    pr.profession AS owner_profession, pr.is_demo AS owner_is_demo,
    (SELECT COUNT(*) FROM comments c WHERE c.problem_id = p.id) AS comment_count,
    (SELECT COUNT(*) FROM contributors ct WHERE ct.problem_id = p.id) AS contributor_count
  FROM problems p
  JOIN profiles pr ON pr.id = p.owner_id`

function parseStringArray(value: unknown): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function parseAnalysis(value: unknown): AiAnalysis | null {
  if (typeof value !== 'string' || !value) return null
  try {
    return JSON.parse(value) as AiAnalysis
  } catch {
    return null
  }
}

function profileLite(row: Row, prefix = ''): ProfileLite {
  return {
    id: prefix ? String(row[`${prefix}_id`] ?? row[`${prefix}id`]) : String(row.id),
    display_name: String(row[`${prefix}display_name`] ?? row.display_name ?? 'Member'),
    avatar_url: (row[`${prefix}avatar_url`] ?? row.avatar_url ?? null) as string | null,
    profession: (row[`${prefix}profession`] ?? row.profession ?? null) as string | null,
    is_demo: Boolean(row[`${prefix}is_demo`] ?? row.is_demo ?? false),
  }
}

function rowToProblem(row: Row): Problem {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    title: String(row.title),
    description: String(row.description),
    category: row.category,
    help_type: row.help_type,
    status: row.status,
    tags: parseStringArray(row.tags),
    required_skills: parseStringArray(row.required_skills),
    ai_analysis: parseAnalysis(row.ai_analysis),
    attachment_url: (row.attachment_url as string | null) ?? null,
    cover_url: (row.cover_url as string | null) ?? null,
    is_demo: Boolean(row.is_demo),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    owner: {
      id: String(row.owner_id),
      display_name: String(row.owner_name ?? 'Member'),
      avatar_url: (row.owner_avatar as string | null) ?? null,
      profession: (row.owner_profession as string | null) ?? null,
      is_demo: Boolean(row.owner_is_demo),
    },
    comment_count: Number(row.comment_count ?? 0),
    contributor_count: Number(row.contributor_count ?? 0),
  }
}

function getSkills(userId: string) {
  const rows = getDb()
    .prepare('SELECT name, kind FROM user_skills WHERE user_id = ? ORDER BY name')
    .all(userId) as Row[]
  return rows.map((row) => ({ name: String(row.name), kind: row.kind as Profile['skills'][number]['kind'] }))
}

function rowToProfile(row: Row): Profile {
  return {
    id: String(row.id),
    display_name: String(row.display_name),
    username: (row.username as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    profession: (row.profession as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    onboarding_complete: Boolean(row.onboarding_complete),
    profile_visibility: row.profile_visibility === 'connections' ? 'connections' : 'public',
    show_email: Boolean(row.show_email),
    notify_connections: Boolean(row.notify_connections),
    notify_comments: Boolean(row.notify_comments),
    notify_tasks: Boolean(row.notify_tasks),
    is_demo: Boolean(row.is_demo),
    created_at: String(row.created_at),
    skills: getSkills(String(row.id)),
  }
}

function isOwner(problemId: string, userId: string): boolean {
  const row = getDb().prepare('SELECT owner_id FROM problems WHERE id = ?').get(problemId) as Row | undefined
  return Boolean(row && row.owner_id === userId)
}

function isContributor(problemId: string, userId: string): boolean {
  const row = getDb()
    .prepare('SELECT 1 AS ok FROM contributors WHERE problem_id = ? AND user_id = ?')
    .get(problemId, userId) as Row | undefined
  return Boolean(row)
}

function canManage(problemId: string, userId: string): boolean {
  return isOwner(problemId, userId) || isContributor(problemId, userId)
}

async function createSession(userId: string) {
  const token = `${randomUUID()}${randomUUID()}`.replace(/-/g, '')
  getDb()
    .prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)')
    .run(token, userId, new Date().toISOString())
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
    secure: process.env.NODE_ENV === 'production',
  })
}

function replaceSkills(userId: string, skills: OnboardingInput['skills']) {
  const db = getDb()
  db.prepare('DELETE FROM user_skills WHERE user_id = ?').run(userId)
  const insert = db.prepare('INSERT OR IGNORE INTO user_skills (user_id, name, kind) VALUES (?, ?, ?)')
  for (const kind of ['expertise', 'interest', 'learning', 'help'] as const) {
    for (const raw of skills[kind] ?? []) {
      const name = raw.trim()
      if (name) insert.run(userId, name, kind)
    }
  }
}

export const demoRepository: Repository = {
  mode: 'demo',

  async getSessionUser(): Promise<SessionUser | null> {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (!token) return null
    const row = getDb()
      .prepare(
        `SELECT u.id, u.email, p.display_name
         FROM sessions s JOIN users u ON u.id = s.user_id
         JOIN profiles p ON p.id = u.id
         WHERE s.token = ?`,
      )
      .get(token) as Row | undefined
    if (!row) return null
    return { id: String(row.id), email: String(row.email), displayName: String(row.display_name) }
  },

  async signUp(input) {
    const db = getDb()
    const email = input.email.trim().toLowerCase()
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      return { ok: false, error: 'An account with this email already exists. Try signing in.' }
    }
    const id = randomUUID()
    const now = new Date().toISOString()
    try {
      db.exec('BEGIN')
      db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
        id,
        email,
        hashPassword(input.password),
        now,
      )
      db.prepare(
        'INSERT INTO profiles (id, display_name, onboarding_complete, is_demo, created_at) VALUES (?, ?, 0, 0, ?)',
      ).run(id, input.fullName.trim(), now)
      db.exec('COMMIT')
    } catch {
      db.exec('ROLLBACK')
      return { ok: false, error: 'Could not create the account. Please try again.' }
    }
    await createSession(id)
    return { ok: true, data: { needsConfirmation: false } }
  },

  async signIn(input) {
    const row = getDb()
      .prepare('SELECT id, password_hash FROM users WHERE email = ?')
      .get(input.email.trim().toLowerCase()) as Row | undefined
    if (!row || !verifyPassword(input.password, String(row.password_hash))) {
      return { ok: false, error: 'Email or password is incorrect.' }
    }
    await createSession(String(row.id))
    return { ok: true }
  },

  async signOut() {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (token) getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token)
    store.delete(SESSION_COOKIE)
    return { ok: true }
  },

  async getProfile(id) {
    const row = getDb().prepare('SELECT * FROM profiles WHERE id = ?').get(id) as Row | undefined
    return row ? rowToProfile(row) : null
  },

  async listProfiles({ q, excludeId, limit = 24 }) {
    const db = getDb()
    const params: Array<string | number | null> = []
    let sql = 'SELECT * FROM profiles'
    const where: string[] = []
    if (excludeId) {
      where.push('id != ?')
      params.push(excludeId)
    }
    if (q) {
      where.push('(display_name LIKE ? OR profession LIKE ? OR bio LIKE ?)')
      params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`
    sql += ' ORDER BY created_at ASC LIMIT ?'
    params.push(limit)
    return (db.prepare(sql).all(...params) as Row[]).map(rowToProfile)
  },

  async updateProfile(id, input: ProfileInput) {
    getDb()
      .prepare(
        'UPDATE profiles SET display_name = ?, profession = ?, location = ?, bio = ?, avatar_url = ? WHERE id = ?',
      )
      .run(
        input.displayName.trim(),
        input.profession?.trim() || null,
        input.location?.trim() || null,
        input.bio?.trim() || null,
        input.avatarUrl?.trim() || null,
        id,
      )
    return { ok: true }
  },

  async completeOnboarding(id, input: OnboardingInput) {
    const result = await this.updateProfile(id, input)
    if (!result.ok) return result
    replaceSkills(id, input.skills)
    getDb().prepare('UPDATE profiles SET onboarding_complete = 1 WHERE id = ?').run(id)
    return { ok: true }
  },

  async updateSettings(id, input: SettingsInput) {
    getDb()
      .prepare(
        `UPDATE profiles SET profile_visibility = ?, show_email = ?, notify_connections = ?,
         notify_comments = ?, notify_tasks = ? WHERE id = ?`,
      )
      .run(
        input.profileVisibility,
        input.showEmail ? 1 : 0,
        input.notifyConnections ? 1 : 0,
        input.notifyComments ? 1 : 0,
        input.notifyTasks ? 1 : 0,
        id,
      )
    return { ok: true }
  },

  async listProblems(filters: ProblemFilters) {
    const db = getDb()
    const where: string[] = []
    const params: Array<string | number | null> = []
    if (filters.q) {
      where.push('(p.title LIKE ? OR p.description LIKE ?)')
      params.push(`%${filters.q}%`, `%${filters.q}%`)
    }
    if (filters.category) {
      where.push('p.category = ?')
      params.push(filters.category)
    }
    if (filters.status) {
      where.push('p.status = ?')
      params.push(filters.status)
    }
    if (filters.ownerId) {
      where.push('p.owner_id = ?')
      params.push(filters.ownerId)
    }
    if (filters.skill) {
      where.push('LOWER(p.required_skills) LIKE ?')
      params.push(`%${JSON.stringify(filters.skill.toLowerCase())}%`)
    }
    let sql = PROBLEM_SELECT
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`
    sql += ' ORDER BY p.created_at DESC LIMIT ?'
    params.push(filters.limit ?? 50)
    return (db.prepare(sql).all(...params) as Row[]).map(rowToProblem)
  },

  async getProblem(id) {
    const row = getDb().prepare(`${PROBLEM_SELECT} WHERE p.id = ?`).get(id) as Row | undefined
    return row ? rowToProblem(row) : null
  },

  async createProblem(ownerId, input: ProblemInput & { aiAnalysis?: AiAnalysis | null }) {
    const id = randomUUID()
    const now = new Date().toISOString()
    getDb()
      .prepare(
        `INSERT INTO problems (id, owner_id, title, description, category, help_type, status, required_skills, tags, ai_analysis, attachment_url, is_demo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(
        id,
        ownerId,
        input.title.trim(),
        input.description.trim(),
        input.category,
        input.helpType,
        JSON.stringify(input.requiredSkills ?? []),
        JSON.stringify(input.tags ?? []),
        input.aiAnalysis ? JSON.stringify(input.aiAnalysis) : null,
        input.attachmentUrl?.trim() || null,
        now,
        now,
      )
    return { ok: true, data: { id } }
  },

  async updateProblem(id, ownerId, input) {
    if (!isOwner(id, ownerId)) return { ok: false, error: 'Only the problem owner can edit this problem.' }
    getDb()
      .prepare(
        `UPDATE problems SET title = ?, description = ?, category = ?, help_type = ?, required_skills = ?,
         tags = ?, attachment_url = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        input.title.trim(),
        input.description.trim(),
        input.category,
        input.helpType,
        JSON.stringify(input.requiredSkills ?? []),
        JSON.stringify(input.tags ?? []),
        input.attachmentUrl?.trim() || null,
        new Date().toISOString(),
        id,
      )
    return { ok: true }
  },

  async deleteProblem(id, ownerId) {
    if (!isOwner(id, ownerId)) return { ok: false, error: 'Only the problem owner can delete this problem.' }
    getDb().prepare('DELETE FROM problems WHERE id = ?').run(id)
    return { ok: true }
  },

  async updateProblemStatus(id, ownerId, status: ProblemStatus) {
    if (!isOwner(id, ownerId)) return { ok: false, error: 'Only the problem owner can change the status.' }
    getDb()
      .prepare('UPDATE problems SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id)
    return { ok: true }
  },

  async listComments(problemId, viewerId) {
    const rows = getDb()
      .prepare(
        `SELECT c.*, p.display_name, p.avatar_url, p.profession, p.is_demo,
          (SELECT COUNT(*) FROM comment_helpful h WHERE h.comment_id = c.id) AS helpful_count,
          EXISTS(SELECT 1 FROM comment_helpful h WHERE h.comment_id = c.id AND h.user_id = ?) AS viewer_helpful
         FROM comments c JOIN profiles p ON p.id = c.author_id
         WHERE c.problem_id = ? ORDER BY c.created_at ASC`,
      )
      .all(viewerId ?? '', problemId) as Row[]
    return rows.map<Comment>((row) => ({
      id: String(row.id),
      problem_id: String(row.problem_id),
      author_id: String(row.author_id),
      body: String(row.body),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      helpful_count: Number(row.helpful_count ?? 0),
      viewer_found_helpful: Boolean(row.viewer_helpful),
      author: profileLite(row),
    }))
  },

  async addComment(problemId, authorId, body) {
    if (!getDb().prepare('SELECT 1 FROM problems WHERE id = ?').get(problemId)) {
      return { ok: false, error: 'That problem no longer exists.' }
    }
    const now = new Date().toISOString()
    getDb()
      .prepare(
        'INSERT INTO comments (id, problem_id, author_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(randomUUID(), problemId, authorId, body.trim(), now, now)
    return { ok: true }
  },

  async updateComment(commentId, authorId, body) {
    const result = getDb()
      .prepare('UPDATE comments SET body = ?, updated_at = ? WHERE id = ? AND author_id = ?')
      .run(body.trim(), new Date().toISOString(), commentId, authorId)
    if (!result.changes) return { ok: false, error: 'You can only edit your own comments.' }
    return { ok: true }
  },

  async deleteComment(commentId, authorId) {
    const result = getDb()
      .prepare('DELETE FROM comments WHERE id = ? AND author_id = ?')
      .run(commentId, authorId)
    if (!result.changes) return { ok: false, error: 'You can only delete your own comments.' }
    return { ok: true }
  },

  async toggleCommentHelpful(commentId, userId) {
    const db = getDb()
    const existing = db
      .prepare('SELECT 1 FROM comment_helpful WHERE comment_id = ? AND user_id = ?')
      .get(commentId, userId)
    if (existing) {
      db.prepare('DELETE FROM comment_helpful WHERE comment_id = ? AND user_id = ?').run(commentId, userId)
      return { ok: true, data: { helpful: false } }
    }
    db.prepare('INSERT INTO comment_helpful (comment_id, user_id) VALUES (?, ?)').run(commentId, userId)
    return { ok: true, data: { helpful: true } }
  },

  async listConnections(userId) {
    const rows = getDb()
      .prepare(
        `SELECT c.*, p.id AS other_id, p.display_name, p.avatar_url, p.profession, p.is_demo
         FROM connections c
         JOIN profiles p ON p.id = CASE WHEN c.requester_id = ? THEN c.addressee_id ELSE c.requester_id END
         WHERE c.status = 'accepted' AND (c.requester_id = ? OR c.addressee_id = ?)
         ORDER BY p.display_name ASC`,
      )
      .all(userId, userId, userId) as Row[]
    return rows.map<ConnectionEntry>((row) => ({
      id: String(row.id),
      requester_id: String(row.requester_id),
      addressee_id: String(row.addressee_id),
      status: row.status,
      created_at: String(row.created_at),
      profile: profileLite(row, 'other_'),
    }))
  },

  async listIncomingRequests(userId) {
    const rows = getDb()
      .prepare(
        `SELECT c.*, p.id AS other_id, p.display_name, p.avatar_url, p.profession, p.is_demo
         FROM connections c JOIN profiles p ON p.id = c.requester_id
         WHERE c.addressee_id = ? AND c.status = 'pending' ORDER BY c.created_at DESC`,
      )
      .all(userId) as Row[]
    return rows.map<ConnectionEntry>((row) => ({
      id: String(row.id),
      requester_id: String(row.requester_id),
      addressee_id: String(row.addressee_id),
      status: row.status,
      created_at: String(row.created_at),
      profile: profileLite(row, 'other_'),
    }))
  },

  async listOutgoingRequests(userId) {
    const rows = getDb()
      .prepare(
        `SELECT c.*, p.id AS other_id, p.display_name, p.avatar_url, p.profession, p.is_demo
         FROM connections c JOIN profiles p ON p.id = c.addressee_id
         WHERE c.requester_id = ? AND c.status = 'pending' ORDER BY c.created_at DESC`,
      )
      .all(userId) as Row[]
    return rows.map<ConnectionEntry>((row) => ({
      id: String(row.id),
      requester_id: String(row.requester_id),
      addressee_id: String(row.addressee_id),
      status: row.status,
      created_at: String(row.created_at),
      profile: profileLite(row, 'other_'),
    }))
  },

  async sendConnectionRequest(requesterId, addresseeId) {
    if (requesterId === addresseeId) return { ok: false, error: 'You cannot connect with yourself.' }
    const db = getDb()
    const existing = db
      .prepare(
        'SELECT * FROM connections WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
      )
      .get(requesterId, addresseeId, addresseeId, requesterId) as Row | undefined
    if (existing) {
      if (existing.status === 'accepted') return { ok: false, error: 'You are already connected.' }
      if (existing.status === 'pending') {
        if (existing.requester_id === requesterId) return { ok: false, error: 'Request already sent.' }
        return { ok: false, error: 'They already sent you a request — accept it from Friends.' }
      }
      db.prepare('DELETE FROM connections WHERE id = ?').run(existing.id)
    }
    db.prepare('INSERT INTO connections (id, requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, ?, ?)').run(
      randomUUID(),
      requesterId,
      addresseeId,
      'pending',
      new Date().toISOString(),
    )
    return { ok: true }
  },

  async respondToRequest(connectionId, userId, accept) {
    const row = getDb()
      .prepare('SELECT * FROM connections WHERE id = ?')
      .get(connectionId) as Row | undefined
    if (!row || row.addressee_id !== userId) {
      return { ok: false, error: 'This request is not yours to answer.' }
    }
    getDb()
      .prepare('UPDATE connections SET status = ? WHERE id = ?')
      .run(accept ? 'accepted' : 'declined', connectionId)
    return { ok: true }
  },

  async removeConnection(connectionId, userId) {
    const row = getDb()
      .prepare('SELECT * FROM connections WHERE id = ?')
      .get(connectionId) as Row | undefined
    if (!row || (row.requester_id !== userId && row.addressee_id !== userId)) {
      return { ok: false, error: 'You can only remove your own connections.' }
    }
    getDb().prepare('DELETE FROM connections WHERE id = ?').run(connectionId)
    return { ok: true }
  },

  async getConnectionState(a, b): Promise<ConnectionState> {
    const row = getDb()
      .prepare(
        'SELECT * FROM connections WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
      )
      .get(a, b, b, a) as Row | undefined
    if (!row) return { status: 'none' }
    if (row.status === 'accepted') return { status: 'accepted', id: String(row.id) }
    if (row.status === 'pending') {
      return { status: row.requester_id === a ? 'pending_out' : 'pending_in', id: String(row.id) }
    }
    return { status: 'none' }
  },

  async listTasks(problemId) {
    const rows = getDb()
      .prepare(
        `SELECT t.*, p.display_name AS assignee_name, p.avatar_url AS assignee_avatar,
          p.profession AS assignee_profession, p.is_demo AS assignee_demo
         FROM tasks t LEFT JOIN profiles p ON p.id = t.assignee_id
         WHERE t.problem_id = ? ORDER BY t.created_at ASC`,
      )
      .all(problemId) as Row[]
    return rows.map<Task>((row) => ({
      id: String(row.id),
      problem_id: String(row.problem_id),
      title: String(row.title),
      description: (row.description as string | null) ?? null,
      assignee_id: (row.assignee_id as string | null) ?? null,
      status: row.status as TaskStatus,
      created_by: String(row.created_by),
      created_at: String(row.created_at),
      assignee: row.assignee_id
        ? {
            id: String(row.assignee_id),
            display_name: String(row.assignee_name ?? 'Member'),
            avatar_url: (row.assignee_avatar as string | null) ?? null,
            profession: (row.assignee_profession as string | null) ?? null,
            is_demo: Boolean(row.assignee_demo),
          }
        : null,
    }))
  },

  async createTask(problemId, userId, input) {
    if (!canManage(problemId, userId)) {
      return { ok: false, error: 'Only the owner and contributors can add tasks.' }
    }
    const assigneeId = input.assigneeId && input.assigneeId !== '' ? input.assigneeId : null
    getDb()
      .prepare(
        'INSERT INTO tasks (id, problem_id, title, description, assignee_id, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        randomUUID(),
        problemId,
        input.title.trim(),
        input.description?.trim() || null,
        assigneeId,
        'todo',
        userId,
        new Date().toISOString(),
      )
    return { ok: true }
  },

  async updateTaskStatus(taskId, userId, status) {
    const task = getDb().prepare('SELECT problem_id FROM tasks WHERE id = ?').get(taskId) as Row | undefined
    if (!task) return { ok: false, error: 'Task not found.' }
    if (!canManage(String(task.problem_id), userId)) {
      return { ok: false, error: 'Only the owner and contributors can update tasks.' }
    }
    getDb().prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, taskId)
    return { ok: true }
  },

  async deleteTask(taskId, userId) {
    const task = getDb().prepare('SELECT problem_id, created_by FROM tasks WHERE id = ?').get(taskId) as
      | Row
      | undefined
    if (!task) return { ok: false, error: 'Task not found.' }
    if (!isOwner(String(task.problem_id), userId) && task.created_by !== userId) {
      return { ok: false, error: 'Only the problem owner or the task creator can delete a task.' }
    }
    getDb().prepare('DELETE FROM tasks WHERE id = ?').run(taskId)
    return { ok: true }
  },

  async listResources(problemId) {
    const rows = getDb()
      .prepare(
        `SELECT r.*, p.display_name AS author_name, p.avatar_url AS author_avatar,
          p.profession AS author_profession, p.is_demo AS author_demo
         FROM resources r LEFT JOIN profiles p ON p.id = r.added_by
         WHERE r.problem_id = ? ORDER BY r.created_at DESC`,
      )
      .all(problemId) as Row[]
    return rows.map<Resource>((row) => ({
      id: String(row.id),
      problem_id: String(row.problem_id),
      title: String(row.title),
      url: String(row.url),
      description: (row.description as string | null) ?? null,
      added_by: String(row.added_by),
      created_at: String(row.created_at),
      author: {
        id: String(row.added_by),
        display_name: String(row.author_name ?? 'Member'),
        avatar_url: (row.author_avatar as string | null) ?? null,
        profession: (row.author_profession as string | null) ?? null,
        is_demo: Boolean(row.author_demo),
      },
    }))
  },

  async addResource(problemId, userId, input) {
    if (!canManage(problemId, userId)) {
      return { ok: false, error: 'Only the owner and contributors can share resources.' }
    }
    getDb()
      .prepare(
        'INSERT INTO resources (id, problem_id, title, url, description, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        randomUUID(),
        problemId,
        input.title.trim(),
        input.url.trim(),
        input.description?.trim() || null,
        userId,
        new Date().toISOString(),
      )
    return { ok: true }
  },

  async deleteResource(resourceId, userId) {
    const row = getDb().prepare('SELECT problem_id, added_by FROM resources WHERE id = ?').get(resourceId) as
      | Row
      | undefined
    if (!row) return { ok: false, error: 'Resource not found.' }
    if (!isOwner(String(row.problem_id), userId) && row.added_by !== userId) {
      return { ok: false, error: 'Only the problem owner or the person who shared it can remove it.' }
    }
    getDb().prepare('DELETE FROM resources WHERE id = ?').run(resourceId)
    return { ok: true }
  },

  async listContributors(problemId) {
    const rows = getDb()
      .prepare(
        `SELECT ct.*, p.display_name, p.avatar_url, p.profession, p.is_demo
         FROM contributors ct JOIN profiles p ON p.id = ct.user_id
         WHERE ct.problem_id = ? ORDER BY ct.created_at ASC`,
      )
      .all(problemId) as Row[]
    return rows.map<Contributor>((row) => ({
      user_id: String(row.user_id),
      problem_id: String(row.problem_id),
      role: (row.role as string | null) ?? null,
      created_at: String(row.created_at),
      profile: profileLite(row),
    }))
  },

  async addContributor(problemId, ownerId, userId, role) {
    if (!isOwner(problemId, ownerId)) {
      return { ok: false, error: 'Only the problem owner can manage contributors.' }
    }
    if (userId === ownerId) return { ok: false, error: 'You already own this problem.' }
    getDb()
      .prepare('INSERT OR REPLACE INTO contributors (problem_id, user_id, role, created_at) VALUES (?, ?, ?, ?)')
      .run(problemId, userId, role.trim() || 'Contributor', new Date().toISOString())
    return { ok: true }
  },

  async removeContributor(problemId, ownerId, userId) {
    if (!isOwner(problemId, ownerId)) {
      return { ok: false, error: 'Only the problem owner can manage contributors.' }
    }
    getDb().prepare('DELETE FROM contributors WHERE problem_id = ? AND user_id = ?').run(problemId, userId)
    return { ok: true }
  },

  async getSolution(problemId) {
    const row = getDb()
      .prepare('SELECT * FROM solutions WHERE problem_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(problemId) as Row | undefined
    if (!row) return null
    const contributions = getDb()
      .prepare(
        `SELECT c.*, p.display_name, p.avatar_url, p.profession, p.is_demo
         FROM contributions c JOIN profiles p ON p.id = c.user_id
         WHERE c.solution_id = ? ORDER BY c.created_at ASC`,
      )
      .all(String(row.id)) as Row[]
    return {
      id: String(row.id),
      problem_id: String(row.problem_id),
      author_id: String(row.author_id),
      outcome_status: row.outcome_status,
      outcome_description: String(row.outcome_description),
      attempted: String(row.attempted),
      worked: String(row.worked),
      evidence: (row.evidence as string | null) ?? null,
      created_at: String(row.created_at),
      contributions: contributions.map((entry) => ({
        id: String(entry.id),
        user_id: String(entry.user_id),
        problem_id: String(entry.problem_id),
        solution_id: (entry.solution_id as string | null) ?? null,
        summary: String(entry.summary),
        confirmed: Boolean(entry.confirmed),
        created_at: String(entry.created_at),
        profile: profileLite(entry),
      })),
    }
  },

  async reportSolution(problemId, ownerId, input: SolutionWriteInput) {
    if (!isOwner(problemId, ownerId)) {
      return { ok: false, error: 'Only the problem owner can report an outcome.' }
    }
    const db = getDb()
    const problem = db.prepare('SELECT title FROM problems WHERE id = ?').get(problemId) as Row | undefined
    if (!problem) return { ok: false, error: 'Problem not found.' }
    const solutionId = randomUUID()
    const now = new Date().toISOString()
    db.exec('BEGIN')
    try {
      db.prepare(
        `INSERT INTO solutions (id, problem_id, author_id, outcome_status, outcome_description, attempted, worked, evidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        solutionId,
        problemId,
        ownerId,
        input.outcomeStatus,
        input.outcomeDescription.trim(),
        input.attempted.trim(),
        input.worked.trim(),
        input.evidence?.trim() || null,
        now,
      )
      db.prepare('UPDATE problems SET status = ?, updated_at = ? WHERE id = ?').run(
        input.outcomeStatus,
        now,
        problemId,
      )
      const insertContribution = db.prepare(
        'INSERT INTO contributions (id, user_id, problem_id, solution_id, summary, confirmed, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      )
      for (const userId of input.contributorIds) {
        if (userId === ownerId) continue
        if (!isContributor(problemId, userId)) continue
        insertContribution.run(
          randomUUID(),
          userId,
          problemId,
          solutionId,
          `Contributed to “${String(problem.title)}” — confirmed by the problem owner.`,
          now,
        )
      }
      db.exec('COMMIT')
    } catch {
      db.exec('ROLLBACK')
      return { ok: false, error: 'Could not save the outcome. Please try again.' }
    }
    return { ok: true }
  },

  async listContributions(userId) {
    const rows = getDb()
      .prepare(
        `SELECT c.*, p.title AS problem_title, p.status AS problem_status, p.category AS problem_category,
           p.tags AS problem_tags
         FROM contributions c JOIN problems p ON p.id = c.problem_id
         WHERE c.user_id = ? ORDER BY c.created_at DESC`,
      )
      .all(userId) as Row[]
    return rows.map<Contribution>((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      problem_id: String(row.problem_id),
      solution_id: (row.solution_id as string | null) ?? null,
      summary: String(row.summary),
      confirmed: Boolean(row.confirmed),
      created_at: String(row.created_at),
      problem: {
        id: String(row.problem_id),
        title: String(row.problem_title),
        status: row.problem_status,
        category: String(row.problem_category),
        tags: parseStringArray(row.problem_tags),
      },
    }))
  },

  async listNews(limit = 12) {
    const db = getDb()
    const items: NewsItem[] = []
    const problems = db
      .prepare(
        `SELECT p.id, p.title, p.category, p.created_at, pr.display_name, pr.avatar_url, pr.profession, pr.is_demo
         FROM problems p JOIN profiles pr ON pr.id = p.owner_id
         ORDER BY p.created_at DESC LIMIT 5`,
      )
      .all() as Row[]
    for (const row of problems) {
      items.push({
        id: `problem-${row.id}`,
        kind: 'problem',
        title: `New problem: ${String(row.title)}`,
        body: `Published in ${String(row.category)} and open for contributors.`,
        href: `/problems/${row.id}`,
        created_at: String(row.created_at),
        actor: {
          id: '',
          display_name: String(row.display_name),
          avatar_url: (row.avatar_url as string | null) ?? null,
          profession: (row.profession as string | null) ?? null,
          is_demo: Boolean(row.is_demo),
        },
      })
    }
    const solutions = db
      .prepare(
        `SELECT s.id, s.problem_id, s.outcome_status, s.outcome_description, s.created_at, p.title,
          pr.display_name, pr.avatar_url, pr.profession, pr.is_demo
         FROM solutions s JOIN problems p ON p.id = s.problem_id JOIN profiles pr ON pr.id = s.author_id
         ORDER BY s.created_at DESC LIMIT 4`,
      )
      .all() as Row[]
    for (const row of solutions) {
      items.push({
        id: `solution-${row.id}`,
        kind: 'solution',
        title: `Outcome reported: ${String(row.title)}`,
        body: String(row.outcome_description).slice(0, 220),
        href: `/problems/${row.problem_id}`,
        created_at: String(row.created_at),
        actor: {
          id: '',
          display_name: String(row.display_name),
          avatar_url: (row.avatar_url as string | null) ?? null,
          profession: (row.profession as string | null) ?? null,
          is_demo: Boolean(row.is_demo),
        },
      })
    }
    const announcements = db
      .prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 4')
      .all() as Row[]
    for (const row of announcements) {
      items.push({
        id: `announcement-${row.id}`,
        kind: 'announcement',
        title: String(row.title),
        body: String(row.body),
        href: '/news',
        created_at: String(row.created_at),
      })
    }
    return items
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  },

  async getStats() {
    const row = getDb()
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM problems WHERE status IN ('open','in_progress')) AS open_problems,
          (SELECT COUNT(*) FROM profiles) AS members,
          (SELECT COUNT(*) FROM problems WHERE status = 'solved') AS solved,
          (SELECT COUNT(*) FROM contributions WHERE confirmed = 1) AS contributions`,
      )
      .get() as Row
    return {
      openProblems: Number(row.open_problems ?? 0),
      members: Number(row.members ?? 0),
      solved: Number(row.solved ?? 0),
      contributions: Number(row.contributions ?? 0),
    }
  },

  async listPopularSkills(limit = 12) {
    const rows = getDb()
      .prepare(
        `SELECT name, COUNT(*) AS n FROM user_skills WHERE kind IN ('expertise','interest')
         GROUP BY name ORDER BY n DESC, name ASC LIMIT ?`,
      )
      .all(limit) as Row[]
    return rows.map((row) => String(row.name))
  },

  async canManageWorkspace(problemId, userId) {
    return canManage(problemId, userId)
  },
}
