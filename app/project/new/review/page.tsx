"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"

interface TodoItem {
  title: string
  checked: boolean
  note?: string
}

interface TodoCategory {
  name: string
  items: TodoItem[]
}

interface ProjectScope {
  expandedDescription: string
  appType: string
  complexity: string
  estimatedTokens: number
  techStack: string[]
  todoCategories: TodoCategory[]
}

export default function ReviewScopePage() {
  const router = useRouter()
  const [scope, setScope] = useState<ProjectScope | null>(null)
  const [originalPrompt, setOriginalPrompt] = useState("")
  const [projectName, setProjectName] = useState("")
  const [additionalRequirements, setAdditionalRequirements] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load scope from session storage
    const storedScope = sessionStorage.getItem('projectScope')
    const storedPrompt = sessionStorage.getItem('originalPrompt')

    if (!storedScope || !storedPrompt) {
      router.push('/project/new')
      return
    }

    setScope(JSON.parse(storedScope))
    setOriginalPrompt(storedPrompt)

    // Auto-generate project name from prompt
    const words = storedPrompt.split(' ').slice(0, 5).join(' ')
    setProjectName(words.length > 50 ? words.substring(0, 50) + '...' : words)

    // Expand all categories by default
    const parsed = JSON.parse(storedScope) as ProjectScope
    setExpandedCategories(new Set(parsed.todoCategories.map(cat => cat.name)))
  }, [router])

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleTodoItem = (categoryIndex: number, itemIndex: number) => {
    if (!scope) return

    const newScope = { ...scope }
    newScope.todoCategories[categoryIndex].items[itemIndex].checked =
      !newScope.todoCategories[categoryIndex].items[itemIndex].checked
    setScope(newScope)
  }

  const selectAll = () => {
    if (!scope) return

    const newScope = { ...scope }
    newScope.todoCategories.forEach(category => {
      category.items.forEach(item => {
        item.checked = true
      })
    })
    setScope(newScope)
  }

  const handleBuildApp = async () => {
    if (!scope) return

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      // Create project in database
      const { data: project, error } = await supabase
        .from('projects')
        .insert([
          {
            user_id: session.user.id,
            name: projectName,
            description: scope.expandedDescription,
            original_prompt: originalPrompt,
            expanded_description: scope.expandedDescription,
            todo_list: scope.todoCategories,
            status: 'draft',
            app_type: scope.appType,
            complexity: scope.complexity,
            tech_stack: scope.techStack,
            tokens_used: 0,
          },
        ])
        .select()
        .single()

      if (error) throw error

      // Clear session storage
      sessionStorage.removeItem('projectScope')
      sessionStorage.removeItem('originalPrompt')

      // Navigate to project page
      router.push(`/project/${project.id}`)
    } catch (error: any) {
      console.error('Error creating project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!scope) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  const totalItems = scope.todoCategories.reduce((acc, cat) => acc + cat.items.length, 0)
  const checkedItems = scope.todoCategories.reduce(
    (acc, cat) => acc + cat.items.filter(item => item.checked).length,
    0
  )

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
          <Link href="/project/new">
            <Button variant="ghost">Back</Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-600">Step 2 of 5</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-blue-600 rounded-full" style={{ width: '40%' }}></div>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Project Name */}
            <Card>
              <CardHeader>
                <CardTitle>Project Name</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Awesome App"
                />
              </CardContent>
            </Card>

            {/* Expanded Description */}
            <Card>
              <CardHeader>
                <CardTitle>Expanded Description</CardTitle>
                <CardDescription>
                  AI-generated comprehensive overview of your project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {scope.expandedDescription}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>Type: {scope.appType}</Badge>
                  <Badge>Complexity: {scope.complexity}</Badge>
                  <Badge>Estimated: {scope.estimatedTokens.toLocaleString()} credits</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            <Card>
              <CardHeader>
                <CardTitle>Technology Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {scope.techStack.map((tech, index) => (
                    <Badge key={index} variant="secondary">{tech}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Todo List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Features & Todo List</CardTitle>
                    <CardDescription>
                      {checkedItems} of {totalItems} items selected
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {scope.todoCategories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="border rounded-lg">
                    <button
                      onClick={() => toggleCategory(category.name)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-semibold">{category.name}</span>
                        <Badge variant="secondary">{category.items.length} items</Badge>
                      </div>
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          expandedCategories.has(category.name) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {expandedCategories.has(category.name) && (
                      <div className="px-4 pb-4 space-y-2">
                        {category.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-start space-x-3 py-2">
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleTodoItem(categoryIndex, itemIndex)}
                            />
                            <span className="text-sm flex-1">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Additional Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Requirements (Optional)</CardTitle>
                <CardDescription>
                  Add any specific features or requirements you'd like to include
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={additionalRequirements}
                  onChange={(e) => setAdditionalRequirements(e.target.value)}
                  placeholder="e.g., Add dark mode support, Include email notifications, etc."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Link href="/project/new">
                <Button variant="outline">← Modify Description</Button>
              </Link>
              <Button onClick={handleBuildApp} disabled={loading || checkedItems === 0}>
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  `Build App (${scope.estimatedTokens.toLocaleString()} credits) →`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
