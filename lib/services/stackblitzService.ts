import sdk from '@stackblitz/sdk';

export interface StackBlitzProject {
  files: Record<string, string>;
  title: string;
  description: string;
  template: 'node' | 'create-react-app' | 'angular-cli' | 'html' | 'javascript' | 'typescript' | 'polymer' | 'vue';
}

export class StackBlitzService {
  /**
   * Prepare project files for StackBlitz
   */
  prepareProject(
    projectName: string,
    projectDescription: string,
    files: Array<{ path: string; content: string }>
  ): StackBlitzProject {
    // Convert files array to StackBlitz format
    const projectFiles: Record<string, string> = {};

    files.forEach((file) => {
      projectFiles[file.path] = file.content;
    });

    // Determine template based on files present
    const template = this.detectTemplate(files);

    return {
      files: projectFiles,
      title: projectName,
      description: projectDescription,
      template,
    };
  }

  /**
   * Detect the appropriate StackBlitz template based on project files
   */
  private detectTemplate(files: Array<{ path: string; content: string }>): StackBlitzProject['template'] {
    const hasFile = (fileName: string) =>
      files.some(f => f.path.includes(fileName));

    // Check for Next.js
    if (hasFile('next.config')) {
      return 'node';
    }

    // Check for React
    if (hasFile('package.json')) {
      const packageJson = files.find(f => f.path.includes('package.json'));
      if (packageJson) {
        const content = packageJson.content;
        if (content.includes('react')) {
          return 'create-react-app';
        }
        if (content.includes('vue')) {
          return 'vue';
        }
        if (content.includes('angular')) {
          return 'angular-cli';
        }
        // Default to node for other npm projects
        return 'node';
      }
    }

    // Check for TypeScript
    if (hasFile('tsconfig.json')) {
      return 'typescript';
    }

    // Check for HTML
    if (hasFile('index.html')) {
      return 'html';
    }

    // Default to JavaScript
    return 'javascript';
  }

  /**
   * Embed StackBlitz project in a container
   * This method is meant to be called from the client side
   */
  static async embedProject(
    elementId: string,
    project: StackBlitzProject,
    options?: {
      openFile?: string;
      height?: number;
      hideNavigation?: boolean;
      hideDevTools?: boolean;
      forceEmbedLayout?: boolean;
    }
  ): Promise<any> {
    const embedOptions = {
      openFile: options?.openFile || 'index.html',
      height: options?.height || 600,
      hideNavigation: options?.hideNavigation ?? false,
      hideDevTools: options?.hideDevTools ?? false,
      forceEmbedLayout: options?.forceEmbedLayout ?? true,
      clickToLoad: false,
      view: 'preview' as const,
      theme: 'light' as const,
    };

    return sdk.embedProject(elementId, project, embedOptions);
  }

  /**
   * Open StackBlitz project in a new window
   * This method is meant to be called from the client side
   */
  static async openProject(
    project: StackBlitzProject,
    options?: {
      openFile?: string;
      newWindow?: boolean;
    }
  ): Promise<any> {
    const openOptions = {
      openFile: options?.openFile || 'index.html',
      newWindow: options?.newWindow ?? true,
    };

    return sdk.openProject(project, openOptions);
  }
}
