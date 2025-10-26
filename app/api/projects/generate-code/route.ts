import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateProjectCode } from '@/lib/services/codeGenerator';

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
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
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

    // Check if user has enough tokens
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

    const estimatedTokens = 5000; // Estimated tokens for code generation

    if (userData.tokens_remaining < estimatedTokens) {
      return NextResponse.json(
        { error: 'Insufficient tokens. Please upgrade your plan.' },
        { status: 402 }
      );
    }

    // Update project status to 'building'
    await supabase
      .from('projects')
      .update({ status: 'building', updated_at: new Date().toISOString() })
      .eq('id', projectId);

    // Create a build record
    const { data: build, error: buildError } = await supabase
      .from('builds')
      .insert({
        project_id: projectId,
        status: 'running',
        ai_model_used: 'claude-sonnet-4-20250514',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (buildError) {
      console.error('Error creating build record:', buildError);
    }

    const buildId = build?.id;
    const startTime = Date.now();

    try {
      // Generate code using AI
      const codeResult = await generateProjectCode(
        project.name,
        project.expanded_description,
        project.todo_list,
        project.tech_stack,
        project.app_type
      );

      const endTime = Date.now();
      const buildTimeSeconds = Math.floor((endTime - startTime) / 1000);

      // Store generated files in database
      const { error: filesError } = await supabase.from('project_files').insert(
        codeResult.files.map((file) => ({
          project_id: projectId,
          file_path: file.path,
          file_content: file.content,
          file_type: file.type,
        }))
      );

      if (filesError) {
        console.error('Error storing files:', filesError);
      }

      // Update project with generated code metadata
      await supabase
        .from('projects')
        .update({
          status: 'ready',
          dependencies: codeResult.dependencies,
          env_variables: codeResult.envVariables,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      // Update build record
      if (buildId) {
        await supabase
          .from('builds')
          .update({
            status: 'success',
            build_time_seconds: buildTimeSeconds,
            tokens_consumed: estimatedTokens,
            completed_at: new Date().toISOString(),
          })
          .eq('id', buildId);
      }

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
        action_type: 'code_generation',
        tokens_used: estimatedTokens,
        ai_model: 'claude-sonnet-4-20250514',
      });

      return NextResponse.json({
        success: true,
        buildId,
        filesCount: codeResult.files.length,
        structure: codeResult.structure,
        buildTimeSeconds,
      });
    } catch (error: any) {
      // Update project status to 'failed'
      await supabase
        .from('projects')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', projectId);

      // Update build record
      if (buildId) {
        await supabase
          .from('builds')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', buildId);
      }

      throw error;
    }
  } catch (error: any) {
    console.error('Code generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate code' },
      { status: 500 }
    );
  }
}
