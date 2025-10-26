"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function NewProjectPage() {
  const router = useRouter()
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGenerateScope = async () => {
    if (description.length < 50) {
      setError("Please provide a more detailed description (at least 50 characters)")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/projects/generate-scope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate scope')
      }

      const data = await response.json()

      // Store the generated scope in session storage for the next step
      sessionStorage.setItem('projectScope', JSON.stringify(data))
      sessionStorage.setItem('originalPrompt', description)

      // Navigate to scope review page
      router.push('/project/new/review')
    } catch (error: any) {
      setError(error.message || 'Failed to generate project scope')
    } finally {
      setLoading(false)
    }
  }

  const examplePrompts = [
    "A task management app where teams can create projects, assign tasks, set deadlines, and track progress with a kanban board",
    "Customer feedback portal where users submit ideas, vote on features, and admins can respond and mark status",
    "Internal employee directory with profile pages, department filters, and search functionality"
  ]

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
          <Link href="/dashboard">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-600">Step 1 of 5</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-blue-600 rounded-full" style={{ width: '20%' }}></div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Describe Your App</CardTitle>
              <CardDescription>
                Tell us what you want to build. Be as detailed as possible about features, user roles, and key functionality.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Project Description
                </label>
                <Textarea
                  id="description"
                  placeholder="I want to build a..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500">
                  {description.length} / 2000 characters (minimum 50)
                </p>
              </div>

              {/* Example Prompts */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Example prompts:</p>
                <div className="space-y-2">
                  {examplePrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setDescription(prompt)}
                      className="w-full text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-md border transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for better results:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Be specific about the main features you need</li>
                  <li>• Mention different user roles (admin, user, guest, etc.)</li>
                  <li>• Describe key workflows and interactions</li>
                  <li>• Include any specific design or technical requirements</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <Link href="/dashboard">
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button
                  onClick={handleGenerateScope}
                  disabled={loading || description.length < 50}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    'Generate Scope →'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
