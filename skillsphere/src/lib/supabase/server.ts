import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return { url, key }
}

/**
 * Cookie-bound Supabase client. Every query runs as the signed-in user, so
 * Row Level Security is always in force. The service-role key is never used.
 */
export async function createSupabaseServerClient() {
  const env = getSupabaseEnv()
  if (!env) throw new Error('Supabase is not configured')
  const cookieStore = await cookies()

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The browser client refreshes the session on the next interaction.
        }
      },
    },
  })
}
