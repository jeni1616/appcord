export interface User {
  id: string
  email: string
  full_name: string | null
  plan_type: 'free' | 'starter' | 'pro' | 'enterprise'
  tokens_remaining: number
  tokens_used: number
  projects_count: number
  max_projects: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  original_prompt: string
  expanded_description: string | null
  todo_list: TodoItem[] | null
  status: 'draft' | 'building' | 'ready' | 'deployed' | 'failed'
  app_type: string | null
  complexity: 'simple' | 'moderate' | 'complex' | null
  tech_stack: string[] | null
  tokens_used: number
  preview_url: string | null
  production_url: string | null
  custom_domain: string | null
  github_repo_url: string | null
  supabase_project_id: string | null
  last_build_at: string | null
  created_at: string
  updated_at: string
}

export interface TodoItem {
  id: string
  category: string
  title: string
  checked: boolean
  note?: string
}

export interface TodoCategory {
  name: string
  items: TodoItem[]
}

export interface Build {
  id: string
  project_id: string
  build_number: number
  status: 'pending' | 'running' | 'success' | 'failed'
  ai_model_used: string | null
  tokens_consumed: number | null
  build_time_seconds: number | null
  error_message: string | null
  build_logs: string | null
  preview_url: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface BuildProgress {
  step: number
  totalSteps: number
  currentTask: string
  percentage: number
  completedTasks: string[]
  remainingTasks: string[]
}
