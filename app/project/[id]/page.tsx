"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase/client"
import { Project } from "@/types"
import sdk from '@stackblitz/sdk'
import type { Project as StackBlitzProject } from '@stackblitz/sdk'

export default function ProjectViewPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatMessage, setChatMessage] = useState("")
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [iframeView, setIframeView] = useState<'desktop' | 'mobile'>('desktop')
  const [isBuilding, setIsBuilding] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [projectFiles, setProjectFiles] = useState<Array<{ path: string; content: string }>>([])
  const stackblitzContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProject()
    fetchChatHistory()
    fetchProjectFiles()
  }, [projectId])

  // Load StackBlitz preview when files are available
  useEffect(() => {
    if (projectFiles.length > 0 && stackblitzContainerRef.current && project?.status === 'ready' || project?.status === 'deployed') {
      loadStackBlitzPreview()
    }
  }, [projectFiles, project?.status])

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error) {
      console.error('Error fetching project:', error)
      router.push('/dashboard')
      return
    }

    setProject(data)
    setLoading(false)
  }

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`/api/projects/chat?projectId=${projectId}`)
      const data = await response.json()

      if (data.success) {
        setChatMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
    }
  }

  const fetchProjectFiles = async () => {
    try {
      const { data: files, error } = await supabase
        .from('project_files')
        .select('file_path, file_content')
        .eq('project_id', projectId)

      if (error) {
        console.error('Error fetching project files:', error)
        return
      }

      if (files && files.length > 0) {
        const formattedFiles = files.map((file) => ({
          path: file.file_path,
          content: file.file_content,
        }))
        setProjectFiles(formattedFiles)
      }
    } catch (error) {
      console.error('Error fetching project files:', error)
    }
  }

  const loadStackBlitzPreview = async () => {
    if (!project || !stackblitzContainerRef.current || projectFiles.length === 0) return

    setIsLoadingPreview(true)
    try {
      // Prepare files for StackBlitz
      const filesObject: Record<string, string> = {}
      projectFiles.forEach((file) => {
        filesObject[file.path] = file.content
      })

      // Determine template
      const hasPackageJson = projectFiles.some(f => f.path.includes('package.json'))
      const hasNextConfig = projectFiles.some(f => f.path.includes('next.config'))

      let template: StackBlitzProject['template'] = 'html'
      if (hasNextConfig) {
        template = 'node'
      } else if (hasPackageJson) {
        const packageFile = projectFiles.find(f => f.path.includes('package.json'))
        if (packageFile?.content.includes('react')) {
          template = 'create-react-app'
        } else {
          template = 'node'
        }
      }

      const stackblitzProject: StackBlitzProject = {
        files: filesObject,
        title: project.name,
        description: project.description || '',
        template: template,
      }

      // Clear the container first
      stackblitzContainerRef.current.innerHTML = ''

      // Embed the project
      await sdk.embedProject(
        stackblitzContainerRef.current,
        stackblitzProject,
        {
          openFile: 'index.html',
          view: 'preview',
          height: 600,
          hideNavigation: true,
          forceEmbedLayout: true,
        }
      )
    } catch (error) {
      console.error('Error loading StackBlitz preview:', error)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const openInStackBlitz = async () => {
    if (!project || projectFiles.length === 0) return

    try {
      const filesObject: Record<string, string> = {}
      projectFiles.forEach((file) => {
        filesObject[file.path] = file.content
      })

      const hasPackageJson = projectFiles.some(f => f.path.includes('package.json'))
      const hasNextConfig = projectFiles.some(f => f.path.includes('next.config'))

      let template: StackBlitzProject['template'] = 'html'
      if (hasNextConfig) {
        template = 'node'
      } else if (hasPackageJson) {
        const packageFile = projectFiles.find(f => f.path.includes('package.json'))
        if (packageFile?.content.includes('react')) {
          template = 'create-react-app'
        } else {
          template = 'node'
        }
      }

      const stackblitzProject: StackBlitzProject = {
        files: filesObject,
        title: project.name,
        description: project.description || '',
        template: template,
      }

      await sdk.openProject(stackblitzProject, {
        openFile: 'index.html',
        newWindow: true,
      })
    } catch (error) {
      console.error('Error opening in StackBlitz:', error)
      alert('Failed to open in StackBlitz')
    }
  }

  const handleBuild = async () => {
    if (!project) return

    setIsBuilding(true)
    try {
      const response = await fetch('/api/projects/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`Build successful! Generated ${data.filesCount} files.`)
        await fetchProject()
        await fetchProjectFiles() // Refresh files for StackBlitz
      } else {
        alert(`Build failed: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Build error: ${error.message}`)
    } finally {
      setIsBuilding(false)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim() || isSendingMessage) return

    const userMessage = chatMessage
    setChatMessage("")
    setIsSendingMessage(true)

    // Add user message to UI immediately
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }])

    try {
      const response = await fetch('/api/projects/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: userMessage,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Add AI response to UI
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          created_at: new Date().toISOString(),
        }])

        // Refresh project and files to update preview
        await fetchProject()
        await fetchProjectFiles()
      } else {
        alert(`Chat error: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Error sending message: ${error.message}`)
    } finally {
      setIsSendingMessage(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading project...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Project not found</p>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'deployed':
        return 'bg-green-100 text-green-800'
      case 'building':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-xl font-bold">AppCord</span>
          </Link>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Project Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <div className="flex items-center space-x-3">
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
              {project.status === 'draft' && (
                <Button onClick={handleBuild} disabled={isBuilding}>
                  {isBuilding ? 'Building...' : 'Build App'}
                </Button>
              )}
              {(project.status === 'ready' || project.status === 'deployed') && (
                <>
                  <Button onClick={handleBuild} disabled={isBuilding} variant="outline">
                    {isBuilding ? 'Rebuilding...' : 'Rebuild'}
                  </Button>
                  <Button onClick={openInStackBlitz} disabled={projectFiles.length === 0}>
                    Open in StackBlitz
                  </Button>
                </>
              )}
            </div>
          </div>
          <p className="text-gray-600">{project.description}</p>
        </div>

        {/* Action Tabs */}
        <div className="flex space-x-2 mb-6 border-b">
          <button className="px-4 py-2 font-medium border-b-2 border-blue-600 text-blue-600">
            Preview
          </button>
          <button className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900">
            Code
          </button>
          <button className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900">
            Share
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Preview Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Live Preview - StackBlitz WebContainer</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadStackBlitzPreview()}
                      disabled={projectFiles.length === 0 || isLoadingPreview}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  {projectFiles.length > 0 ? (
                    <div
                      ref={stackblitzContainerRef}
                      className="w-full bg-white"
                      style={{ minHeight: '600px' }}
                    >
                      {isLoadingPreview && (
                        <div className="flex items-center justify-center h-96">
                          <div className="text-center">
                            <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-gray-600">Loading preview...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-8 h-96 flex items-center justify-center">
                      <div>
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        <p className="text-gray-600 mb-2">Build your app to see the preview</p>
                        {project.status === 'draft' && (
                          <Button onClick={handleBuild} disabled={isBuilding} size="sm">
                            {isBuilding ? 'Building...' : 'Build Now'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Chat with AI */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">💬 Chat with AI</CardTitle>
                <CardDescription>Make changes to your app</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Chat History */}
                  {chatMessages.length > 0 && (
                    <div className="max-h-64 overflow-y-auto space-y-2 mb-3 p-2 bg-gray-50 rounded">
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`text-sm p-2 rounded ${
                            msg.role === 'user'
                              ? 'bg-blue-100 text-blue-900 ml-4'
                              : 'bg-gray-200 text-gray-900 mr-4'
                          }`}
                        >
                          <div className="font-semibold text-xs mb-1">
                            {msg.role === 'user' ? 'You' : 'AI'}
                          </div>
                          <div>{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chat Input */}
                  <form onSubmit={handleChatSubmit} className="space-y-3">
                    <Textarea
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="e.g., Make the header blue..."
                      rows={4}
                      disabled={isSendingMessage || project.status === 'draft'}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      size="sm"
                      disabled={isSendingMessage || project.status === 'draft'}
                    >
                      {isSendingMessage ? 'Sending...' : 'Send'}
                    </Button>
                    {project.status === 'draft' && (
                      <p className="text-xs text-gray-500">
                        Build your app first to start chatting
                      </p>
                    )}
                  </form>
                </div>
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{project.app_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Complexity:</span>
                  <span className="font-medium capitalize">{project.complexity || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Credits Used:</span>
                  <span className="font-medium">{project.tokens_used.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Build:</span>
                  <span className="font-medium">
                    {project.last_build_at
                      ? new Date(project.last_build_at).toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            {project.tech_stack && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tech Stack</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(project.tech_stack as string[]).map((tech, index) => (
                      <Badge key={index} variant="secondary">{tech}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
