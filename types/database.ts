export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string | null
          full_name: string | null
          plan_type: 'free' | 'starter' | 'pro' | 'enterprise'
          tokens_remaining: number
          tokens_used: number
          projects_count: number
          max_projects: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash?: string | null
          full_name?: string | null
          plan_type?: 'free' | 'starter' | 'pro' | 'enterprise'
          tokens_remaining?: number
          tokens_used?: number
          projects_count?: number
          max_projects?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string | null
          full_name?: string | null
          plan_type?: 'free' | 'starter' | 'pro' | 'enterprise'
          tokens_remaining?: number
          tokens_used?: number
          projects_count?: number
          max_projects?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          original_prompt: string
          expanded_description: string | null
          todo_list: Json | null
          status: 'draft' | 'building' | 'ready' | 'deployed' | 'failed'
          app_type: string | null
          complexity: 'simple' | 'moderate' | 'complex' | null
          tech_stack: Json | null
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
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          original_prompt: string
          expanded_description?: string | null
          todo_list?: Json | null
          status?: 'draft' | 'building' | 'ready' | 'deployed' | 'failed'
          app_type?: string | null
          complexity?: 'simple' | 'moderate' | 'complex' | null
          tech_stack?: Json | null
          tokens_used?: number
          preview_url?: string | null
          production_url?: string | null
          custom_domain?: string | null
          github_repo_url?: string | null
          supabase_project_id?: string | null
          last_build_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          original_prompt?: string
          expanded_description?: string | null
          todo_list?: Json | null
          status?: 'draft' | 'building' | 'ready' | 'deployed' | 'failed'
          app_type?: string | null
          complexity?: 'simple' | 'moderate' | 'complex' | null
          tech_stack?: Json | null
          tokens_used?: number
          preview_url?: string | null
          production_url?: string | null
          custom_domain?: string | null
          github_repo_url?: string | null
          supabase_project_id?: string | null
          last_build_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      builds: {
        Row: {
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
        Insert: {
          id?: string
          project_id: string
          build_number: number
          status?: 'pending' | 'running' | 'success' | 'failed'
          ai_model_used?: string | null
          tokens_consumed?: number | null
          build_time_seconds?: number | null
          error_message?: string | null
          build_logs?: string | null
          preview_url?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          build_number?: number
          status?: 'pending' | 'running' | 'success' | 'failed'
          ai_model_used?: string | null
          tokens_consumed?: number | null
          build_time_seconds?: number | null
          error_message?: string | null
          build_logs?: string | null
          preview_url?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
