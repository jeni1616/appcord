// Import shims before SDKs to avoid fetch errors
import 'openai/shims/node';
import '@anthropic-ai/sdk/shims/node';

import { generateProjectCode, refineCode } from '@/lib/services/codeGenerator';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Mock the AI SDKs
jest.mock('@anthropic-ai/sdk');
jest.mock('openai');

describe('CodeGenerator Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateProjectCode', () => {
    const mockProjectName = 'Test Project';
    const mockExpandedDescription = 'A comprehensive test application';
    const mockTodoList = [
      { title: 'Setup project', checked: false },
      { title: 'Add authentication', checked: false },
    ];
    const mockTechStack = ['Next.js 16', 'TypeScript', 'Tailwind CSS'];
    const mockAppType = 'saas';

    const mockValidResponse = {
      files: [
        {
          path: 'app/page.tsx',
          content: 'export default function Home() { return <div>Home</div> }',
          type: 'page',
        },
        {
          path: 'components/Button.tsx',
          content: 'export default function Button() { return <button>Click</button> }',
          type: 'component',
        },
      ],
      structure: 'Next.js app with basic structure',
      dependencies: {
        'next': '^15.0.0',
        'react': '^19.0.0',
      },
      envVariables: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_KEY'],
    };

    it('should generate project code using Claude successfully', async () => {
      // Mock Claude response
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockValidResponse),
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      const result = await generateProjectCode(
        mockProjectName,
        mockExpandedDescription,
        mockTodoList,
        mockTechStack,
        mockAppType
      );

      expect(result).toEqual(mockValidResponse);
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16000,
        })
      );
    });

    it('should handle Claude response with extra text around JSON', async () => {
      // Mock Claude response with explanation text
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: `Here's the generated code:\n\n${JSON.stringify(mockValidResponse)}\n\nThis structure follows best practices.`,
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      const result = await generateProjectCode(
        mockProjectName,
        mockExpandedDescription,
        mockTodoList,
        mockTechStack,
        mockAppType
      );

      expect(result).toEqual(mockValidResponse);
    });

    it('should fallback to GPT-4o when Claude fails', async () => {
      // Mock Claude to fail
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('Claude API error')),
        },
      };

      // Mock OpenAI to succeed
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockValidResponse),
                  },
                },
              ],
            }),
          },
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      const result = await generateProjectCode(
        mockProjectName,
        mockExpandedDescription,
        mockTodoList,
        mockTechStack,
        mockAppType
      );

      expect(result).toEqual(mockValidResponse);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0.3,
          max_tokens: 16000,
        })
      );
    });

    it('should throw error when both Claude and GPT fail', async () => {
      // Mock both to fail
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('Claude API error')),
        },
      };

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('OpenAI API error')),
          },
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      await expect(
        generateProjectCode(
          mockProjectName,
          mockExpandedDescription,
          mockTodoList,
          mockTechStack,
          mockAppType
        )
      ).rejects.toThrow('OpenAI API error');
    });

    it('should throw error when response is not valid JSON', async () => {
      // Mock Claude with invalid JSON
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: 'This is not JSON',
              },
            ],
          }),
        },
      };

      // Mock OpenAI with invalid JSON
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'Also not JSON',
                  },
                },
              ],
            }),
          },
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      await expect(
        generateProjectCode(
          mockProjectName,
          mockExpandedDescription,
          mockTodoList,
          mockTechStack,
          mockAppType
        )
      ).rejects.toThrow('Failed to parse GPT response');
    });

    it('should include correct project specifications in prompt', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockValidResponse),
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      await generateProjectCode(
        mockProjectName,
        mockExpandedDescription,
        mockTodoList,
        mockTechStack,
        mockAppType
      );

      const callArgs = mockAnthropicInstance.messages.create.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;

      expect(userMessage).toContain(mockProjectName);
      expect(userMessage).toContain(mockExpandedDescription);
      expect(userMessage).toContain(mockAppType);
      expect(userMessage).toContain('Next.js 16');
    });
  });

  describe('refineCode', () => {
    const mockExistingFiles = [
      {
        path: 'app/page.tsx',
        content: 'export default function Home() { return <div>Old Home</div> }',
        type: 'page' as const,
      },
    ];

    const mockUserFeedback = 'Change the home page title to "Welcome"';
    const mockConversationHistory = [
      { role: 'user', content: 'Generate a home page' },
      { role: 'assistant', content: 'Here is the home page code' },
    ];

    const mockRefinedResponse = {
      files: [
        {
          path: 'app/page.tsx',
          content: 'export default function Home() { return <div>Welcome</div> }',
          type: 'page',
        },
      ],
      structure: 'Updated home page',
      dependencies: { 'next': '^15.0.0' },
      envVariables: [],
    };

    it('should refine code using Claude successfully', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockRefinedResponse),
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      const result = await refineCode(
        mockExistingFiles,
        mockUserFeedback,
        mockConversationHistory
      );

      expect(result).toEqual(mockRefinedResponse);
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalled();
    });

    it('should include conversation history in refinement', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockRefinedResponse),
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      await refineCode(mockExistingFiles, mockUserFeedback, mockConversationHistory);

      const callArgs = mockAnthropicInstance.messages.create.mock.calls[0][0];
      const messages = callArgs.messages;

      // Should include all conversation history plus the new refinement request
      expect(messages.length).toBe(mockConversationHistory.length + 1);
    });

    it('should fallback to GPT when Claude fails for refinement', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('Claude failed')),
        },
      };

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockRefinedResponse),
                  },
                },
              ],
            }),
          },
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      const result = await refineCode(
        mockExistingFiles,
        mockUserFeedback,
        mockConversationHistory
      );

      expect(result).toEqual(mockRefinedResponse);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalled();
    });

    it('should include existing files in refinement prompt', async () => {
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockRefinedResponse),
              },
            ],
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
        () => mockAnthropicInstance as any
      );

      await refineCode(mockExistingFiles, mockUserFeedback, mockConversationHistory);

      const callArgs = mockAnthropicInstance.messages.create.mock.calls[0][0];
      const lastMessage = callArgs.messages[callArgs.messages.length - 1];

      expect(lastMessage.content).toContain('app/page.tsx');
      expect(lastMessage.content).toContain(mockUserFeedback);
    });
  });
});
