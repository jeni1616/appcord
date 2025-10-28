import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/config/env';

const openai = new OpenAI({
  apiKey: env.ai.openaiApiKey,
});

const anthropic = new Anthropic({
  apiKey: env.ai.anthropicApiKey,
});

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'component' | 'page' | 'api' | 'config' | 'style' | 'type';
}

export interface CodeGenerationResult {
  files: GeneratedFile[];
  structure: string;
  dependencies: Record<string, string>;
  envVariables: string[];
}

const CODE_GENERATION_SYSTEM_PROMPT = `You are an expert full-stack developer specializing in Next.js 16, TypeScript, React 19, Tailwind CSS, and Supabase.

Your task is to generate complete, production-ready code for web applications based on project specifications.

IMPORTANT INSTRUCTIONS:
1. Generate COMPLETE, working code - not pseudocode or examples
2. Follow Next.js 16 App Router conventions
3. Use TypeScript with proper types
4. Use Tailwind CSS for styling
5. Use shadcn/ui components where appropriate
6. Implement Supabase for backend/database
7. Include proper error handling and loading states
8. Add TypeScript types for all data structures
9. Make code responsive and accessible
10. Return a JSON object with this exact structure:

{
  "files": [
    {
      "path": "app/page.tsx",
      "content": "actual file content here",
      "type": "page"
    }
  ],
  "structure": "Brief explanation of the project structure",
  "dependencies": {
    "package-name": "version"
  },
  "envVariables": ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_KEY"]
}

File types: 'component' | 'page' | 'api' | 'config' | 'style' | 'type'

Generate a complete, deployable Next.js application.`;

export async function generateProjectCode(
  projectName: string,
  expandedDescription: string,
  todoList: any,
  techStack: string[],
  appType: string
): Promise<CodeGenerationResult> {
  const prompt = `Generate a complete Next.js 16 application with the following specifications:

PROJECT NAME: ${projectName}

DESCRIPTION:
${expandedDescription}

APP TYPE: ${appType}

TECHNOLOGY STACK:
${techStack.join(', ')}

TODO LIST (Features to implement):
${JSON.stringify(todoList, null, 2)}

Generate all necessary files including:
1. Pages (app directory structure)
2. Components (reusable UI components)
3. API routes if needed
4. Type definitions
5. Configuration files (next.config.js, tailwind.config.ts, tsconfig.json)
6. Package.json with all dependencies
7. Supabase schema/migrations if database is needed
8. README.md with setup instructions

Return the complete response as a JSON object matching the specified structure.`;

  try {
    // Try Claude first for better code quality
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: CODE_GENERATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = claudeResponse.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result;
      }
    }

    throw new Error('Failed to parse Claude response');
  } catch (claudeError) {
    console.error('Claude code generation failed, falling back to GPT:', claudeError);

    // Fallback to GPT-4o
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: CODE_GENERATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent code
      max_tokens: 16000,
    });

    const responseText = gptResponse.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse GPT response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result;
  }
}

export async function refineCode(
  existingFiles: GeneratedFile[],
  userFeedback: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<CodeGenerationResult> {
  const prompt = `The user wants to refine the following application code:

CURRENT FILES:
${JSON.stringify(existingFiles, null, 2)}

USER FEEDBACK:
${userFeedback}

Update the necessary files based on the user's feedback. Return the complete updated file structure as JSON.`;

  const messages = [
    ...conversationHistory,
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    // Try Claude first
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: CODE_GENERATION_SYSTEM_PROMPT,
      messages: messages as any,
    });

    const content = claudeResponse.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result;
      }
    }

    throw new Error('Failed to parse Claude response');
  } catch (claudeError) {
    console.error('Claude refinement failed, falling back to GPT:', claudeError);

    // Fallback to GPT-4o
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: CODE_GENERATION_SYSTEM_PROMPT,
        },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 16000,
    });

    const responseText = gptResponse.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse GPT response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result;
  }
}
