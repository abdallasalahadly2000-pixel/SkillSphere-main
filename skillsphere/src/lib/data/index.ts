import type { Repository } from './repository'
import { demoRepository } from './demo/repo'
import { supabaseRepository } from './supabase/repo'

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/**
 * Supabase when credentials exist, otherwise the local SQLite demo backend.
 * Both implement `Repository`, so the UI and server actions never branch.
 */
export const repo: Repository = isSupabaseConfigured() ? supabaseRepository : demoRepository

export { demoRepository, supabaseRepository }
export type { Repository }
