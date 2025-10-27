import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DeploymentService } from '@/lib/services/deploymentService';

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

    // Check if project has generated code
    if (project.status !== 'ready' && project.status !== 'deployed') {
      return NextResponse.json(
        { error: 'Project must be built before deployment' },
        { status: 400 }
      );
    }

    // Fetch generated files
    const { data: files, error: filesError } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);

    if (filesError || !files || files.length === 0) {
      return NextResponse.json(
        { error: 'No generated files found for this project' },
        { status: 404 }
      );
    }

    // Prepare files for deployment
    const deploymentFiles = files.map((file) => ({
      path: file.file_path,
      content: file.file_content,
    }));

    // Convert env_variables array to object
    const envVars: Record<string, string> = {};
    if (project.env_variables && Array.isArray(project.env_variables)) {
      project.env_variables.forEach((envVar: string) => {
        // For now, we just mark them as needed - user would set actual values
        envVars[envVar] = `<${envVar}_VALUE>`;
      });
    }

    // Create deployment
    const deploymentService = new DeploymentService();
    const deploymentResult = await deploymentService.deployToVercel(
      project.name,
      deploymentFiles,
      envVars
    );

    if (!deploymentResult.success) {
      return NextResponse.json(
        { error: deploymentResult.error || 'Deployment failed' },
        { status: 500 }
      );
    }

    // Update project with deployment info
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        status: 'deployed',
        preview_url: deploymentResult.previewUrl,
        production_url: deploymentResult.productionUrl,
        vercel_project_id: deploymentResult.deploymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project:', updateError);
    }

    // Create deployment record
    const { data: build } = await supabase
      .from('builds')
      .select('id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    await supabase.from('deployments').insert({
      project_id: projectId,
      build_id: build?.id,
      environment: 'preview',
      url: deploymentResult.previewUrl!,
      deploy_status: 'deployed',
      deployed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      previewUrl: deploymentResult.previewUrl,
      productionUrl: deploymentResult.productionUrl,
    });
  } catch (error: any) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deploy project' },
      { status: 500 }
    );
  }
}
