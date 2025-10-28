/**
 * Environment Configuration
 *
 * This module validates and exports environment variables used throughout the application.
 * It ensures all required variables are set and provides helpful error messages if they're missing.
 *
 * IMPORTANT: This uses lazy loading to avoid validating server-side env vars in client components.
 */

interface ClientEnvConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
}

interface ServerEnvConfig extends ClientEnvConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  ai: {
    anthropicApiKey: string;
    anthropicModel: string;
    openaiApiKey: string;
    openaiModel: string;
  };
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
 * Loads client-safe environment variables (NEXT_PUBLIC_* only)
 * Safe to use in both client and server components
 */
function loadClientEnvConfig(): ClientEnvConfig {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
  };
}

/**
 * Loads all environment variables including server-side secrets
 * ONLY use this in server-side code (API routes, server components, server actions)
 */
function loadServerEnvConfig(): ServerEnvConfig {
  // First load client config
  const clientConfig = loadClientEnvConfig();

  // Then load server-only config
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const anthropicApiKey = requireEnv('ANTHROPIC_API_KEY');
  const anthropicModel = getEnv('ANTHROPIC_MODEL') || 'claude-haiku-4-5-20251001';
  const openaiApiKey = requireEnv('OPENAI_API_KEY');
  const openaiModel = getEnv('OPENAI_MODEL') || 'gpt-5-nano';

  const vercelToken = getEnv('VERCEL_TOKEN');
  const vercelTeamId = getEnv('VERCEL_TEAM_ID');

  return {
    ...clientConfig,
    supabase: {
      ...clientConfig.supabase,
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

// Lazy-loaded configs
let clientEnvConfig: ClientEnvConfig | null = null;
let serverEnvConfig: ServerEnvConfig | null = null;

/**
 * Get client-safe environment config
 * Safe to use in both client and server components
 */
export function getClientEnv(): ClientEnvConfig {
  if (!clientEnvConfig) {
    try {
      clientEnvConfig = loadClientEnvConfig();
    } catch (error) {
      // Only throw in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Client environment configuration error:', error);
        throw error;
      }
      // Provide dummy values for tests
      clientEnvConfig = {
        supabase: {
          url: 'http://localhost:54321',
          anonKey: 'test-anon-key',
        },
      };
    }
  }
  return clientEnvConfig;
}

/**
 * Get full environment config including server-side secrets
 * ONLY use this in server-side code (API routes, server components, server actions)
 */
export function getServerEnv(): ServerEnvConfig {
  if (!serverEnvConfig) {
    try {
      serverEnvConfig = loadServerEnvConfig();
    } catch (error) {
      // Only throw in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Server environment configuration error:', error);
        throw error;
      }
      // Provide dummy values for tests
      serverEnvConfig = {
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
  }
  return serverEnvConfig;
}

/**
 * Legacy export for backward compatibility
 * This will lazily load the server config
 * @deprecated Use getClientEnv() or getServerEnv() instead
 */
export const env = new Proxy({} as ServerEnvConfig, {
  get(_target, prop) {
    return getServerEnv()[prop as keyof ServerEnvConfig];
  },
});

/**
 * Check if Vercel deployment is configured
 */
export function isVercelConfigured(): boolean {
  return !!getServerEnv().vercel?.token;
}

/**
 * Get all public environment variables (safe to expose to client)
 */
export function getPublicEnvVars() {
  const clientEnv = getClientEnv();
  return {
    NEXT_PUBLIC_SUPABASE_URL: clientEnv.supabase.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: clientEnv.supabase.anonKey,
  };
}
