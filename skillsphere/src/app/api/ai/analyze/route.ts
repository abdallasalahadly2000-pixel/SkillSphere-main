import { NextResponse } from 'next/server'
import { z } from 'zod'
import { analyzeProblem, aiStatus, checkRateLimit } from '@/lib/ai'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

const bodySchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(20).max(8000),
  category: z.string().max(40).optional(),
  requiredSkills: z.array(z.string().max(60)).max(12).optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to use AI problem analysis.', code: 'auth' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.', code: 'bad_request' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Add a title and at least 20 characters of description first.', code: 'bad_request' },
      { status: 400 },
    )
  }

  if (!aiStatus().configured) {
    return NextResponse.json(
      {
        error:
          'AI is not configured on this deployment. Add GEMINI_API_KEY to the environment to enable problem analysis.',
        code: 'no_key',
      },
      { status: 503 },
    )
  }

  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: 'You have used the AI analysis limit for this hour. Try again later.', code: 'rate_limited' },
      { status: 429 },
    )
  }

  const result = await analyzeProblem(parsed.data)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.code === 'rate_limited' ? 429 : 502 },
    )
  }

  return NextResponse.json(result.data, { headers: { 'cache-control': 'no-store' } })
}
