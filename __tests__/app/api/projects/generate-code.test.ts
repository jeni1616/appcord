// Import shims before modules to avoid fetch errors
import 'openai/shims/node';
import '@anthropic-ai/sdk/shims/node';

import { NextResponse } from 'next/server';
import { POST } from '@/app/api/projects/generate-code/route';
import { createClient } from '@/lib/supabase/server';
import { generateProjectCode } from '@/lib/services/codeGenerator';

// Mock dependencies
jest.mock('next/server');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/services/codeGenerator');

describe('Generate Code API Route', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabaseClient),
      select: jest.fn(() => mockSupabaseClient),
      eq: jest.fn(() => mockSupabaseClient),
      single: jest.fn(),
      insert: jest.fn(() => mockSupabaseClient),
      update: jest.fn(() => mockSupabaseClient),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabaseClient);

    // Mock NextResponse
    (NextResponse.json as jest.Mock).mockImplementation((data, init) => ({
      data,
      status: init?.status || 200,
    }));
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'test-project-id' }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    });

    it('should proceed when user is authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: new Error('Project not found'),
      });

      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'test-project-id' }),
      });

      await POST(request);

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });
    });

    it('should return 400 when projectId is missing', async () => {
      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    });

    it('should return 404 when project is not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'non-existent-project' }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Project not found' },
        { status: 404 }
      );
    });

    it('should return 404 when user data is not found', async () => {
      // First call for project
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: 'project-123',
            name: 'Test Project',
            user_id: 'user-123',
          },
          error: null,
        })
        // Second call for user data
        .mockResolvedValueOnce({
          data: null,
          error: new Error('User not found'),
        });

      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'project-123' }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'User not found' },
        { status: 404 }
      );
    });
  });

  describe('Token Management', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: 'project-123',
          name: 'Test Project',
          user_id: 'user-123',
          expanded_description: 'Test description',
          todo_list: [],
          tech_stack: ['Next.js'],
          app_type: 'saas',
        },
        error: null,
      });
    });

    it('should return 402 when user has insufficient tokens', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          tokens_remaining: 1000,
          tokens_used: 5000,
        },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'project-123' }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Insufficient tokens. Please upgrade your plan.' },
        { status: 402 }
      );
    });

    it('should proceed when user has sufficient tokens', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            tokens_remaining: 10000,
            tokens_used: 0,
          },
          error: null,
        });

      (generateProjectCode as jest.Mock).mockResolvedValue({
        files: [
          { path: 'app/page.tsx', content: 'test', type: 'page' },
        ],
        structure: 'Test structure',
        dependencies: {},
        envVariables: [],
      });

      mockSupabaseClient.insert.mockResolvedValue({
        data: { id: 'build-123' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'project-123' }),
      });

      await POST(request);

      expect(generateProjectCode).toHaveBeenCalled();
    });
  });

  describe('Code Generation Success', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      // Mock project fetch
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: 'project-123',
            name: 'Test Project',
            user_id: 'user-123',
            expanded_description: 'A test project',
            todo_list: [{ title: 'Setup', checked: false }],
            tech_stack: ['Next.js', 'TypeScript'],
            app_type: 'saas',
          },
          error: null,
        })
        // Mock user data fetch
        .mockResolvedValueOnce({
          data: {
            tokens_remaining: 10000,
            tokens_used: 5000,
          },
          error: null,
        });

      // Mock build insert
      mockSupabaseClient.insert.mockResolvedValue({
        data: { id: 'build-123' },
        error: null,
      });
    });

    it('should generate code successfully and update all records', async () => {
      const mockCodeResult = {
        files: [
          { path: 'app/page.tsx', content: 'export default function Home() {}', type: 'page' },
          { path: 'components/Button.tsx', content: 'export default function Button() {}', type: 'component' },
        ],
        structure: 'Next.js application structure',
        dependencies: { 'next': '^15.0.0' },
        envVariables: ['NEXT_PUBLIC_API_URL'],
      };

      (generateProjectCode as jest.Mock).mockResolvedValue(mockCodeResult);

      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'project-123' }),
      });

      await POST(request);

      // Verify code generation was called
      expect(generateProjectCode).toHaveBeenCalledWith(
        'Test Project',
        'A test project',
        [{ title: 'Setup', checked: false }],
        ['Next.js', 'TypeScript'],
        'saas'
      );

      // Verify project status was updated to building
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'building',
        })
      );

      // Verify files were inserted
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            file_path: 'app/page.tsx',
          }),
        ])
      );

      // Verify success response
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          filesCount: 2,
        })
      );
    });

    it('should update tokens after successful generation', async () => {
      (generateProjectCode as jest.Mock).mockResolvedValue({
        files: [{ path: 'app/page.tsx', content: 'test', type: 'page' }],
        structure: 'Test',
        dependencies: {},
        envVariables: [],
      });

      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'project-123' }),
      });

      await POST(request);

      // Verify user tokens were updated
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens_remaining: 5000, // 10000 - 5000
          tokens_used: 10000, // 5000 + 5000
        })
      );
    });
  });

  describe('Code Generation Failure', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: 'project-123',
            name: 'Test Project',
            user_id: 'user-123',
            expanded_description: 'Test',
            todo_list: [],
            tech_stack: ['Next.js'],
            app_type: 'saas',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            tokens_remaining: 10000,
            tokens_used: 0,
          },
          error: null,
        });

      mockSupabaseClient.insert.mockResolvedValue({
        data: { id: 'build-123' },
        error: null,
      });
    });

    it('should handle code generation error and update project status to failed', async () => {
      (generateProjectCode as jest.Mock).mockRejectedValue(
        new Error('AI service error')
      );

      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'project-123' }),
      });

      await POST(request);

      // Verify project status was updated to failed
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      );

      // Verify error response
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('AI service error'),
        }),
        { status: 500 }
      );
    });

    it('should update build record with error message on failure', async () => {
      (generateProjectCode as jest.Mock).mockRejectedValue(
        new Error('Code generation timeout')
      );

      const request = new Request('http://localhost:3000/api/projects/generate-code', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'project-123' }),
      });

      await POST(request);

      // Verify build was updated with error
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_message: 'Code generation timeout',
        })
      );
    });
  });
});
