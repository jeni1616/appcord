import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getServerEnv } from '@/lib/config/env'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

const serverEnv = getServerEnv()

// Admin client for privileged operations
export const supabaseAdmin = createSupabaseClient<Database>(
  serverEnv.supabase.url,
  serverEnv.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Creates a Supabase client for server-side operations with user authentication.
 * This client reads the session from cookies and maintains user authentication state.
 * Use this in API routes and server components where user authentication is needed.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  // Get all cookies as a single string for Supabase auth
  const allCookies = cookieStore.getAll()
  const cookieString = allCookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ')

  // Create a Supabase client with the anon key for authenticated user operations
  const client = createSupabaseClient<Database>(
    serverEnv.supabase.url,
    serverEnv.supabase.anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'pkce'
      },
      global: {
        headers: {
          cookie: cookieString
        }
      }
    }
  )

  return client
}
