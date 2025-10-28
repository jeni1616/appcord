import OpenAI from 'openai'
import { getServerEnv } from '@/lib/config/env'

const serverEnv = getServerEnv()

const openai = new OpenAI({
  apiKey: serverEnv.ai.openaiApiKey,
})

export async function generateScopeWithGPT(prompt: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: serverEnv.ai.openaiModel,
      messages: [
        {
          role: "system",
          content: `You are an expert web application architect. Given a user's project description, expand it into a comprehensive project scope with detailed features and a structured todo list.

Your response MUST be in this exact JSON format:
{
  "expandedDescription": "A comprehensive 200-400 word description...",
  "appType": "landing_page|saas|internal_tool|ecommerce|cms|social|productivity",
  "complexity": "simple|moderate|complex",
  "estimatedTokens": 5000,
  "techStack": ["Next.js 16", "TypeScript", "Tailwind CSS", "Supabase", "shadcn/ui"],
  "todoCategories": [
    {
      "name": "Project Setup",
      "items": [
        { "title": "Initialize Next.js 16 project", "checked": true },
        { "title": "Configure Tailwind CSS", "checked": true }
      ]
    }
  ]
}`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const response = completion.choices[0].message.content
    return JSON.parse(response || '{}')
  } catch (error) {
    console.error('Error generating scope with GPT:', error)
    throw error
  }
}

export async function generateCodeWithGPT(prompt: string, context: any) {
  try {
    const completion = await openai.chat.completions.create({
      model: serverEnv.ai.openaiModel,
      messages: [
        {
          role: "system",
          content: "You are an expert full-stack developer. Generate clean, production-ready code based on the project requirements."
        },
        {
          role: "user",
          content: `Generate code for: ${prompt}\n\nContext: ${JSON.stringify(context)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 4000,
    })

    return completion.choices[0].message.content
  } catch (error) {
    console.error('Error generating code with GPT:', error)
    throw error
  }
}
