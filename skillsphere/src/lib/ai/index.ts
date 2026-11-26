import { z } from 'zod'
import { CATEGORIES, CATEGORY_VALUES, type Category } from '@/lib/constants'
import type { AiAnalysis } from '@/lib/types'

export type AiProvider = 'gemini' | 'openai'

export type AiStatus = {
  configured: boolean
  provider: AiProvider | null
  model: string | null
}

export type AiFailure = {
  ok: false
  error: string
  code: 'no_key' | 'rate_limited' | 'upstream' | 'invalid_response'
}

export type AiSuccess<T> = { ok: true; data: T }
export type AiResult<T> = AiSuccess<T> | AiFailure

export function aiStatus(): AiStatus {
  if (process.env.GEMINI_API_KEY) {
    return {
      configured: true,
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    }
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      configured: true,
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    }
  }
  return { configured: false, provider: null, model: null }
}

const analysisSchema = z.object({
  main_problem: z.string().min(1).max(600),
  objective: z.string().min(1).max(600),
  required_skills: z.array(z.string().min(1).max(60)).max(10).default([]),
  keywords: z.array(z.string().min(1).max(60)).max(12).default([]),
  category: z.string().min(1),
  missing_information: z.array(z.string().min(1).max(300)).max(6).default([]),
  investigation_directions: z.array(z.string().min(1).max(300)).max(6).default([]),
})

const refineSchema = z.object({ refined: z.string().min(20).max(4000) })

const SYSTEM_PROMPT = `You are the problem-analysis engine inside SkillSphere, a collaborative problem-solving platform for students, researchers and engineers.

Return ONLY a JSON object, no prose and no markdown fences, with exactly this shape:
{
  "main_problem": string,
  "objective": string,
  "required_skills": string[],
  "keywords": string[],
  "category": string,
  "missing_information": string[],
  "investigation_directions": string[]
}

Rules:
- Use only the information in the member's text. Never invent facts, numbers, sources, results or research findings.
- "main_problem": 1-2 sentences naming the concrete difficulty.
- "objective": what a useful outcome would look like.
- "required_skills": 3-6 concrete skills in Title Case.
- "keywords": 3-8 short search terms for finding related problems.
- "missing_information": up to 4 specific facts the author has not supplied that a collaborator would need.
- "investigation_directions": up to 4 practical options to explore, phrased as suggestions, never as verified conclusions.
- Write in the same language as the member's text.
- These are suggestions for the author to review, not verified analysis.`

const REFINE_PROMPT = `You help a member of SkillSphere rewrite a problem description so other people can act on it.

Return ONLY a JSON object: {"refined": string}

Rules:
- Keep every fact, number and constraint the author gave. Add nothing they did not state.
- Structure it: what is happening, what has been tried, what kind of help is needed.
- Keep the author's language. Be specific and plain, no marketing tone.
- 80-220 words. If the original is already clear, make only light edits.`

function normaliseCategory(value: string): Category {
  const raw = value.trim().toLowerCase()
  const exact = CATEGORIES.find((c) => c.value === raw)
  if (exact) return exact.value
  const byLabel = CATEGORIES.find((c) => c.label.toLowerCase() === raw)
  if (byLabel) return byLabel.value
  if (/robot|slam|embedded|control|mechatron|hardware|sensor/.test(raw)) return 'engineering-robotics'
  if (/machine learning|neural|vision|nlp|dataset|model|ai\b/.test(raw)) return 'ai-ml'
  if (/math|statistic|algebra|calculus|probability/.test(raw)) return 'mathematics'
  if (/research|experiment|physics|chem|biology|scien/.test(raw)) return 'science-research'
  if (/design|ux|ui|creative|visual|brand/.test(raw)) return 'design-creativity'
  if (/business|pricing|startup|market|product|entrepreneur/.test(raw)) return 'business'
  if (/teach|educat|student|learn|curriculum/.test(raw)) return 'education'
  if (/code|software|program|web|api|database/.test(raw)) return 'programming'
  const valid = CATEGORY_VALUES.find((c) => c === raw)
  return valid ?? 'general'
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, '```').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

