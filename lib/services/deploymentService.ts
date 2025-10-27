interface VercelDeployment {
  id: string;
  url: string;
  status: string;
  readyState: string;
}

interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  previewUrl?: string;
  productionUrl?: string;
  error?: string;
}

export class DeploymentService {
  private vercelToken: string;
  private vercelTeamId?: string;

  constructor() {
    this.vercelToken = process.env.VERCEL_TOKEN || '';
    this.vercelTeamId = process.env.VERCEL_TEAM_ID;
  }

  /**
   * Deploy project to Vercel
   */
  async deployToVercel(
    projectName: string,
    files: Array<{ path: string; content: string }>,
    envVars?: Record<string, string>
  ): Promise<DeploymentResult> {
    try {
      if (!this.vercelToken) {
        throw new Error('VERCEL_TOKEN environment variable not set');
      }

      // Create a sanitized project name for Vercel
      const sanitizedName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);

      // Check if project exists, create if not
      let vercelProjectId;
      try {
        const existingProject = await this.getVercelProject(sanitizedName);
        vercelProjectId = existingProject.id;
      } catch {
        const newProject = await this.createVercelProject(sanitizedName, envVars);
        vercelProjectId = newProject.id;
      }

      // Prepare files for deployment
      const deploymentFiles = files.map((file) => ({
        file: file.path,
        data: file.content,
      }));

      // Create deployment
      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.vercelToken}`,
          'Content-Type': 'application/json',
          ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
        },
        body: JSON.stringify({
          name: sanitizedName,
          project: vercelProjectId,
          files: deploymentFiles,
          target: 'preview',
          gitSource: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Vercel deployment failed: ${errorData.error?.message || response.statusText}`
        );
      }

      const deployment: VercelDeployment = await response.json();

      // Wait for deployment to be ready
      const readyDeployment = await this.waitForDeployment(deployment.id);

      return {
        success: true,
        deploymentId: readyDeployment.id,
        previewUrl: `https://${readyDeployment.url}`,
        productionUrl: `https://${sanitizedName}.vercel.app`,
      };
    } catch (error: any) {
      console.error('Deployment error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get Vercel project by name
   */
  private async getVercelProject(projectName: string) {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${projectName}`,
      {
        headers: {
          Authorization: `Bearer ${this.vercelToken}`,
          ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
        },
      }
    );

    if (!response.ok) {
      throw new Error('Project not found');
    }

    return await response.json();
  }

  /**
   * Create new Vercel project
   */
  private async createVercelProject(
    projectName: string,
    envVars?: Record<string, string>
  ) {
    const environmentVariables = envVars
      ? Object.entries(envVars).map(([key, value]) => ({
          key,
          value,
          type: 'encrypted',
          target: ['preview', 'production'],
        }))
      : [];

    const response = await fetch('https://api.vercel.com/v10/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.vercelToken}`,
        'Content-Type': 'application/json',
        ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
      },
      body: JSON.stringify({
        name: projectName,
        framework: 'nextjs',
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
        environmentVariables,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to create Vercel project: ${errorData.error?.message || response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Wait for deployment to be ready
   */
  private async waitForDeployment(
    deploymentId: string,
    maxAttempts = 60,
    interval = 5000
  ): Promise<VercelDeployment> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.vercelToken}`,
            ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check deployment status');
      }

      const deployment: VercelDeployment = await response.json();

      if (deployment.readyState === 'READY') {
        return deployment;
      }

      if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') {
        throw new Error(`Deployment failed with state: ${deployment.readyState}`);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('Deployment timeout - took too long to complete');
  }

  /**
   * Add custom domain to Vercel project
   */
  async addCustomDomain(
    vercelProjectId: string,
    domain: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.vercelToken}`,
            'Content-Type': 'application/json',
            ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
          },
          body: JSON.stringify({
            name: domain,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to add domain');
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify custom domain
   */
  async verifyCustomDomain(
    vercelProjectId: string,
    domain: string
  ): Promise<{ verified: boolean; error?: string }> {
    try {
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}/verify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.vercelToken}`,
            ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { verified: false, error: errorData.error?.message };
      }

      const data = await response.json();
      return { verified: data.verified || false };
    } catch (error: any) {
      return { verified: false, error: error.message };
    }
  }

  /**
   * Get domain configuration (DNS records needed)
   */
  async getDomainConfig(vercelProjectId: string, domain: string) {
    try {
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}/config`,
        {
          headers: {
            Authorization: `Bearer ${this.vercelToken}`,
            ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get domain config');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error getting domain config:', error);
      return null;
    }
  }

  /**
   * Remove custom domain
   */
  async removeCustomDomain(
    vercelProjectId: string,
    domain: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.vercelToken}`,
            ...(this.vercelTeamId && { 'X-Vercel-Team-Id': this.vercelTeamId }),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to remove domain');
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
