// Import shims before SDK to avoid fetch errors
import 'openai/shims/node';

import { generateScopeWithGPT, generateCodeWithGPT } from '@/lib/ai/openai';
import OpenAI from 'openai';

jest.mock('openai');

describe('OpenAI Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateScopeWithGPT', () => {
    const mockPrompt = 'Create an e-commerce platform';

    const mockValidScope = {
      expandedDescription: 'A full-featured e-commerce platform with product listings, shopping cart, and checkout.',
      appType: 'ecommerce',
      complexity: 'complex',
      estimatedTokens: 8000,
      techStack: ['Next.js 16', 'TypeScript', 'Tailwind CSS', 'Supabase', 'shadcn/ui', 'Stripe'],
      todoCategories: [
        {
          name: 'Project Setup',
          items: [
            { title: 'Initialize Next.js 16 project', checked: true },
          ],
        },
        {
          name: 'Product Management',
          items: [
            { title: 'Create product listing page', checked: false },
            { title: 'Implement product search', checked: false },
          ],
        },
      ],
    };

    it('should generate scope successfully with GPT-4o', async () => {
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockValidScope),
                  },
                },
              ],
            }),
          },
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      const result = await generateScopeWithGPT(mockPrompt);

      expect(result).toEqual(mockValidScope);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 2000,
        })
      );
    });

    it('should use correct system and user messages', async () => {
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockValidScope),
                  },
                },
              ],
            }),
          },
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      await generateScopeWithGPT(mockPrompt);

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[1].role).toBe('user');
      expect(callArgs.messages[1].content).toBe(mockPrompt);
    });

    it('should throw error when OpenAI API fails', async () => {
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('OpenAI API error')),
          },
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      await expect(generateScopeWithGPT(mockPrompt)).rejects.toThrow('OpenAI API error');
    });

    it('should return empty object for invalid JSON', async () => {
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'invalid json',
                  },
                },
              ],
            }),
          },
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      await expect(generateScopeWithGPT(mockPrompt)).rejects.toThrow();
    });

    it('should handle null response content', async () => {
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: null,
                  },
                },
              ],
            }),
          },
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      const result = await generateScopeWithGPT(mockPrompt);
      expect(result).toEqual({});
    });
  });

  describe('generateCodeWithGPT', () => {
    const mockPrompt = 'Generate a login component';
    const mockContext = {
      projectName: 'Test App',
      techStack: ['React', 'TypeScript'],
    };

    const mockCodeResponse = `
import React from 'react';

export default function LoginComponent() {
  return (
    <div>
      <h1>Login</h1>
      <form>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
    `;

    it('should generate code successfully', async () => {
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: mockCodeResponse,
                  },
                },
              ],
            }),
          },
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      const result = await generateCodeWithGPT(mockPrompt, mockContext);

      expect(result).toBe(mockCodeResponse);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0.5,
          max_tokens: 4000,
        })
      );
    });

    it('should include context in the prompt', async () => {
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: mockCodeResponse,
                  },
                },
              ],
            }),
          },
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      await generateCodeWithGPT(mockPrompt, mockContext);

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;

      expect(userMessage).toContain(mockPrompt);
      expect(userMessage).toContain(JSON.stringify(mockContext));
    });

    it('should throw error when code generation fails', async () => {
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('Code generation failed')),
          },
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      await expect(generateCodeWithGPT(mockPrompt, mockContext)).rejects.toThrow('Code generation failed');
    });

    it('should use system prompt for code expert', async () => {
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: mockCodeResponse,
                  },
                },
              ],
            }),
          },
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockOpenAIInstance as any
      );

      await generateCodeWithGPT(mockPrompt, mockContext);

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[0].content).toContain('expert full-stack developer');
    });
  });
});
