"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase/client"
import { Project } from "@/types"
import { CustomDomainManager } from "@/components/CustomDomainManager"

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
  const [isDeploying, setIsDeploying] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  useEffect(() => {
    fetchProject()
    fetchChatHistory()
  }, [projectId])

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
      } else {
        alert(`Build failed: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Build error: ${error.message}`)
    } finally {
      setIsBuilding(false)
    }
  }

  const handleDeploy = async () => {
    if (!project) return

    setIsDeploying(true)
    try {
      const response = await fetch('/api/projects/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`Deployment successful!\nPreview: ${data.previewUrl}`)
        await fetchProject()
      } else {
        alert(`Deployment failed: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Deployment error: ${error.message}`)
    } finally {
      setIsDeploying(false)
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

        // Refresh project to get updated files
        await fetchProject()
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
                <Button onClick={handleDeploy} disabled={isDeploying}>
                  {isDeploying ? 'Deploying...' : project.status === 'deployed' ? 'Redeploy' : 'Deploy'}
                </Button>
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
            Deploy
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
                  <CardTitle>Live Preview</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant={iframeView === 'desktop' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIframeView('desktop')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </Button>
                    <Button
                      variant={iframeView === 'mobile' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIframeView('mobile')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`bg-gray-100 rounded-lg overflow-hidden ${iframeView === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
                  <div className="aspect-video bg-white flex items-center justify-center">
                    {project.preview_url ? (
                      <iframe
                        src={project.preview_url}
                        className="w-full h-full"
                        title="App Preview"
                      />
                    ) : (
                      <div className="text-center p-8">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        <p className="text-gray-600">Preview not available yet</p>
                      </div>
                    )}
                  </div>
                </div>
                {project.preview_url && (
                  <div className="mt-4">
                    <a
                      href={project.preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      🔗 Open in new tab
                    </a>
                  </div>
                )}
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

            {/* Custom Domain Management */}
            <CustomDomainManager projectId={projectId} projectStatus={project.status} />
          </div>
        </div>
      </div>
    </div>
  )
}
