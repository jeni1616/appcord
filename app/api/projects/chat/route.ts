import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { refineCode } from '@/lib/services/codeGenerator';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, message } = body;

    if (!projectId || !message) {
      return NextResponse.json(
        { error: 'Project ID and message are required' },
        { status: 400 }
      );
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check user tokens
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tokens_remaining, tokens_used')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const estimatedTokens = 3000; // Estimated tokens for chat iteration

    if (userData.tokens_remaining < estimatedTokens) {
      return NextResponse.json(
        { error: 'Insufficient tokens. Please upgrade your plan.' },
        { status: 402 }
      );
    }

    // Fetch existing files
    const { data: existingFiles, error: filesError } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);

    if (filesError || !existingFiles || existingFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files found. Please generate code first.' },
        { status: 404 }
      );
    }

    // Fetch chat history
    const { data: chatHistory, error: chatError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(20); // Last 20 messages for context

    if (chatError) {
      console.error('Error fetching chat history:', chatError);
    }

    // Convert to conversation history format
    const conversationHistory =
      chatHistory?.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) || [];

    // Save user message
    await supabase.from('chat_messages').insert({
      project_id: projectId,
      user_id: user.id,
      role: 'user',
      content: message,
      tokens_used: 0,
    });

    // Refine code based on user feedback
    const files = existingFiles.map((file) => ({
      path: file.file_path,
      content: file.file_content,
      type: file.file_type as any,
    }));

    const refinedCode = await refineCode(files, message, conversationHistory);

    // Update files in database
    // Delete old files
    await supabase.from('project_files').delete().eq('project_id', projectId);

    // Insert updated files
    await supabase.from('project_files').insert(
      refinedCode.files.map((file) => ({
        project_id: projectId,
        file_path: file.path,
        file_content: file.content,
        file_type: file.type,
      }))
    );

    // Update project metadata if dependencies or env vars changed
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (refinedCode.dependencies) {
      updateData.dependencies = refinedCode.dependencies;
    }

    if (refinedCode.envVariables) {
      updateData.env_variables = refinedCode.envVariables;
    }

    await supabase.from('projects').update(updateData).eq('id', projectId);

    // Create AI response message
    const aiResponse = `I've updated your project based on your feedback. Here's what I changed:\n\n${refinedCode.structure}`;

    await supabase.from('chat_messages').insert({
      project_id: projectId,
      user_id: user.id,
      role: 'assistant',
      content: aiResponse,
      tokens_used: estimatedTokens,
    });

    // Update user tokens
    await supabase
      .from('users')
      .update({
        tokens_remaining: userData.tokens_remaining - estimatedTokens,
        tokens_used: userData.tokens_used + estimatedTokens,
      })
      .eq('id', user.id);

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action_type: 'chat_iteration',
      tokens_used: estimatedTokens,
      ai_model: 'claude-sonnet-4-20250514',
    });

    // Create iteration record
    await supabase.from('iterations').insert({
      project_id: projectId,
      user_prompt: message,
      ai_response: aiResponse,
      changes_made: { filesUpdated: refinedCode.files.length },
      tokens_used: estimatedTokens,
      status: 'completed',
    });

    return NextResponse.json({
      success: true,
      response: aiResponse,
      filesUpdated: refinedCode.files.length,
      tokensUsed: estimatedTokens,
      tokensRemaining: userData.tokens_remaining - estimatedTokens,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch chat history
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch chat messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
    });
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
