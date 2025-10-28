import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getClientEnv } from '@/lib/config/env'

const clientEnv = getClientEnv()

export const supabase = createClient<Database>(
  clientEnv.supabase.url,
  clientEnv.supabase.anonKey
)
