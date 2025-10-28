// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill fetch for Node environment (needed for AI SDKs)
import 'openai/shims/node'
import '@anthropic-ai/sdk/shims/node'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.VERCEL_TOKEN = 'test-vercel-token'
process.env.VERCEL_API_TOKEN = 'test-vercel-token'
process.env.STRIPE_SECRET_KEY = 'test-stripe-key'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'test-stripe-publishable-key'

// Polyfill Request and Response for Node environment
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = input
      this.method = init?.method || 'GET'
      this.headers = init?.headers || {}
      this.body = init?.body
    }
    async json() {
      return JSON.parse(this.body)
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.statusText = init?.statusText || ''
      this.ok = this.status >= 200 && this.status < 300
    }
    async json() {
      return JSON.parse(this.body)
    }
  }
}
