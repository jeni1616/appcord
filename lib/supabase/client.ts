import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { env } from '@/lib/config/env'

export const supabase = createClient<Database>(
  env.supabase.url,
  env.supabase.anonKey
)
