import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getServerEnv } from '@/lib/config/env'

const serverEnv = getServerEnv()

export const supabaseAdmin = createClient<Database>(
  serverEnv.supabase.url,
  serverEnv.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
