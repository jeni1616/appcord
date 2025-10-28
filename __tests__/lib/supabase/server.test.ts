import { createClient, supabaseAdmin } from '@/lib/supabase/server'

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: jest.fn().mockReturnValue([
      { name: 'sb-access-token', value: 'mock-access-token' },
      { name: 'sb-refresh-token', value: 'mock-refresh-token' }
    ])
  })
}))

describe('Supabase Server Client', () => {
  describe('supabaseAdmin', () => {
    it('should be defined and have auth methods', () => {
      expect(supabaseAdmin).toBeDefined()
      expect(supabaseAdmin.auth).toBeDefined()
      expect(typeof supabaseAdmin.from).toBe('function')
    })
  })

  describe('createClient', () => {
    it('should be a function', () => {
      expect(typeof createClient).toBe('function')
    })

    it('should return a Supabase client instance', async () => {
      const client = await createClient()

      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
      expect(typeof client.auth.getUser).toBe('function')
      expect(typeof client.from).toBe('function')
    })

    it('should create client with proper configuration', async () => {
      const client = await createClient()

      // Verify the client has database query methods
      expect(typeof client.from).toBe('function')

      // Verify auth methods exist
      expect(typeof client.auth.getUser).toBe('function')
      expect(typeof client.auth.signIn).toBe('function' || 'undefined') // May vary by version
    })
  })
})
