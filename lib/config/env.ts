/**
 * Environment Configuration
 *
 * This module validates and exports environment variables used throughout the application.
 * It ensures all required variables are set and provides helpful error messages if they're missing.
 */

interface EnvConfig {
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  // AI APIs
  ai: {
    anthropicApiKey: string;
    anthropicModel: string;
    openaiApiKey: string;
    openaiModel: string;
  };
  // Vercel (optional)
  vercel?: {
    token: string;
    teamId?: string;
  };
}

/**
 * Validates that a required environment variable is set
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your .env.local file and ensure ${key} is set.\n` +
      `See .env.example for reference.`
    );
  }
  return value;
}

/**
 * Gets an optional environment variable
 */
function getEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Validates and loads all environment variables
 */
function loadEnvConfig(): EnvConfig {
  // Validate required Supabase variables
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  // Validate required AI API keys
  const anthropicApiKey = requireEnv('ANTHROPIC_API_KEY');
  const anthropicModel = getEnv('ANTHROPIC_MODEL') || 'claude-haiku-4-5-20251001';
  const openaiApiKey = requireEnv('OPENAI_API_KEY');
  const openaiModel = getEnv('OPENAI_MODEL') || 'gpt-5-nano';

  // Optional Vercel configuration
  const vercelToken = getEnv('VERCEL_TOKEN');
  const vercelTeamId = getEnv('VERCEL_TEAM_ID');

  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceRoleKey: supabaseServiceRoleKey,
    },
    ai: {
      anthropicApiKey,
      anthropicModel,
      openaiApiKey,
      openaiModel,
    },
    ...(vercelToken && {
      vercel: {
        token: vercelToken,
        teamId: vercelTeamId,
      },
    }),
  };
}

// Load and validate environment variables at module initialization
let envConfig: EnvConfig;

try {
  envConfig = loadEnvConfig();
} catch (error) {
  // Only throw in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    console.error('Environment configuration error:', error);
    throw error;
  }
  // Provide dummy values for tests
  envConfig = {
    supabase: {
      url: 'http://localhost:54321',
      anonKey: 'test-anon-key',
      serviceRoleKey: 'test-service-role-key',
    },
    ai: {
      anthropicApiKey: 'test-anthropic-key',
      anthropicModel: 'claude-haiku-4-5-20251001',
      openaiApiKey: 'test-openai-key',
      openaiModel: 'gpt-5-nano',
    },
  };
}

export const env = envConfig;

/**
 * Check if Vercel deployment is configured
 */
export function isVercelConfigured(): boolean {
  return !!env.vercel?.token;
}

/**
 * Get all public environment variables (safe to expose to client)
 */
export function getPublicEnvVars() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.supabase.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.supabase.anonKey,
  };
}
