import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-xl font-bold">AppCord</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Build Web Apps with AI
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Transform your ideas into fully functional web applications in minutes, not weeks.
            Just describe what you want, and AI builds it for you.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8">
                Start Building Free
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-600">
              Generate full-stack applications in minutes with AI-powered code generation
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Production Ready</h3>
            <p className="text-gray-600">
              Clean, maintainable code with best practices, authentication, and database setup
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Full Control</h3>
            <p className="text-gray-600">
              Export your code, customize everything, and deploy anywhere you want
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold mb-8">Built with Modern Technologies</h2>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="text-gray-600">Next.js 16</div>
            <div className="text-gray-600">TypeScript</div>
            <div className="text-gray-600">Tailwind CSS</div>
            <div className="text-gray-600">Supabase</div>
            <div className="text-gray-600">OpenAI</div>
            <div className="text-gray-600">Claude AI</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-24 py-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 AppCord. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
