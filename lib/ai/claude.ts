import Anthropic from '@anthropic-ai/sdk'
import { getServerEnv } from '@/lib/config/env'

const serverEnv = getServerEnv()

const anthropic = new Anthropic({
  apiKey: serverEnv.ai.anthropicApiKey,
})

export async function generateScopeWithClaude(prompt: string) {
  try {
    const message = await anthropic.messages.create({
      model: serverEnv.ai.anthropicModel,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
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
}

User's project description:
${prompt}`
        }
      ],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      // Extract JSON from the response (in case Claude adds explanation)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return JSON.parse(content.text)
    }

    throw new Error('Unexpected response format from Claude')
  } catch (error) {
    console.error('Error generating scope with Claude:', error)
    throw error
  }
}

export async function refineScopeWithClaude(originalScope: any, userFeedback: string) {
  try {
    const message = await anthropic.messages.create({
      model: serverEnv.ai.anthropicModel,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are refining a project scope based on user feedback.

Original scope:
${JSON.stringify(originalScope, null, 2)}

User feedback:
${userFeedback}

Update the scope to incorporate the user's feedback. Return the updated scope in the same JSON format.`
        }
      ],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return JSON.parse(content.text)
    }

    throw new Error('Unexpected response format from Claude')
  } catch (error) {
    console.error('Error refining scope with Claude:', error)
    throw error
  }
}
