import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DeploymentService } from '@/lib/services/deploymentService';
import crypto from 'crypto';

// GET - Fetch domains for a project
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

    // Fetch custom domains
    const { data: domains, error: domainsError } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (domainsError) {
      throw domainsError;
    }

    return NextResponse.json({
      success: true,
      domains: domains || [],
    });
  } catch (error: any) {
    console.error('Error fetching domains:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}

// POST - Add a new custom domain
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
    const { projectId, domain } = body;

    if (!projectId || !domain) {
      return NextResponse.json(
        { error: 'Project ID and domain are required' },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
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

    // Check if project is deployed
    if (!project.vercel_project_id) {
      return NextResponse.json(
        { error: 'Project must be deployed before adding a custom domain' },
        { status: 400 }
      );
    }

    // Check if domain already exists
    const { data: existingDomain } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('domain', domain)
      .single();

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already in use' },
        { status: 409 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Add domain to Vercel
    const deploymentService = new DeploymentService();
    const addDomainResult = await deploymentService.addCustomDomain(
      project.vercel_project_id,
      domain
    );

    if (!addDomainResult.success) {
      return NextResponse.json(
        { error: addDomainResult.error || 'Failed to add domain to Vercel' },
        { status: 500 }
      );
    }

    // Get DNS configuration
    const dnsConfig = await deploymentService.getDomainConfig(
      project.vercel_project_id,
      domain
    );

    // Create domain record in database
    const { data: newDomain, error: insertError } = await supabase
      .from('custom_domains')
      .insert({
        project_id: projectId,
        domain,
        verified: false,
        verification_token: verificationToken,
        dns_records: dnsConfig,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      domain: newDomain,
      dnsRecords: dnsConfig,
      verificationToken,
    });
  } catch (error: any) {
    console.error('Error adding domain:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add domain' },
      { status: 500 }
    );
  }
}

// PATCH - Verify a custom domain
export async function PATCH(request: Request) {
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
    const { domainId } = body;

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Fetch domain details
    const { data: customDomain, error: domainError } = await supabase
      .from('custom_domains')
      .select('*, projects!inner(user_id, vercel_project_id)')
      .eq('id', domainId)
      .single();

    if (domainError || !customDomain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if ((customDomain.projects as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const vercelProjectId = (customDomain.projects as any).vercel_project_id;

    if (!vercelProjectId) {
      return NextResponse.json(
        { error: 'Project not deployed to Vercel' },
        { status: 400 }
      );
    }

    // Verify domain with Vercel
    const deploymentService = new DeploymentService();
    const verifyResult = await deploymentService.verifyCustomDomain(
      vercelProjectId,
      customDomain.domain
    );

    if (verifyResult.verified) {
      // Update domain status
      await supabase
        .from('custom_domains')
        .update({
          verified: true,
          status: 'active',
          verified_at: new Date().toISOString(),
        })
        .eq('id', domainId);

      // Update project custom_domain field
      await supabase
        .from('projects')
        .update({
          custom_domain: customDomain.domain,
          custom_domain_verified: true,
        })
        .eq('id', customDomain.project_id);

      return NextResponse.json({
        success: true,
        verified: true,
      });
    } else {
      // Update status to verifying
      await supabase
        .from('custom_domains')
        .update({
          status: 'verifying',
        })
        .eq('id', domainId);

      return NextResponse.json({
        success: false,
        verified: false,
        error: verifyResult.error || 'Domain not yet verified',
      });
    }
  } catch (error: any) {
    console.error('Error verifying domain:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify domain' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a custom domain
export async function DELETE(request: Request) {
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
    const domainId = searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Fetch domain details
    const { data: customDomain, error: domainError } = await supabase
      .from('custom_domains')
      .select('*, projects!inner(user_id, vercel_project_id)')
      .eq('id', domainId)
      .single();

    if (domainError || !customDomain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if ((customDomain.projects as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const vercelProjectId = (customDomain.projects as any).vercel_project_id;

    // Remove from Vercel if project is deployed
    if (vercelProjectId) {
      const deploymentService = new DeploymentService();
      await deploymentService.removeCustomDomain(
        vercelProjectId,
        customDomain.domain
      );
    }

    // Delete from database
    await supabase.from('custom_domains').delete().eq('id', domainId);

    // Update project if this was the active custom domain
    await supabase
      .from('projects')
      .update({
        custom_domain: null,
        custom_domain_verified: false,
      })
      .eq('id', customDomain.project_id)
      .eq('custom_domain', customDomain.domain);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error deleting domain:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete domain' },
      { status: 500 }
    );
  }
}
