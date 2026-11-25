import { NextResponse } from 'next/server'
import { z } from 'zod'
import { aiStatus, checkRateLimit, refineDescription } from '@/lib/ai'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

const bodySchema = z.object({
  title: z.string().trim().max(200).default(''),
  description: z.string().trim().min(30).max(8000),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to use problem refinement.', code: 'auth' }, { status: 401 })
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
      { error: 'Write at least 30 characters of description first.', code: 'bad_request' },
      { status: 400 },
    )
  }

  if (!aiStatus().configured) {
    return NextResponse.json(
      {
        error: 'AI is not configured on this deployment. Add GEMINI_API_KEY to enable refinement.',
        code: 'no_key',
      },
      { status: 503 },
    )
  }

  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: 'You have used the AI limit for this hour. Try again later.', code: 'rate_limited' },
      { status: 429 },
    )
  }

  const result = await refineDescription(parsed.data)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.code === 'rate_limited' ? 429 : 502 },
    )
  }

  return NextResponse.json(result.data, { headers: { 'cache-control': 'no-store' } })
}
