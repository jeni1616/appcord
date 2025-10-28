// Import shims before SDK to avoid fetch errors
import '@anthropic-ai/sdk/shims/node';

import { generateScopeWithClaude, refineScopeWithClaude } from '@/lib/ai/claude';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

describe('Claude AI Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateScopeWithClaude', () => {
    const mockPrompt = 'Build a todo app with user authentication';

    const mockValidScope = {
      expandedDescription: 'A comprehensive todo application with user authentication, task management, and real-time updates.',
      appType: 'productivity',
      complexity: 'moderate',
      estimatedTokens: 5000,
      techStack: ['Next.js 16', 'TypeScript', 'Tailwind CSS', 'Supabase', 'shadcn/ui'],
      todoCategories: [
        {
          name: 'Project Setup',
          items: [
            { title: 'Initialize Next.js 16 project', checked: true },
            { title: 'Configure Tailwind CSS', checked: true },
          ],
        },
        {
          name: 'Authentication',
          items: [
            { title: 'Setup Supabase Auth', checked: false },
            { title: 'Create login/signup pages', checked: false },
          ],
        },
      ],
    };

    it('should generate scope successfully with valid JSON response', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockValidScope),
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      const result = await generateScopeWithClaude(mockPrompt);

      expect(result).toEqual(mockValidScope);
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
        })
      );
    });

    it('should extract JSON from response with extra text', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: `Here's the project scope analysis:\n\n${JSON.stringify(mockValidScope)}\n\nLet me know if you need any adjustments.`,
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      const result = await generateScopeWithClaude(mockPrompt);

      expect(result).toEqual(mockValidScope);
    });

    it('should include user prompt in the API call', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockValidScope),
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      await generateScopeWithClaude(mockPrompt);

      const callArgs = mockAnthropicInstance.messages.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(mockPrompt);
    });

    it('should throw error when Claude API fails', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      await expect(generateScopeWithClaude(mockPrompt)).rejects.toThrow('API rate limit exceeded');
    });

    it('should throw error for unexpected response format', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'image',
                source: { type: 'base64', data: 'fake-image-data' },
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      await expect(generateScopeWithClaude(mockPrompt)).rejects.toThrow('Unexpected response format from Claude');
    });

    it('should handle malformed JSON response', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: '{ invalid json here',
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      await expect(generateScopeWithClaude(mockPrompt)).rejects.toThrow();
    });
  });

  describe('refineScopeWithClaude', () => {
    const mockOriginalScope = {
      expandedDescription: 'Original description',
      appType: 'productivity',
      complexity: 'simple',
      estimatedTokens: 3000,
      techStack: ['Next.js 16', 'TypeScript'],
      todoCategories: [],
    };

    const mockUserFeedback = 'Add real-time collaboration features';

    const mockRefinedScope = {
      ...mockOriginalScope,
      expandedDescription: 'Updated description with real-time collaboration',
      complexity: 'complex',
      estimatedTokens: 7000,
      todoCategories: [
        {
          name: 'Real-time Features',
          items: [
            { title: 'Setup WebSocket connection', checked: false },
            { title: 'Implement collaborative editing', checked: false },
          ],
        },
      ],
    };

    it('should refine scope successfully', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockRefinedScope),
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      const result = await refineScopeWithClaude(mockOriginalScope, mockUserFeedback);

      expect(result).toEqual(mockRefinedScope);
    });

    it('should include original scope in API call', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockRefinedScope),
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      await refineScopeWithClaude(mockOriginalScope, mockUserFeedback);

      const callArgs = mockAnthropicInstance.messages.create.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;

      expect(userMessage).toContain(JSON.stringify(mockOriginalScope, null, 2));
      expect(userMessage).toContain(mockUserFeedback);
    });

    it('should handle refinement with JSON extraction', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: `I've updated the scope:\n${JSON.stringify(mockRefinedScope)}\nThese changes address your feedback.`,
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      const result = await refineScopeWithClaude(mockOriginalScope, mockUserFeedback);

      expect(result).toEqual(mockRefinedScope);
    });

    it('should throw error when refinement fails', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      await expect(
        refineScopeWithClaude(mockOriginalScope, mockUserFeedback)
      ).rejects.toThrow('Network error');
    });
  });
});