async function callProvider(prompt: string, system: string): Promise<AiResult<string>> {
  const status = aiStatus()
  if (!status.configured || !status.provider) {
    return {
      ok: false,
      code: 'no_key',
      error: 'AI is not configured on this deployment. Add GEMINI_API_KEY to the environment to enable problem analysis.',
    }
  }

  try {
    if (status.provider === 'gemini') {
      const key = process.env.GEMINI_API_KEY!
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${status.model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1400,
              responseMimeType: 'application/json',
            },
          }),
        },
      )
      if (!res.ok) {
  const errorBody = await res.text()
  console.error('[Gemini API Error]', res.status, errorBody)
  return mapHttpError(res.status)
}
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
      if (!text.trim()) {
        return { ok: false, code: 'invalid_response', error: 'The AI returned an empty response. Try again.' }
      }
      return { ok: true, data: text }
    }

    const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: status.model,
        temperature: 0.3,
        max_tokens: 1400,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) {
  const errorBody = await res.text()
  console.error('[Gemini API Error]', res.status, errorBody)
  return mapHttpError(res.status)
}
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const text = json.choices?.[0]?.message?.content ?? ''
    if (!text.trim()) {
      return { ok: false, code: 'invalid_response', error: 'The AI returned an empty response. Try again.' }
    }
    return { ok: true, data: text }
  } catch (error) {
    const name = error instanceof Error ? error.name : ''
    if (name === 'TimeoutError' || name === 'AbortError') {
      return { ok: false, code: 'upstream', error: 'The AI request timed out. Try again in a moment.' }
    }
    console.error('[skillsphere:ai]', error)
    return { ok: false, code: 'upstream', error: 'Could not reach the AI service. Try again in a moment.' }
  }
}

function mapHttpError(status: number): AiFailure {
  if (status === 429) {
    return {
      ok: false,
      code: 'rate_limited',
      error: 'The AI service is rate limiting requests right now. Wait a minute and try again.',
    }
  }
  if (status === 401 || status === 403) {
    return {
      ok: false,
      code: 'upstream',
      error: 'The AI key was rejected. Check that GEMINI_API_KEY is valid and has the Generative Language API enabled.',
    }
  }
  return { ok: false, code: 'upstream', error: `The AI service returned an error (${status}). Try again.` }
}

const buckets = new Map<string, number[]>()
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 20

export function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const recent = (buckets.get(userId) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    buckets.set(userId, recent)
    return false
  }
  recent.push(now)
  buckets.set(userId, recent)
  return true
}

export async function analyzeProblem(input: {
  title: string
  description: string
  category?: string
  requiredSkills?: string[]
}): Promise<AiResult<AiAnalysis>> {
  const prompt = `Problem title: ${input.title}

Problem description:
${input.description}

${input.category ? `Category the author picked: ${CATEGORIES.find((c) => c.value === input.category)?.label ?? input.category}` : ''}
${input.requiredSkills?.length ? `Skills the author listed: ${input.requiredSkills.join(', ')}` : ''}

Allowed category values: ${CATEGORY_VALUES.join(', ')}`

  const result = await callProvider(prompt, SYSTEM_PROMPT)
  if (!result.ok) return result

  const parsed = extractJson(result.data)
  const validated = analysisSchema.safeParse(parsed)
  if (!validated.success) {
    return {
      ok: false,
      code: 'invalid_response',
      error: 'The AI response did not match the expected structure. Nothing was saved — try again.',
    }
  }
  const value = validated.data
  return {
    ok: true,
    data: {
      main_problem: value.main_problem,
      objective: value.objective,
      required_skills: value.required_skills.map((s) => s.trim()).filter(Boolean).slice(0, 8),
      keywords: value.keywords.map((k) => k.trim()).filter(Boolean).slice(0, 10),
      category: normaliseCategory(value.category),
      missing_information: value.missing_information.filter(Boolean).slice(0, 5),
      investigation_directions: value.investigation_directions.filter(Boolean).slice(0, 5),
    },
  }
}

export async function refineDescription(input: {
  title: string
  description: string
}): Promise<AiResult<{ refined: string }>> {
  const prompt = `Problem title: ${input.title}

Current description:
${input.description}`

  const result = await callProvider(prompt, REFINE_PROMPT)
  if (!result.ok) return result
  const parsed = refineSchema.safeParse(extractJson(result.data))
  if (!parsed.success) {
    return {
      ok: false,
      code: 'invalid_response',
      error: 'The AI response did not match the expected structure. Nothing was changed — try again.',
    }
  }
  return { ok: true, data: { refined: parsed.data.refined } }
}
