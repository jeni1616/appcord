-- AppCord Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  plan_type VARCHAR(50) DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'pro', 'enterprise')),
  tokens_remaining INTEGER DEFAULT 10000,
  tokens_used INTEGER DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  max_projects INTEGER DEFAULT 2,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  original_prompt TEXT NOT NULL,
  expanded_description TEXT,
  todo_list JSONB,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'building', 'ready', 'deployed', 'failed')),
  app_type VARCHAR(100),
  complexity VARCHAR(50) CHECK (complexity IN ('simple', 'moderate', 'complex')),
  tech_stack JSONB,
  dependencies JSONB,
  env_variables JSONB,
  tokens_used INTEGER DEFAULT 0,
  preview_url VARCHAR(500),
  production_url VARCHAR(500),
  custom_domain VARCHAR(255),
  custom_domain_verified BOOLEAN DEFAULT false,
  github_repo_url VARCHAR(500),
  supabase_project_id VARCHAR(255),
  vercel_project_id VARCHAR(255),
  last_build_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Builds table
CREATE TABLE builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  build_number INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  ai_model_used VARCHAR(100),
  tokens_consumed INTEGER,
  build_time_seconds INTEGER,
  error_message TEXT,
  build_logs TEXT,
  preview_url VARCHAR(500),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Iterations table
CREATE TABLE iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_prompt TEXT NOT NULL,
  ai_response TEXT,
  changes_made JSONB,
  tokens_used INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage logs table
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  action_type VARCHAR(100),
  ai_model VARCHAR(100),
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_id VARCHAR(255),
  amount_usd DECIMAL(10, 2),
  plan_type VARCHAR(50),
  billing_period VARCHAR(50),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deployments table
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  build_id UUID REFERENCES builds(id) ON DELETE CASCADE,
  environment VARCHAR(50),
  url VARCHAR(500) NOT NULL,
  deploy_status VARCHAR(50) DEFAULT 'deploying',
  deployed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project files table (stores generated code)
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  file_content TEXT NOT NULL,
  file_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages table (for AI iterations)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Custom domains table
CREATE TABLE custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL UNIQUE,
  verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  dns_records JSONB,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'active', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_builds_project_id ON builds(project_id);
CREATE INDEX idx_iterations_project_id ON iterations(project_id);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX idx_custom_domains_project_id ON custom_domains(project_id);
CREATE INDEX idx_custom_domains_domain ON custom_domains(domain);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Builds policies
CREATE POLICY "Users can view builds of own projects" ON builds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = builds.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Iterations policies
CREATE POLICY "Users can view iterations of own projects" ON iterations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = iterations.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Usage logs policies
CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Deployments policies
CREATE POLICY "Users can view deployments of own projects" ON deployments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = deployments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Project files policies
CREATE POLICY "Users can view files of own projects" ON project_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert files for own projects" ON project_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update files of own projects" ON project_files
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Chat messages policies
CREATE POLICY "Users can view chat messages of own projects" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Custom domains policies
CREATE POLICY "Users can view domains of own projects" ON custom_domains
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = custom_domains.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert domains for own projects" ON custom_domains
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = custom_domains.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update domains of own projects" ON custom_domains
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = custom_domains.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete domains of own projects" ON custom_domains
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = custom_domains.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_files_updated_at BEFORE UPDATE ON project_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
