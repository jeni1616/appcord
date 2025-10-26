import { NextRequest, NextResponse } from 'next/server'
import { generateScopeWithClaude } from '@/lib/ai/claude'
import { generateScopeWithGPT } from '@/lib/ai/openai'

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json()

    if (!description || description.length < 50) {
      return NextResponse.json(
        { error: 'Description must be at least 50 characters' },
        { status: 400 }
      )
    }

    // Try Claude first, fall back to GPT if Claude fails
    let scope
    try {
      scope = await generateScopeWithClaude(description)
    } catch (error) {
      console.log('Claude failed, falling back to GPT')
      scope = await generateScopeWithGPT(description)
    }

    return NextResponse.json(scope)
  } catch (error: any) {
    console.error('Error generating scope:', error)
    return NextResponse.json(
      { error: 'Failed to generate project scope' },
      { status: 500 }
    )
  }
}
