import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { env } from '@/lib/config/env'

export const supabaseAdmin = createClient<Database>(
  env.supabase.url,
  env.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
