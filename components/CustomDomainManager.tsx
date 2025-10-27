"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface CustomDomain {
  id: string
  domain: string
  verified: boolean
  status: string
  dns_records: any
  created_at: string
  verified_at?: string
}

interface CustomDomainManagerProps {
  projectId: string
  projectStatus: string
}

export function CustomDomainManager({ projectId, projectStatus }: CustomDomainManagerProps) {
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [newDomain, setNewDomain] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    fetchDomains()
  }, [projectId])

  const fetchDomains = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/domains?projectId=${projectId}`)
      const data = await response.json()

      if (data.success) {
        setDomains(data.domains)
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return

    setIsAdding(true)
    try {
      const response = await fetch('/api/projects/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          domain: newDomain.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`Domain added! Please configure the following DNS records:\n\n${JSON.stringify(data.dnsRecords, null, 2)}`)
        setNewDomain("")
        await fetchDomains()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Error adding domain: ${error.message}`)
    } finally {
      setIsAdding(false)
    }
  }

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const response = await fetch('/api/projects/domains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      })

      const data = await response.json()

      if (data.verified) {
        alert('Domain verified successfully!')
        await fetchDomains()
      } else {
        alert(data.error || 'Domain not yet verified. Please check your DNS settings.')
      }
    } catch (error: any) {
      alert(`Error verifying domain: ${error.message}`)
    }
  }

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return

    try {
      const response = await fetch(`/api/projects/domains?domainId=${domainId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        alert('Domain removed successfully')
        await fetchDomains()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Error removing domain: ${error.message}`)
    }
  }

  const getStatusBadge = (status: string, verified: boolean) => {
    if (verified) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    }

    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'verifying':
        return <Badge className="bg-blue-100 text-blue-800">Verifying</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  if (projectStatus !== 'deployed') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom Domain</CardTitle>
          <CardDescription>Add your own domain</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Deploy your project first to add a custom domain
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Custom Domain</CardTitle>
        <CardDescription>Add your own domain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Domain Form */}
        <form onSubmit={handleAddDomain} className="flex space-x-2">
          <Input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="yourdomain.com"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add'}
          </Button>
        </form>

        {/* Domain List */}
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading domains...</p>
        ) : domains.length === 0 ? (
          <p className="text-sm text-gray-500">No custom domains added yet</p>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{domain.domain}</span>
                    {getStatusBadge(domain.status, domain.verified)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDomain(domain.id)}
                  >
                    Remove
                  </Button>
                </div>

                {!domain.verified && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyDomain(domain.id)}
                    >
                      Verify Domain
                    </Button>
                    {domain.dns_records && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <p className="font-semibold mb-1">DNS Configuration:</p>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(domain.dns_records, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {domain.verified && domain.verified_at && (
                  <p className="text-xs text-gray-500">
                    Verified on {new Date(domain.verified_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
